import { Browsers, DisconnectReason, fetchLatestBaileysVersion, jidNormalizedUser, makeCacheableSignalKeyStore, makeWASocket, useMultiFileAuthState } from 'baileys';

import {Boom} from '@hapi/boom';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import pino from 'pino';

const PORT = Number(process.env.PORT || 4002);
const HOST = process.env.HOST || '127.0.0.1';
const AUTH_DIR = process.env.AUTH_DIR || path.resolve('../storage/whatsapp/auth');
const WEBHOOK_URL = process.env.WEBHOOK_URL || null;
/** Shared with Rails: sent on webhooks, required on API calls. Empty disables the check. */
const BRIDGE_SECRET = process.env.BRIDGE_SECRET || '';
/** Digits only, country code first. Setting it makes the bridge pair itself on first boot. */
const PHONE_NUMBER = (process.env.PHONE_NUMBER || '').replace(/\D/g, '');
/** History sync can be thousands of rows; they travel to Rails in batches of this size. */
const BATCH_SIZE = 200;

const log = pino({level: process.env.LOG_LEVEL || 'info'});
/** Baileys is chatty; it gets its own, quieter logger. */
const socketLog = pino({level: process.env.BAILEYS_LOG_LEVEL || 'warn'});

const PROTOCOL_REVOKE = 0;
const PROTOCOL_MESSAGE_EDIT = 14;

const state = {
  /** connecting | pairing | open | needs_relink | closed */
  status: 'connecting',
  /** Set while a pairing code is valid for entry on the phone. */
  pairingCode: null,
  /** The linked account, once known. */
  me: null,
  lastError: null,
  connectedAt: null,
};

/** Caches, keyed by normalised JID. Rebuilt from history on every connect. */
const contacts = new Map();
const chats = new Map();
/** lid → phone JID. WhatsApp is moving to privacy ids; this keeps one identity per person. */
const lidToPhone = new Map();

let sock = null;
/** Set once a pairing code has been requested for this socket, so a reconnect does not ask twice. */
let pairingRequested = false;
let reconnectDelay = 1000;

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

