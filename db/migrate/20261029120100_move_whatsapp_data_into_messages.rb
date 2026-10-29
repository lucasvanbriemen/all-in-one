# Copies the whatsapp_* tables into the shared channels/contacts/messages tables. Safe to re-run: every insert skips rows
# that already exist. Run with the WhatsApp connector stopped so no webhook writes to the old tables meanwhile.
class MoveWhatsappDataIntoMessages < ActiveRecord::Migration[8.0]
  ME = "(SELECT me_jid FROM whatsapp_connections ORDER BY id LIMIT 1)".freeze
  # Our own messages can lack a sender; any other message without one is credited to the chat it came from.
  SENDER = "COALESCE(m.sender_jid, IF(m.from_me, #{ME}, NULL), m.chat_jid)".freeze
  OLD_MEDIA_DIR = Rails.root.join("storage", "whatsapp", "media")

  def up
    copy_contacts
    copy_channels
    copy_messages
    copy_reactions
    copy_media
    Whatsapp::LidMerge.backfill
  end

  def down
    whatsapp_messages = "SELECT id FROM messages WHERE type = 'Whatsapp::Message'"
    execute "DELETE FROM message_reactions WHERE message_id IN (#{whatsapp_messages})"
    execute "DELETE FROM file_uploads WHERE message_id IN (#{whatsapp_messages})"
    execute "DELETE FROM messages WHERE type = 'Whatsapp::Message'"
    execute "DELETE FROM message_reactions WHERE contact_id IN (SELECT id FROM contacts WHERE type = 'Whatsapp::Contact')"
    execute "DELETE FROM channels WHERE type = 'Whatsapp::Channel'"
    execute "DELETE FROM contacts WHERE type = 'Whatsapp::Contact'"
  end

  private

  def copy_contacts
    execute <<~SQL
      INSERT IGNORE INTO contacts (id, type, name, avatar_url, lid, is_active, created_at, updated_at)
      SELECT jid, 'Whatsapp::Contact', COALESCE(NULLIF(name, ''), NULLIF(verified_name, ''), NULLIF(push_name, '')),
             avatar_url, lid, TRUE, created_at, updated_at
      FROM whatsapp_contacts
    SQL

    execute <<~SQL
      INSERT IGNORE INTO contacts (id, type, name, is_active, created_at, updated_at)
      SELECT me_jid, 'Whatsapp::Contact', me_name, TRUE, created_at, updated_at
      FROM whatsapp_connections WHERE me_jid IS NOT NULL
    SQL

    # Senders that never showed up as a contact event; the push name on their messages is the best name we have.
    execute <<~SQL
      INSERT IGNORE INTO contacts (id, type, name, is_active, created_at, updated_at)
      SELECT sender, 'Whatsapp::Contact', MAX(NULLIF(sender_name, '')), TRUE, MIN(created_at), MAX(updated_at)
      FROM (SELECT #{SENDER} AS sender, m.sender_name, m.created_at, m.updated_at FROM whatsapp_messages m) senders
      GROUP BY sender
    SQL

    execute <<~SQL
      UPDATE contacts c
      JOIN (SELECT sender_jid, MAX(NULLIF(sender_name, '')) AS sender_name FROM whatsapp_messages WHERE from_me = FALSE GROUP BY sender_jid) s
        ON s.sender_jid = c.id
      SET c.name = s.sender_name
      WHERE c.type = 'Whatsapp::Contact' AND (c.name IS NULL OR c.name = '') AND s.sender_name IS NOT NULL
    SQL

    execute <<~SQL
      INSERT IGNORE INTO contacts (id, type, is_active, created_at, updated_at)
      SELECT sender_jid, 'Whatsapp::Contact', TRUE, MIN(created_at), MAX(updated_at)
      FROM whatsapp_reactions GROUP BY sender_jid
    SQL
  end

  def copy_channels
    execute <<~SQL
      INSERT IGNORE INTO channels (id, type, name, avatar_url, is_active, is_private, is_dm, is_group_chat, is_member, contact_id, created_at, updated_at)
      SELECT jid, 'Whatsapp::Channel', name, avatar_url, NOT archived, TRUE, NOT is_group, is_group, TRUE, IF(is_group, NULL, jid), created_at, updated_at
      FROM whatsapp_chats
    SQL

    execute <<~SQL
      INSERT IGNORE INTO channels (id, type, is_active, is_private, is_dm, is_group_chat, is_member, contact_id, created_at, updated_at)
      SELECT chat_jid, 'Whatsapp::Channel', TRUE, TRUE, chat_jid NOT LIKE '%@g.us', chat_jid LIKE '%@g.us', TRUE,
             IF(chat_jid LIKE '%@g.us', NULL, chat_jid), MIN(created_at), MAX(updated_at)
      FROM whatsapp_messages GROUP BY chat_jid
    SQL
  end

  # A message stored under both a lid chat and its phone chat is the same message; the phone-jid copy goes in first and wins.
  def copy_messages
    execute <<~SQL
      INSERT IGNORE INTO messages (id, type, contact_id, channel_id, body, quoted_message_id, message_secret, status, created_at, updated_at)
      SELECT m.wa_id, 'Whatsapp::Message', #{SENDER}, m.chat_jid, m.body, m.quoted_id, m.message_secret, m.status,
             COALESCE(m.sent_at, m.created_at), m.updated_at
      FROM whatsapp_messages m
      WHERE m.deleted_at IS NULL
      ORDER BY m.chat_jid LIKE '%@lid', m.id
    SQL
  end

  def copy_reactions
    execute <<~SQL
      INSERT INTO message_reactions (message_id, contact_id, reaction, created_at, updated_at)
      SELECT r.message_wa_id, r.sender_jid, MAX(r.emoji), MIN(COALESCE(r.reacted_at, r.created_at)), MAX(r.updated_at)
      FROM whatsapp_reactions r
      WHERE r.emoji IS NOT NULL AND r.emoji <> ''
        AND NOT EXISTS (SELECT 1 FROM message_reactions mr WHERE mr.message_id = r.message_wa_id AND mr.contact_id = r.sender_jid)
      GROUP BY r.message_wa_id, r.sender_jid
    SQL
  end

  # Media the old endpoint already downloaded is moved into place; everything else is fetched again in the background.
  def copy_media
    rows = select_rows(<<~SQL)
      SELECT m.wa_id, m.chat_jid, m.kind, m.media FROM whatsapp_messages m
      WHERE m.deleted_at IS NULL AND m.media IS NOT NULL
        AND EXISTS (SELECT 1 FROM messages WHERE messages.id = m.wa_id)
        AND NOT EXISTS (SELECT 1 FROM file_uploads f WHERE f.message_id = m.wa_id AND f.external_id = m.wa_id)
    SQL

    FileUtils.mkdir_p(DownloadWhatsappMediaJob::FILES_DIR)
    rows.each do |wa_id, chat_jid, kind, media_json|
      media = JSON.parse(media_json)
      next unless media.is_a?(Hash) && media["media_key"].present?

      extension = DownloadWhatsappMediaJob.extension_for(media)
      cached = OLD_MEDIA_DIR.join(chat_jid.parameterize, "#{wa_id.parameterize}#{extension}")
      if cached.exist?
        id = SecureRandom.uuid
        path = DownloadWhatsappMediaJob::FILES_DIR.join("#{id}#{extension}").to_s
        FileUtils.mv(cached, path)
        FileUpload.create!(id: id, message_id: wa_id, external_id: wa_id, path: path, name: media["filename"], mimetype: media["mimetype"])
      else
        DownloadWhatsappMediaJob.set(priority: DownloadWhatsappMediaJob::HISTORY_PRIORITY).perform_later(wa_id, kind, media)
      end
    end
  end
end
