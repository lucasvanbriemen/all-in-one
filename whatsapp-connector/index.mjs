import {Browsers, DisconnectReason, fetchLatestBaileysVersion, jidNormalizedUser, makeCacheableSignalKeyStore, makeWASocket, useMultiFileAuthState} from 'baileys';

import {Boom} from '@hapi/boom';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import pino from 'pino';

/**
 * WhatsApp bridge.
 *
 * Links to the user's WhatsApp account as a companion device (the same
 * protocol WhatsApp Web speaks) and does exactly three things:
 *
 *   1. keeps the session alive and reconnects when it drops;
 *   2. relays every incoming message to Rails (`WEBHOOK_URL`), or to stdout
 *      when no webhook is configured;
 *   3. answers a tiny HTTP API so Rails can ask for a pairing code, read the
 *      connection state and send a message.
 *
 * It owns no data. Rails is the source of truth; this process is a modem.
 */

const PORT = Number(process.env.PORT || 4002);
const HOST = process.env.HOST || '127.0.0.1';
const AUTH_DIR = process.env.AUTH_DIR || path.resolve('../storage/whatsapp/auth');
const WEBHOOK_URL = process.env.WEBHOOK_URL || null;
/** Shared with Rails: sent on webhooks, required on API calls. Empty disables the check. */
const BRIDGE_SECRET = process.env.BRIDGE_SECRET || '';
/** Digits only, country code first. Setting it makes the bridge pair itself on first boot. */
const PHONE_NUMBER = (process.env.PHONE_NUMBER || '').replace(/\D/g, '');

const log = pino({level: process.env.LOG_LEVEL || 'info'});
/** Baileys is chatty; it gets its own, quieter logger. */
const socketLog = pino({level: process.env.BAILEYS_LOG_LEVEL || 'warn'});

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
    // Pairing by code requires the QR not to be printed, and we never show one.
    printQRInTerminal: false,
    // Stay invisible: do not flip the phone's own notifications off by looking "online".
    markOnlineOnConnect: false,
    // Full history is huge and arrives as one burst; the recent slice is enough to start.
    syncFullHistory: false,
    // Needed for retries of messages we sent; we keep nothing, so there is nothing to give back.
    getMessage: async () => undefined,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async update => {
    const {connection, lastDisconnect, qr} = update;

    // A QR means the socket is ready to pair. We swap it for a code instead,
    // which can be typed on the phone itself.
    if (qr && PHONE_NUMBER && !pairingRequested) {
      pairingRequested = true;
      await requestPairingCode(PHONE_NUMBER);
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
      state.me = sock.user ? {id: jidNormalizedUser(sock.user.id), name: sock.user.name} : null;
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
  });

  sock.ev.on('messages.upsert', async ({messages, type}) => {
    for (const message of messages) {
      // `append` is history being replayed; `notify` is live traffic.
      await emit('message', normalizeMessage(message, type));
    }
  });

  sock.ev.on('messages.update', async updates => {
    for (const {key, update} of updates) {
      if (update.status === undefined) continue;
      await emit('message_status', {id: key.id, chat: key.remoteJid, from_me: key.fromMe, status: update.status});
    }
  });
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
// Messages
// ---------------------------------------------------------------------------

/**
 * Flattens a WhatsApp message into the shape Rails will store. Media is
 * described, not downloaded; that is a later step and an explicit request.
 */
function normalizeMessage(message, upsertType) {
  const content = message.message || {};
  // Ephemeral and view-once wrappers hide the real message one level down.
  const inner = content.ephemeralMessage?.message
    || content.viewOnceMessage?.message
    || content.viewOnceMessageV2?.message
    || content;

  const kind = Object.keys(inner).find(k => k !== 'messageContextInfo') || 'unknown';
  const chat = message.key.remoteJid;
  const isGroup = chat?.endsWith('@g.us');

  return {
    id: message.key.id,
    chat,
    chat_name: message.pushName && !isGroup ? message.pushName : undefined,
    is_group: Boolean(isGroup),
    sender: message.key.fromMe ? state.me?.id : (message.key.participant || chat),
    sender_name: message.pushName || null,
    from_me: Boolean(message.key.fromMe),
    sent_at: new Date(Number(message.messageTimestamp) * 1000).toISOString(),
    live: upsertType === 'notify',
    kind,
    body: textOf(inner),
    media: mediaOf(kind, inner),
  };
}

function textOf(inner) {
  return inner.conversation
    || inner.extendedTextMessage?.text
    || inner.imageMessage?.caption
    || inner.videoMessage?.caption
    || inner.documentMessage?.caption
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
  };
}

// ---------------------------------------------------------------------------
// Outbound: webhook to Rails, or stdout while there is none
// ---------------------------------------------------------------------------

async function emit(event, payload) {
  if (!WEBHOOK_URL) {
    log.info({event, ...payload}, 'event');
    return;
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Bridge-Secret': BRIDGE_SECRET,
      },
      body: JSON.stringify({event, payload}),
    });
    if (!response.ok) {
      log.warn({event, status: response.status}, 'Webhook rejected event');
    }
  } catch (error) {
    log.warn({event, err: error.message}, 'Webhook unreachable');
  }
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

  if (BRIDGE_SECRET && request.headers['x-bridge-secret'] !== BRIDGE_SECRET) {
    return reply(401, {error: 'unauthorized'});
  }

  try {
    if (request.method === 'GET' && url.pathname === '/state') {
      return reply(200, state);
    }

    if (request.method === 'POST' && url.pathname === '/pair') {
      const {phone} = await readJson(request);
      const digits = String(phone || PHONE_NUMBER).replace(/\D/g, '');
      if (!digits) return reply(400, {error: 'phone is required'});
      if (state.status === 'open') return reply(409, {error: 'already linked', me: state.me});
      const code = await requestPairingCode(digits);
      return reply(200, {code});
    }

    if (request.method === 'POST' && url.pathname === '/send') {
      if (state.status !== 'open') return reply(503, {error: 'not connected', status: state.status});
      const {to, text} = await readJson(request);
      if (!to || !text) return reply(400, {error: 'to and text are required'});
      const sent = await sock.sendMessage(toJid(to), {text});
      return reply(200, {id: sent.key.id, chat: sent.key.remoteJid});
    }

    if (request.method === 'POST' && url.pathname === '/logout') {
      await sock?.logout().catch(() => {});
      fs.rmSync(AUTH_DIR, {recursive: true, force: true});
      state.status = 'needs_relink';
      state.me = null;
      return reply(200, {status: state.status});
    }

    reply(404, {error: 'not found'});
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
