# WhatsApp connector

Links to WhatsApp as a companion device and relays everything to Rails. Owns
no data; Rails is the source of truth.

## Run

    cd whatsapp-connector
    npm install
    cp .env.example .env   # fill in PHONE_NUMBER, WEBHOOK_URL, BRIDGE_SECRET
    npm start

On first boot the log prints a pairing code. On the phone: WhatsApp > Linked
devices > Link a device > Link with phone number instead, and type the code.
The session is saved under `storage/whatsapp/auth`, so later boots reconnect
without pairing.

Without `WEBHOOK_URL`, every event is logged to stdout as JSON. With it, events
are POSTed as `{event, payload}` with an `X-Bridge-Secret` header. Bursts
(history sync, multi-row updates) arrive as one `batch` event holding up to
200 `{event, payload}` items.

## Identity

WhatsApp addresses people either by phone JID (`316...@s.whatsapp.net`) or by
a privacy id (`...@lid`). The connector resolves LIDs to phone JIDs wherever it
can, so every `chat`, `sender` and `participant` below is a phone JID when the
mapping is known. A `lid_mapping` event tells Rails when a LID it saw earlier
turns out to be a known phone, so the two can be merged.

## Events

| event                | payload                                                                 |
| -------------------- | ----------------------------------------------------------------------- |
| `pairing_code`       | `{code}`                                                                |
| `connection`         | `{status: open \| closed \| needs_relink, me?, reason?}`                |
| `lid_mapping`        | `{lid, phone}`                                                          |
| `contact`            | `{id, lid, name, push_name, verified_name, avatar_url, avatar_changed?, status}` |
| `chat`               | `{id, is_group, name, unread_count, archived, pinned, read_only, muted_until, last_message_at}` |
| `chat_deleted`       | `{id}`                                                                  |
| `chat_cleared`       | `{chat}`                                                                |
| `group`              | `{id, subject, description, owner, size, created_at, participants: [{id, admin}]}` |
| `group_participants` | `{id, author, action: add \| remove \| promote \| demote, participants}` |
| `message`            | `{id, chat, from_me, participant, is_group, sender, sender_name, sent_at, live, kind, body, media, quoted_id, mentions, status}` |
| `message_status`     | `{id, chat, from_me, participant, status}`                              |
| `message_edited`     | `{id, chat, from_me, participant, body, at}`                            |
| `message_deleted`    | `{id, chat, from_me, participant, by, at}`                              |
| `reaction`           | `{id, chat, from_me, participant, sender, emoji, at}` — `id` is the message reacted to; `emoji: null` removes |
| `presence`           | `{chat, participant, presence: available \| unavailable \| composing \| recording \| paused, last_seen}` |
| `batch`              | `{events: [{event, payload}, ...]}`                                     |

Notes:

- `live` is false for messages replayed from history; those should not notify.
- `media` is a description (`mimetype, size, filename, seconds, width, height,
  thumbnail`), not the file. `thumbnail` is a base64 JPEG when WhatsApp
  shipped one inline.
- `status` on messages and `message_status`: 0 error, 1 pending, 2 sent,
  3 delivered, 4 read, 5 played.
- `contact.name` is the address-book name, `push_name` the one the contact
  chose. `avatar_changed: true` means fetch a fresh URL via `GET /avatar`.

## API

All calls require `X-Bridge-Secret` when `BRIDGE_SECRET` is set. `to`, `chat`
and `jid` accept a phone number or a JID.

    GET  /state                              status, pairing code, linked account, cache sizes
    GET  /chats                              cached chat list
    GET  /contacts                           cached contact list
    GET  /groups                             all groups with participants (live fetch)
    GET  /avatar?jid=...                     profile picture URL
    POST /pair    {phone}                    request a new pairing code
    POST /send    {to, text, quote_id?, mentions?}
    POST /react   {chat, message_id, from_me, participant?, emoji}   empty emoji removes
    POST /read    {chat, messages: [{id, participant?}]}             send read receipts
    POST /typing  {chat, typing: true|false}
    POST /logout                             unlink and clear the session
