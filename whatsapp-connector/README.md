# WhatsApp bridge

Links to WhatsApp as a companion device and relays messages to Rails. Owns no
data; Rails is the source of truth.

## Run

    cd whatsapp-bridge
    npm install
    npm start   # reads .env (copy .env.example)

On first boot the log prints a pairing code. On the phone: WhatsApp > Linked
devices > Link a device > Link with phone number instead, and type the code.
The session is saved under `storage/whatsapp/auth`, so later boots reconnect
without pairing.

Without `WEBHOOK_URL`, every event is logged to stdout as JSON. With it, events
are POSTed as `{event, payload}` with an `X-Bridge-Secret` header.

## Events

| event            | payload                                                      |
| ---------------- | ------------------------------------------------------------ |
| `pairing_code`   | `{code}`                                                     |
| `connection`     | `{status: open \| closed \| needs_relink, me?, reason?}`     |
| `message`        | `{id, chat, is_group, sender, sender_name, from_me, sent_at, live, kind, body, media}` |
| `message_status` | `{id, chat, from_me, status}`                                |

`live` is false for messages replayed from history on connect.

## API

All calls require `X-Bridge-Secret` when `BRIDGE_SECRET` is set.

    GET  /state                      connection status, pairing code, linked account
    POST /pair    {"phone": "316..."} request a new pairing code
    POST /send    {"to": "316...", "text": "hi"}   `to` is a phone number or JID
    POST /logout                     unlink and clear the session