async function connect() {
  fs.mkdirSync(AUTH_DIR, {recursive: true});
  const {state: auth, saveCreds} = await useMultiFileAuthState(AUTH_DIR);
  const {version} = await fetchLatestBaileysVersion();

  state.status = auth.creds.registered ? 'connecting' : 'pairing';
  pairingRequested = false;

  sock = makeWASocket({
    version,
    logger: socketLog,
    auth: {
      creds: auth.creds,
      keys: makeCacheableSignalKeyStore(auth.keys, socketLog),
    },
    // Pairing by code only succeeds with a browser identity WhatsApp recognises;
    // a custom device name makes the phone reject the code.
    browser: Browsers.ubuntu('Chrome'),
    printQRInTerminal: false,
    // Stay invisible: do not flip the phone's own notifications off by looking "online".
    markOnlineOnConnect: false,
    // Full history is huge and arrives as one burst; the recent slice is enough to start.
    syncFullHistory: false,
    // Needed for retries of messages we sent; we keep nothing, so there is nothing to give back.
    getMessage: async () => undefined,
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', onConnectionUpdate);

  // --- history: the initial dump after linking, and later backfills --------
  sock.ev.on('messaging-history.set', async ({chats: historyChats, contacts: historyContacts, messages}) => {
    const events = [];
    for (const contact of historyContacts) events.push({event: 'contact', payload: rememberContact(contact)});
    for (const chat of historyChats) events.push({event: 'chat', payload: rememberChat(chat)});
    for (const message of messages) {
      const event = await messageEvent(message, false);
      if (event) events.push(event);
    }
    log.info({contacts: historyContacts.length, chats: historyChats.length, messages: messages.length}, 'History received');
    await emitBatch(events);
  });

  // --- contacts & chats ------------------------------------------------------
  sock.ev.on('contacts.upsert', list => emitBatch(list.map(c => ({event: 'contact', payload: rememberContact(c)}))));
  sock.ev.on('contacts.update', list => emitBatch(list.map(c => ({event: 'contact', payload: rememberContact(c)}))));
  sock.ev.on('chats.upsert', list => emitBatch(list.map(c => ({event: 'chat', payload: rememberChat(c)}))));
  sock.ev.on('chats.update', list => emitBatch(list.map(c => ({event: 'chat', payload: rememberChat(c)}))));
  sock.ev.on('chats.delete', ids => emitBatch(ids.map(id => {
    chats.delete(normalize(id));
    return {event: 'chat_deleted', payload: {id: normalize(id)}};
  })));

  sock.ev.on('lid-mapping.update', ({lid, pn}) => {
    const mapping = rememberMapping(lid, pn);
    return emit('lid_mapping', mapping);
  });

  // --- groups ----------------------------------------------------------------
  sock.ev.on('groups.upsert', list => emitBatch(list.map(g => ({event: 'group', payload: groupPayload(g)}))));
  sock.ev.on('groups.update', list => emitBatch(list.map(g => ({event: 'group', payload: groupPayload(g)}))));
  sock.ev.on('group-participants.update', ({id, author, participants, action}) => emit('group_participants', {
    id: normalize(id),
    author: normalize(author),
    action,
    participants: participants.map(p => normalize(typeof p === 'string' ? p : p.id)),
  }));

  // --- messages --------------------------------------------------------------
  sock.ev.on('messages.upsert', async ({messages, type}) => {
    const events = [];
    for (const message of messages) {
      // `append` is history being replayed; `notify` is live traffic.
      const event = await messageEvent(message, type === 'notify');
      if (event) events.push(event);
    }
    await emitBatch(events);
  });

  sock.ev.on('messages.update', updates => emitBatch(updates
    .filter(({update}) => update.status !== undefined)
    .map(({key, update}) => ({event: 'message_status', payload: {...keyPayload(key), status: update.status}}))));

  sock.ev.on('messages.delete', item => {
    if ('all' in item) return emit('chat_cleared', {chat: normalize(item.jid)});
    return emitBatch(item.keys.map(key => ({event: 'message_deleted', payload: keyPayload(key)})));
  });

  // --- presence --------------------------------------------------------------
  sock.ev.on('presence.update', ({id, presences}) => emitBatch(Object.entries(presences).map(([participant, data]) => ({
    event: 'presence',
    payload: {
      chat: normalize(id),
      participant: normalize(participant),
      presence: data.lastKnownPresence,
      last_seen: data.lastSeen ? new Date(data.lastSeen * 1000).toISOString() : null,
    },
  }))));
}

async function onConnectionUpdate({connection, lastDisconnect, qr}) {
  // A QR means the socket is ready to pair. We swap it for a code instead,
  // which can be typed on the phone itself.
  if (qr && PHONE_NUMBER && !pairingRequested) {
    pairingRequested = true;
    await requestPairingCode(PHONE_NUMBER).catch(() => {});
  } else if (qr && !PHONE_NUMBER) {
    state.status = 'pairing';
    log.warn('Not linked. Set PHONE_NUMBER or POST /pair {"phone": "..."} to get a pairing code.');
  }

  if (connection === 'open') {
    reconnectDelay = 1000;
    state.status = 'open';
    state.pairingCode = null;
    state.lastError = null;
    state.connectedAt = new Date().toISOString();
    state.me = sock.user ? {id: jidNormalizedUser(sock.user.id), lid: sock.user.lid ? jidNormalizedUser(sock.user.lid) : null, name: sock.user.name || null} : null;
    if (state.me?.lid) rememberMapping(state.me.lid, state.me.id);
    log.info({me: state.me}, 'WhatsApp connected');
    await emit('connection', {status: 'open', me: state.me});
  }

  if (connection === 'close') {
    const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
    const reason = DisconnectReason[code] || code;
    state.lastError = String(reason);

    if (code === DisconnectReason.loggedOut) {
      // The phone unlinked us. Credentials are dead; wipe and wait for a new pairing.
      log.warn('Logged out by the phone. Clearing session, pairing is needed again.');
      fs.rmSync(AUTH_DIR, {recursive: true, force: true});
      state.status = 'needs_relink';
      state.me = null;
      await emit('connection', {status: 'needs_relink', reason});
      scheduleReconnect();
      return;
    }

    state.status = 'closed';
    log.warn({reason}, 'Connection closed, reconnecting');
    await emit('connection', {status: 'closed', reason});
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  setTimeout(() => connect().catch(onFatal), reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, 60_000);
}

async function requestPairingCode(phone) {
  try {
    const code = await sock.requestPairingCode(phone);
    state.status = 'pairing';
    state.pairingCode = code;
    log.info({code}, 'Pairing code ready. WhatsApp > Linked devices > Link with phone number.');
    await emit('pairing_code', {code});
    return code;
  } catch (error) {
    state.lastError = error.message;
    log.error({err: error}, 'Could not request pairing code');
    throw error;
  }
}

function onFatal(error) {
  log.fatal({err: error}, 'Bridge crashed');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Identity: one JID per person
// ---------------------------------------------------------------------------

/**
 * Strips the device suffix and, for a privacy id (`@lid`), swaps in the phone
 * JID when we know it. Everything Rails receives goes through here, so one
 * person is one conversation however WhatsApp chose to address them.
 */
function normalize(jid) {
  if (!jid) return null;
  const clean = jidNormalizedUser(jid);
  return lidToPhone.get(clean) || clean;
}

function rememberMapping(lid, pn) {
  const mapping = {lid: jidNormalizedUser(lid), phone: jidNormalizedUser(pn)};
  lidToPhone.set(mapping.lid, mapping.phone);
  return mapping;
}

/** Asks the signal store for the phone behind a LID the first time we meet it. */
async function resolveLid(jid) {
  if (!jid?.endsWith('@lid')) return;
  const clean = jidNormalizedUser(jid);
  if (lidToPhone.has(clean)) return;
  try {
    const found = await sock.signalRepository.lidMapping.getPNsForLIDs([clean]);
    for (const {lid, pn} of found || []) {
      if (pn) await emit('lid_mapping', rememberMapping(lid, pn));
    }
  } catch (error) {
    log.debug({jid, err: error.message}, 'No phone known for LID yet');
  }
}

// ---------------------------------------------------------------------------
// Contacts, chats, groups
// ---------------------------------------------------------------------------

function rememberContact(contact) {
  if (contact.lid && contact.phoneNumber) rememberMapping(contact.lid, contact.phoneNumber);
  const id = normalize(contact.phoneNumber || contact.id);
  const previous = contacts.get(id) || {};
  const merged = {
    ...previous,
    id,
    lid: contact.lid ? jidNormalizedUser(contact.lid) : previous.lid || (contact.id?.endsWith('@lid') ? jidNormalizedUser(contact.id) : null),
    // `name` is what the user saved in their address book, `notify` is the
    // name the contact chose for themselves. The first wins when both exist.
    name: contact.name ?? previous.name ?? null,
    push_name: contact.notify ?? previous.push_name ?? null,
    verified_name: contact.verifiedName ?? previous.verified_name ?? null,
    // 'changed' means a new picture exists but the URL has to be fetched (GET /avatar).
    avatar_url: contact.imgUrl === 'changed' ? previous.avatar_url ?? null : contact.imgUrl ?? previous.avatar_url ?? null,
    avatar_changed: contact.imgUrl === 'changed' || undefined,
    status: contact.status ?? previous.status ?? null,
  };
  contacts.set(id, merged);
  return merged;
}

function rememberChat(chat) {
  if (chat.lidJid && chat.pnJid) rememberMapping(chat.lidJid, chat.pnJid);
  const id = normalize(chat.pnJid || chat.id);
  const previous = chats.get(id) || {};
  const timestamp = chat.conversationTimestamp ?? chat.lastMessageRecvTimestamp;
  const muteEnd = chat.muteEndTime != null ? Number(chat.muteEndTime) : undefined;
  const merged = {
    ...previous,
    id,
    is_group: id.endsWith('@g.us'),
    name: chat.name ?? chat.displayName ?? previous.name ?? null,
    unread_count: chat.unreadCount ?? previous.unread_count ?? 0,
    archived: chat.archived ?? previous.archived ?? false,
    pinned: chat.pinned != null ? Boolean(chat.pinned) : previous.pinned ?? false,
    read_only: chat.readOnly ?? previous.read_only ?? false,
    // 0 means unmuted; anything else is a unix time, or -1 for "forever".
    muted_until: muteEnd === undefined ? previous.muted_until ?? null
      : muteEnd === 0 ? null
      : muteEnd < 0 ? 'forever'
      : new Date(muteEnd * 1000).toISOString(),
    last_message_at: timestamp ? new Date(Number(timestamp) * 1000).toISOString() : previous.last_message_at ?? null,
  };
  chats.set(id, merged);
  return merged;
}

function groupPayload(group) {
  return {
    id: normalize(group.id),
    subject: group.subject ?? null,
    description: group.desc ?? null,
    owner: normalize(group.owner),
    size: group.size ?? group.participants?.length ?? null,
    created_at: group.creation ? new Date(group.creation * 1000).toISOString() : null,
    participants: (group.participants || []).map(p => ({id: normalize(p.id), admin: p.admin || null})),
  };
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/**
 * Turns one WhatsApp message into the event Rails should receive: a plain
 * `message`, or a `reaction`, `message_edited` or `message_deleted` for the
 * protocol traffic that masquerades as a message. Returns null for the
 * housekeeping (key shares, sync notices) nobody needs to see.
 */
async function messageEvent(message, live) {
  const content = message.message;
  if (!content) return null;

  const key = message.key;
  await Promise.all([resolveLid(key.remoteJid), resolveLid(key.participant)]);

  // Ephemeral and view-once wrappers hide the real message one level down.
  const inner = content.ephemeralMessage?.message
    || content.viewOnceMessage?.message
    || content.viewOnceMessageV2?.message
    || content.documentWithCaptionMessage?.message
    || content;

  const kind = Object.keys(inner).find(k => k !== 'messageContextInfo' && k !== 'senderKeyDistributionMessage') || 'unknown';
  const base = keyPayload(key);
  const sentAt = new Date(Number(message.messageTimestamp) * 1000).toISOString();

  if (kind === 'reactionMessage') {
    const reaction = inner.reactionMessage;
    return {event: 'reaction', payload: {
      ...keyPayload(reaction.key),
      sender: senderOf(message),
      // Empty text is WhatsApp's way of saying the reaction was taken back.
      emoji: reaction.text || null,
      at: reaction.senderTimestampMs ? new Date(Number(reaction.senderTimestampMs)).toISOString() : sentAt,
    }};
  }

  if (kind === 'protocolMessage') {
    const protocol = inner.protocolMessage;
    if (protocol.type === PROTOCOL_REVOKE && protocol.key) {
      return {event: 'message_deleted', payload: {...keyPayload(protocol.key), by: senderOf(message), at: sentAt}};
    }
    if (protocol.type === PROTOCOL_MESSAGE_EDIT && protocol.key) {
      const edited = protocol.editedMessage || {};
      return {event: 'message_edited', payload: {...keyPayload(protocol.key), body: textOf(edited), at: sentAt}};
    }
    return null;
  }

  if (kind === 'senderKeyDistributionMessage' || kind === 'unknown') return null;

  const context = inner[kind]?.contextInfo || inner.messageContextInfo || {};
  const chat = base.chat;

  return {event: 'message', payload: {
    ...base,
    is_group: chat.endsWith('@g.us'),
    sender: senderOf(message),
    sender_name: message.pushName || null,
    sent_at: sentAt,
    live,
    kind,
    body: textOf(inner),
    media: mediaOf(kind, inner),
    quoted_id: context.stanzaId || null,
    mentions: (context.mentionedJid || []).map(normalize),
    // Delivery status for our own messages: 0 error, 1 pending, 2 server, 3 delivered, 4 read, 5 played.
    status: message.status ?? null,
  }};
}

function keyPayload(key) {
  return {
    id: key.id,
    chat: normalize(key.remoteJid),
    from_me: Boolean(key.fromMe),
    participant: key.participant ? normalize(key.participant) : null,
  };
}

function senderOf(message) {
  if (message.key.fromMe) return state.me?.id || null;
  return normalize(message.key.participant || message.key.remoteJid);
}

function textOf(inner) {
  return inner.conversation
    || inner.extendedTextMessage?.text
    || inner.imageMessage?.caption
    || inner.videoMessage?.caption
    || inner.documentMessage?.caption
    || inner.editedMessage?.message?.protocolMessage?.editedMessage?.conversation
    || null;
}

function mediaOf(kind, inner) {
  const media = inner[kind];
  if (!media || typeof media !== 'object' || !media.mimetype) return null;
  return {
    mimetype: media.mimetype,
    size: media.fileLength ? Number(media.fileLength) : null,
    filename: media.fileName || null,
    seconds: media.seconds || null,
    width: media.width || null,
    height: media.height || null,
    // A tiny JPEG preview WhatsApp ships inline; enough for a thumbnail without a download.
    thumbnail: media.jpegThumbnail ? Buffer.from(media.jpegThumbnail).toString('base64') : null,
  };
}

// ---------------------------------------------------------------------------
// Outbound: webhook to Rails, or stdout while there is none
// ---------------------------------------------------------------------------

async function emit(event, payload) {
  return deliver({event, payload});
}

/** Many events in one request. A history dump is thousands; live traffic is usually one. */
async function emitBatch(events) {
  if (events.length === 0) return;
  if (events.length === 1) return deliver(events[0]);
  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    await deliver({event: 'batch', payload: {events: events.slice(i, i + BATCH_SIZE)}});
  }
}

async function deliver(body) {
  if (!WEBHOOK_URL) {
    if (body.event === 'batch') log.info({count: body.payload.events.length, kinds: countKinds(body.payload.events)}, 'batch');
    else log.info({...body.payload, event: body.event}, 'event');
    return;
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-Bridge-Secret': BRIDGE_SECRET},
      body: JSON.stringify(body),
    });
    if (!response.ok) log.warn({event: body.event, status: response.status}, 'Webhook rejected event');
  } catch (error) {
    log.warn({event: body.event, err: error.message}, 'Webhook unreachable');
  }
}

function countKinds(events) {
  return events.reduce((acc, e) => ((acc[e.event] = (acc[e.event] || 0) + 1), acc), {});
}

// ---------------------------------------------------------------------------
// Inbound: HTTP API for Rails
// ---------------------------------------------------------------------------

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${HOST}`);
  const reply = (status, body) => {
    response.writeHead(status, {'Content-Type': 'application/json'});
    response.end(JSON.stringify(body));
  };
  const requireOpen = () => {
    if (state.status === 'open') return true;
    reply(503, {error: 'not connected', status: state.status});
    return false;
  };

  if (BRIDGE_SECRET && request.headers['x-bridge-secret'] !== BRIDGE_SECRET) {
    return reply(401, {error: 'unauthorized'});
  }

  try {
    const route = `${request.method} ${url.pathname}`;

    switch (route) {
      case 'GET /state':
        return reply(200, {...state, cached: {contacts: contacts.size, chats: chats.size, lid_mappings: lidToPhone.size}});

      case 'GET /chats':
        return reply(200, [...chats.values()]);

      case 'GET /contacts':
        return reply(200, [...contacts.values()]);

      case 'GET /groups': {
        if (!requireOpen()) return;
        const groups = await sock.groupFetchAllParticipating();
        return reply(200, Object.values(groups).map(groupPayload));
      }

      case 'GET /avatar': {
        if (!requireOpen()) return;
        const jid = url.searchParams.get('jid');
        if (!jid) return reply(400, {error: 'jid is required'});
        const avatar = await sock.profilePictureUrl(toJid(jid), 'image').catch(() => null);
        return reply(200, {jid: normalize(toJid(jid)), url: avatar});
      }

      case 'POST /pair': {
        const {phone} = await readJson(request);
        const digits = String(phone || PHONE_NUMBER).replace(/\D/g, '');
        if (!digits) return reply(400, {error: 'phone is required'});
        if (state.status === 'open') return reply(409, {error: 'already linked', me: state.me});
        return reply(200, {code: await requestPairingCode(digits)});
      }

      case 'POST /send': {
        if (!requireOpen()) return;
        const {to, text, quote_id, mentions} = await readJson(request);
        if (!to || !text) return reply(400, {error: 'to and text are required'});
        const options = {};
        // Quoting needs the original message, which we do not keep; a bare key is enough for WhatsApp to link them.
        if (quote_id) options.quoted = {key: {remoteJid: toJid(to), id: quote_id, fromMe: false}, message: {conversation: ''}};
        const sent = await sock.sendMessage(toJid(to), {text, mentions: mentions?.map(toJid)}, options);
        return reply(200, {id: sent.key.id, chat: normalize(sent.key.remoteJid), sent_at: new Date(Number(sent.messageTimestamp) * 1000).toISOString()});
      }

      case 'POST /react': {
        if (!requireOpen()) return;
        const {chat, message_id, from_me, participant, emoji} = await readJson(request);
        if (!chat || !message_id) return reply(400, {error: 'chat and message_id are required'});
        const key = {remoteJid: toJid(chat), id: message_id, fromMe: Boolean(from_me), participant: participant ? toJid(participant) : undefined};
        await sock.sendMessage(toJid(chat), {react: {text: emoji || '', key}});
        return reply(200, {ok: true});
      }

      case 'POST /read': {
        if (!requireOpen()) return;
        const {chat, messages} = await readJson(request);
        if (!chat || !Array.isArray(messages) || messages.length === 0) return reply(400, {error: 'chat and messages[] are required'});
        await sock.readMessages(messages.map(m => ({remoteJid: toJid(chat), id: m.id, fromMe: false, participant: m.participant ? toJid(m.participant) : undefined})));
        return reply(200, {ok: true});
      }

      case 'POST /typing': {
        if (!requireOpen()) return;
        const {chat, typing} = await readJson(request);
        if (!chat) return reply(400, {error: 'chat is required'});
        await sock.sendPresenceUpdate(typing === false ? 'paused' : 'composing', toJid(chat));
        return reply(200, {ok: true});
      }

      case 'POST /logout':
        await sock?.logout().catch(() => {});
        fs.rmSync(AUTH_DIR, {recursive: true, force: true});
        state.status = 'needs_relink';
        state.me = null;
        return reply(200, {status: state.status});

      default:
        return reply(404, {error: 'not found'});
    }
  } catch (error) {
    log.error({err: error}, 'API request failed');
    reply(500, {error: error.message});
  }
});

/** Accepts a JID as-is, or a bare phone number and turns it into one. */
function toJid(to) {
  return to.includes('@') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`;
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => (body += chunk));
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

// ---------------------------------------------------------------------------

server.listen(PORT, HOST, () => {
  log.info({url: `http://${HOST}:${PORT}`, authDir: AUTH_DIR, webhook: WEBHOOK_URL || 'stdout'}, 'Bridge API listening');
});

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

connect().catch(onFatal);
