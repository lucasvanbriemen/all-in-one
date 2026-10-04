import { Browsers, DisconnectReason, downloadContentFromMessage, fetchLatestBaileysVersion, jidNormalizedUser, makeCacheableSignalKeyStore, makeWASocket, useMultiFileAuthState } from 'baileys';

import {Boom} from '@hapi/boom';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import pino from 'pino';

const PORT = Number(process.env.PORT || 4002);
const HOST = process.env.HOST || '127.0.0.1';
const AUTH_DIR = process.env.AUTH_DIR || path.resolve('../storage/whatsapp/auth');
const WEBHOOK_URL = process.env.WEBHOOK_URL || null;
const BRIDGE_SECRET = process.env.BRIDGE_SECRET;
const PHONE_NUMBER = (process.env.PHONE_NUMBER || '').replace(/\D/g, '');

const PROTOCOL_REVOKE = 0;
const PROTOCOL_MESSAGE_EDIT = 14;

// Message kind -> Baileys media type used to decrypt downloads.
const MEDIA_TYPES = {
  imageMessage: 'image',
  videoMessage: 'video',
  ptvMessage: 'video',
  audioMessage: 'audio',
  documentMessage: 'document',
  stickerMessage: 'sticker',
};

export const bridge = {
  BATCH_SIZE: 200,
  log: pino({level: 'warn'}),

  state: {
    status: 'connecting',
    pairingCode: null,
    me: null,
    lastError: null,
    connectedAt: null,
  },

  contacts: new Map(),
  chats: new Map(),
  lidToPhone: new Map(),

  sock: null,
  pairingRequested: false,
  reconnectDelay: 1000,

  async connect() {
    fs.mkdirSync(AUTH_DIR, {recursive: true});
    const {state: auth, saveCreds} = await useMultiFileAuthState(AUTH_DIR);
    const {version} = await fetchLatestBaileysVersion();

    bridge.state.status = auth.creds.registered ? 'connecting' : 'pairing';
    bridge.pairingRequested = false;

    const sock = bridge.sock = makeWASocket({
      version,
      logger: bridge.log,
      auth: {
        creds: auth.creds,
        keys: makeCacheableSignalKeyStore(auth.keys, bridge.log),
      },
      browser: Browsers.ubuntu('Chrome'),
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      getMessage: async () => undefined,
    });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', update => bridge.onConnectionUpdate(update));

    sock.ev.on('messaging-history.set', async ({chats, contacts, messages}) => {
      const events = [];
      for (const contact of contacts) events.push({event: 'contact', payload: bridge.rememberContact(contact)});
      for (const chat of chats) events.push({event: 'chat', payload: bridge.rememberChat(chat)});
      for (const message of messages) {
        const event = await bridge.messageEvent(message, false);
        if (event) events.push(event);
      }
      await bridge.emitBatch(events);
    });

    sock.ev.on('contacts.upsert', list => bridge.emitBatch(list.map(c => ({event: 'contact', payload: bridge.rememberContact(c)}))));
    sock.ev.on('contacts.update', list => bridge.emitBatch(list.map(c => ({event: 'contact', payload: bridge.rememberContact(c)}))));
    sock.ev.on('chats.upsert', list => bridge.emitBatch(list.map(c => ({event: 'chat', payload: bridge.rememberChat(c)}))));
    sock.ev.on('chats.update', list => bridge.emitBatch(list.map(c => ({event: 'chat', payload: bridge.rememberChat(c)}))));
    sock.ev.on('chats.delete', ids => bridge.emitBatch(ids.map(id => {
      bridge.chats.delete(bridge.normalize(id));
      return {event: 'chat_deleted', payload: {id: bridge.normalize(id)}};
    })));

    sock.ev.on('lid-mapping.update', ({lid, pn}) => bridge.emit('lid_mapping', bridge.rememberMapping(lid, pn)));

    sock.ev.on('groups.upsert', list => bridge.emitBatch(list.map(g => ({event: 'group', payload: bridge.groupPayload(g)}))));
    sock.ev.on('groups.update', list => bridge.emitBatch(list.map(g => ({event: 'group', payload: bridge.groupPayload(g)}))));
    sock.ev.on('group-participants.update', ({id, author, participants, action}) => bridge.emit('group_participants', {
      id: bridge.normalize(id),
      author: bridge.normalize(author),
      action,
      participants: participants.map(p => bridge.normalize(typeof p === 'string' ? p : p.id)),
    }));

    sock.ev.on('messages.upsert', async ({messages, type}) => {
      const events = [];
      for (const message of messages) {
        const event = await bridge.messageEvent(message, type === 'notify');
        if (event) events.push(event);
      }
      await bridge.emitBatch(events);
    });

    sock.ev.on('messages.update', updates => bridge.emitBatch(updates
      .filter(({update}) => update.status !== undefined)
      .map(({key, update}) => ({event: 'message_status', payload: {...bridge.keyPayload(key), status: update.status}}))));

    sock.ev.on('messages.delete', item => {
      if ('all' in item) return bridge.emit('chat_cleared', {chat: bridge.normalize(item.jid)});
      return bridge.emitBatch(item.keys.map(key => ({event: 'message_deleted', payload: bridge.keyPayload(key)})));
    });

    sock.ev.on('presence.update', ({id, presences}) => bridge.emitBatch(Object.entries(presences).map(([participant, data]) => ({
      event: 'presence',
      payload: {
        chat: bridge.normalize(id),
        participant: bridge.normalize(participant),
        presence: data.lastKnownPresence,
        last_seen: data.lastSeen ? new Date(data.lastSeen * 1000).toISOString() : null,
      },
    }))));
  },

  async onConnectionUpdate({connection, lastDisconnect, qr}) {
    const {state, sock} = bridge;

    if (qr && PHONE_NUMBER && !bridge.pairingRequested) {
      bridge.pairingRequested = true;
      await bridge.requestPairingCode(PHONE_NUMBER).catch(() => {});
    } else if (qr && !PHONE_NUMBER) {
      state.status = 'pairing';
    }

    if (connection === 'open') {
      bridge.reconnectDelay = 1000;
      state.status = 'open';
      state.pairingCode = null;
      state.lastError = null;
      state.connectedAt = new Date().toISOString();
      state.me = sock.user ? {id: jidNormalizedUser(sock.user.id), lid: sock.user.lid ? jidNormalizedUser(sock.user.lid) : null, name: sock.user.name || null} : null;
      if (state.me?.lid) bridge.rememberMapping(state.me.lid, state.me.id);
      await bridge.emit('connection', {status: 'open', me: state.me});
    }

    if (connection === 'close') {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const reason = DisconnectReason[code] || code;
      state.lastError = String(reason);

      if (code === DisconnectReason.loggedOut) {
        fs.rmSync(AUTH_DIR, {recursive: true, force: true});
        state.status = 'needs_relink';
        state.me = null;
        await bridge.emit('connection', {status: 'needs_relink', reason});
        bridge.scheduleReconnect();
        return;
      }

      state.status = 'closed';
      await bridge.emit('connection', {status: 'closed', reason});
      bridge.scheduleReconnect();
    }
  },

  scheduleReconnect() {
    setTimeout(() => bridge.connect(), bridge.reconnectDelay);
    bridge.reconnectDelay = Math.min(bridge.reconnectDelay * 2, 60_000);
  },

  async requestPairingCode(phone) {
    try {
      const code = await bridge.sock.requestPairingCode(phone);
      bridge.state.status = 'pairing';
      bridge.state.pairingCode = code;
      await bridge.emit('pairing_code', {code});
      return code;
    } catch (error) {
      bridge.state.lastError = error.message;
      throw error;
    }
  },

  normalize(jid) {
    if (!jid) return null;
    const clean = jidNormalizedUser(jid);
    return bridge.lidToPhone.get(clean) || clean;
  },

  toJid(to) {
    return to.includes('@') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`;
  },

  rememberMapping(lid, pn) {
    const mapping = {lid: jidNormalizedUser(lid), phone: jidNormalizedUser(pn)};
    bridge.lidToPhone.set(mapping.lid, mapping.phone);
    return mapping;
  },

  async resolveLid(jid) {
    if (!jid?.endsWith('@lid')) return;
    const clean = jidNormalizedUser(jid);
    if (bridge.lidToPhone.has(clean)) return;
    const found = await bridge.sock.signalRepository.lidMapping.getPNsForLIDs([clean]);
    for (const {lid, pn} of found || []) {
      if (pn) await bridge.emit('lid_mapping', bridge.rememberMapping(lid, pn));
    }
  },

  rememberContact(contact) {
    if (contact.lid && contact.phoneNumber) bridge.rememberMapping(contact.lid, contact.phoneNumber);
    const id = bridge.normalize(contact.phoneNumber || contact.id);
    const previous = bridge.contacts.get(id) || {};
    const merged = {
      ...previous,
      id,
      lid: contact.lid ? jidNormalizedUser(contact.lid) : previous.lid || (contact.id?.endsWith('@lid') ? jidNormalizedUser(contact.id) : null),
      name: contact.name ?? previous.name ?? null,
      push_name: contact.notify ?? previous.push_name ?? null,
      verified_name: contact.verifiedName ?? previous.verified_name ?? null,
      avatar_url: contact.imgUrl === 'changed' ? previous.avatar_url ?? null : contact.imgUrl ?? previous.avatar_url ?? null,
      avatar_changed: contact.imgUrl === 'changed' || undefined,
      status: contact.status ?? previous.status ?? null,
    };
    bridge.contacts.set(id, merged);
    return merged;
  },

  rememberChat(chat) {
    if (chat.lidJid && chat.pnJid) bridge.rememberMapping(chat.lidJid, chat.pnJid);
    const id = bridge.normalize(chat.pnJid || chat.id);
    const previous = bridge.chats.get(id) || {};
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
      muted_until: muteEnd === undefined ? previous.muted_until ?? null
        : muteEnd === 0 ? null
        : muteEnd < 0 ? 'forever'
        : new Date(muteEnd * 1000).toISOString(),
      last_message_at: timestamp ? new Date(Number(timestamp) * 1000).toISOString() : previous.last_message_at ?? null,
    };
    bridge.chats.set(id, merged);
    return merged;
  },

  groupPayload(group) {
    return {
      id: bridge.normalize(group.id),
      subject: group.subject ?? null,
      description: group.desc ?? null,
      owner: bridge.normalize(group.owner),
      size: group.size ?? group.participants?.length ?? null,
      created_at: group.creation ? new Date(group.creation * 1000).toISOString() : null,
      participants: (group.participants || []).map(p => ({id: bridge.normalize(p.id), admin: p.admin || null})),
    };
  },

  async messageEvent(message, live) {
    const content = message.message;
    if (!content) return null;

    const key = message.key;
    await Promise.all([bridge.resolveLid(key.remoteJid), bridge.resolveLid(key.participant)]);

    const inner = content.ephemeralMessage?.message
      || content.viewOnceMessage?.message
      || content.viewOnceMessageV2?.message
      || content.documentWithCaptionMessage?.message
      || content.editedMessage?.message
      || content;

    const kind = Object.keys(inner).find(k => k !== 'messageContextInfo' && k !== 'senderKeyDistributionMessage') || 'unknown';
    const base = bridge.keyPayload(key);
    const sentAt = new Date(Number(message.messageTimestamp) * 1000).toISOString();

    if (kind === 'reactionMessage') {
      const reaction = inner.reactionMessage;
      return {event: 'reaction', payload: {
        ...bridge.keyPayload(reaction.key),
        sender: bridge.senderOf(message),
        emoji: reaction.text || null,
        at: reaction.senderTimestampMs ? new Date(Number(reaction.senderTimestampMs)).toISOString() : sentAt,
      }};
    }

    if (kind === 'protocolMessage') {
      const protocol = inner.protocolMessage;
      if (protocol.type === PROTOCOL_REVOKE && protocol.key) {
        return {event: 'message_deleted', payload: {...bridge.keyPayload(protocol.key), by: bridge.senderOf(message), at: sentAt}};
      }
      if (protocol.type === PROTOCOL_MESSAGE_EDIT && protocol.key) {
        const edited = protocol.editedMessage || {};
        return {event: 'message_edited', payload: {...bridge.keyPayload(protocol.key), body: bridge.textOf(edited), at: sentAt}};
      }
      return null;
    }

    // Edits encrypted with a per-message secret; Baileys cannot decrypt these, so only mark the target as edited.
    if (kind === 'secretEncryptedMessage') {
      const target = inner.secretEncryptedMessage?.targetMessageKey;
      if (!target) return null;
      return {event: 'message_edited', payload: {...bridge.keyPayload(target), body: null, at: sentAt}};
    }

    if (kind === 'senderKeyDistributionMessage' || kind === 'unknown') return null;

    const context = inner[kind]?.contextInfo || inner.messageContextInfo || {};
    const chat = base.chat;

    return {event: 'message', payload: {
      ...base,
      is_group: chat.endsWith('@g.us'),
      sender: bridge.senderOf(message),
      sender_name: message.pushName || null,
      sent_at: sentAt,
      live,
      kind,
      body: bridge.textOf(inner),
      media: bridge.mediaOf(kind, inner),
      quoted_id: context.stanzaId || null,
      mentions: (context.mentionedJid || []).map(bridge.normalize),
      status: message.status ?? null,
    }};
  },

  keyPayload(key) {
    return {
      id: key.id,
      chat: bridge.normalize(key.remoteJid),
      from_me: Boolean(key.fromMe),
      participant: key.participant ? bridge.normalize(key.participant) : null,
    };
  },

  senderOf(message) {
    if (message.key.fromMe) return bridge.state.me?.id || null;
    return bridge.normalize(message.key.participant || message.key.remoteJid);
  },

  textOf(inner) {
    return inner.conversation
      || inner.extendedTextMessage?.text
      || inner.imageMessage?.caption
      || inner.videoMessage?.caption
      || inner.documentMessage?.caption
      || inner.editedMessage?.message?.protocolMessage?.editedMessage?.conversation
      || null;
  },

  mediaOf(kind, inner) {
    const media = inner[kind];
    if (!media || typeof media !== 'object' || !media.mimetype) return null;
    return {
      mimetype: media.mimetype,
      size: media.fileLength ? Number(media.fileLength) : null,
      filename: media.fileName || null,
      seconds: media.seconds || null,
      width: media.width || null,
      height: media.height || null,
      thumbnail: media.jpegThumbnail ? Buffer.from(media.jpegThumbnail).toString('base64') : null,
      // Needed to fetch and decrypt the full file later via POST /media.
      url: media.url || null,
      direct_path: media.directPath || null,
      media_key: bridge.b64(media.mediaKey),
      file_sha256: bridge.b64(media.fileSha256),
      file_enc_sha256: bridge.b64(media.fileEncSha256),
    };
  },

  b64(bytes) {
    return bytes ? Buffer.from(bytes).toString('base64') : null;
  },

  async downloadMedia(kind, media) {
    const type = MEDIA_TYPES[kind];
    if (!type || !media?.media_key) return null;
    const stream = await downloadContentFromMessage({
      mediaKey: Buffer.from(media.media_key, 'base64'),
      directPath: media.direct_path || undefined,
      url: media.url || undefined,
    }, type);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
  },

  async emit(event, payload) {
    return bridge.deliver({event, payload});
  },

  async emitBatch(events) {
    if (events.length === 0) return;
    if (events.length === 1) return bridge.deliver(events[0]);
    for (let i = 0; i < events.length; i += bridge.BATCH_SIZE) {
      await bridge.deliver({event: 'batch', payload: {events: events.slice(i, i + bridge.BATCH_SIZE)}});
    }
  },

  async deliver(body) {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-Bridge-Secret': BRIDGE_SECRET},
      body: JSON.stringify(body),
    });
  },

  readJson(request) {
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
  },

  async handleRequest(request, response) {
    const {state, sock, contacts, chats, lidToPhone, toJid, normalize} = bridge;
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

    if (request.headers['x-bridge-secret'] !== BRIDGE_SECRET) {
      return reply(401, {error: 'unauthorized'});
    }

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
        return reply(200, Object.values(groups).map(bridge.groupPayload));
      }

      case 'GET /avatar': {
        if (!requireOpen()) return;
        const jid = url.searchParams.get('jid');
        if (!jid) return reply(400, {error: 'jid is required'});
        const avatar = await sock.profilePictureUrl(toJid(jid), 'image').catch(() => null);
        return reply(200, {jid: normalize(toJid(jid)), url: avatar});
      }

      case 'POST /media': {
        if (!requireOpen()) return;
        const {kind, media} = await bridge.readJson(request);
        if (!kind || !media) return reply(400, {error: 'kind and media are required'});
        let buffer;
        try {
          buffer = await bridge.downloadMedia(kind, media);
        } catch (error) {
          return reply(502, {error: `download failed: ${error.message}`});
        }
        if (!buffer) return reply(422, {error: 'message has no downloadable media'});
        response.writeHead(200, {'Content-Type': media.mimetype || 'application/octet-stream', 'Content-Length': buffer.length});
        return response.end(buffer);
      }

      case 'POST /pair': {
        const {phone} = await bridge.readJson(request);
        const digits = String(phone || PHONE_NUMBER).replace(/\D/g, '');
        if (!digits) return reply(400, {error: 'phone is required'});
        if (state.status === 'open') return reply(409, {error: 'already linked', me: state.me});
        return reply(200, {code: await bridge.requestPairingCode(digits)});
      }

      case 'POST /send': {
        if (!requireOpen()) return;
        const {to, text, quote_id, mentions} = await bridge.readJson(request);
        if (!to || !text) return reply(400, {error: 'to and text are required'});
        const options = {};
        if (quote_id) options.quoted = {key: {remoteJid: toJid(to), id: quote_id, fromMe: false}, message: {conversation: ''}};
        const sent = await sock.sendMessage(toJid(to), {text, mentions: mentions?.map(toJid)}, options);
        return reply(200, {id: sent.key.id, chat: normalize(sent.key.remoteJid), sent_at: new Date(Number(sent.messageTimestamp) * 1000).toISOString()});
      }

      case 'POST /react': {
        if (!requireOpen()) return;
        const {chat, message_id, from_me, participant, emoji} = await bridge.readJson(request);
        if (!chat || !message_id) return reply(400, {error: 'chat and message_id are required'});
        const key = {remoteJid: toJid(chat), id: message_id, fromMe: Boolean(from_me), participant: participant ? toJid(participant) : undefined};
        await sock.sendMessage(toJid(chat), {react: {text: emoji || '', key}});
        return reply(200, {ok: true});
      }

      case 'POST /read': {
        if (!requireOpen()) return;
        const {chat, messages} = await bridge.readJson(request);
        if (!chat || !Array.isArray(messages) || messages.length === 0) return reply(400, {error: 'chat and messages[] are required'});
        await sock.readMessages(messages.map(m => ({remoteJid: toJid(chat), id: m.id, fromMe: false, participant: m.participant ? toJid(m.participant) : undefined})));
        return reply(200, {ok: true});
      }

      case 'POST /typing': {
        if (!requireOpen()) return;
        const {chat, typing} = await bridge.readJson(request);
        if (!chat) return reply(400, {error: 'chat is required'});
        await sock.sendPresenceUpdate(typing === false ? 'paused' : 'composing', toJid(chat));
        return reply(200, {ok: true});
      }

      default:
        return reply(404, {error: 'not found'});
    }
  },

  start() {
    http.createServer(bridge.handleRequest).listen(PORT, HOST);
    process.on('SIGINT', () => process.exit(0));
    process.on('SIGTERM', () => process.exit(0));
    bridge.connect();
  },
};

bridge.start();
