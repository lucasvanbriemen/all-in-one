module Whatsapp
  # Turns webhook events from the connector into database rows.
  class EventHandler
    CHAT_KEYED_EVENTS = %w[message message_edited message_deleted message_status reaction chat_cleared].freeze
    ID_KEYED_EVENTS = %w[chat chat_deleted group group_participants].freeze

    def self.handle(event, payload)
      handler = new
      handler.handle(event, payload)
      handler.broadcast_changes
    end

    def initialize
      @changed_jids = Set.new
    end

    def handle(event, payload)
      track_change(event, payload)
      case event
      when "batch" then payload["events"].each { |e| handle(e["event"], e["payload"]) }
      when "connection" then connection(payload)
      when "pairing_code" then Connection.current.update!(status: "pairing", pairing_code: payload["code"])
      when "contact" then contact(payload)
      when "chat" then chat(payload)
      when "chat_deleted" then delete_channel(payload["id"])
      when "chat_cleared" then clear_messages(resolve(payload["chat"]))
      when "group" then group(payload)
      when "group_participants" then nil # Participants are not stored.
      when "message" then message(payload)
      when "message_edited" then message_edited(payload)
      when "message_deleted" then Message.find_by(id: payload["id"])&.destroy
      when "message_status" then Message.where(id: payload["id"]).update_all(status: payload["status"])
      when "reaction" then reaction(payload)
      when "lid_mapping" then LidMerge.call(lid: payload["lid"], phone: payload["phone"])
      when "presence" then nil # Ephemeral; not stored.
      else Rails.logger.warn("[whatsapp] unknown event #{event}")
      end
    end

    # One signal per chat, so a batch of history does not flood the socket.
    def broadcast_changes
      @changed_jids.each { |jid| ActionCable.server.broadcast("whatsapp", { type: "chat_changed", jid: jid }) }
    end

    private

    def track_change(event, payload)
      jid = payload["chat"] if CHAT_KEYED_EVENTS.include?(event)
      jid = payload["id"] if ID_KEYED_EVENTS.include?(event)
      @changed_jids << resolve(jid) if jid
    end

    def connection(payload)
      me = payload["me"] || {}
      attributes = { status: payload["status"], last_error: payload["reason"] }
      if payload["status"] == "open"
        attributes.merge!(me_jid: me["id"], me_lid: me["lid"], me_name: me["name"], pairing_code: nil, connected_at: Time.current)
        ensure_contact(me["id"], me["name"]) if me["id"].present?
      end
      Connection.current.update!(attributes)
    end

    def contact(payload)
      record = Contact.find_or_initialize_by(id: payload["id"])
      record.assign_attributes(
        lid: payload["lid"] || record.lid,
        name: payload["name"].presence || payload["verified_name"].presence || payload["push_name"].presence || record.name,
        avatar_url: payload["avatar_url"]
      )
      record.save!
    end

    def chat(payload)
      record = Channel.find_or_initialize_by(id: resolve(payload["id"]))
      record.assign_attributes(
        name: payload["name"] || record.name,
        is_group_chat: payload["is_group"],
        is_dm: !payload["is_group"],
        is_active: !payload["archived"],
        contact_id: (record.id unless payload["is_group"])
      )
      record.save!
    end

    def group(payload)
      record = Channel.find_or_initialize_by(id: payload["id"])
      record.assign_attributes(is_group_chat: true, is_dm: false, name: payload["subject"] || record.name)
      record.save!
    end

    def message(payload)
      chat = resolve(payload["chat"])
      ensure_channel(chat, is_group: payload["is_group"])
      sender_name = payload["from_me"] ? Connection.current.me_name : payload["sender_name"]
      sender = ensure_contact(resolve(payload["sender"]) || chat, sender_name)

      record = Message.find_or_initialize_by(id: payload["id"])
      record.assign_attributes(
        channel_id: chat,
        contact_id: sender.id,
        body: payload["body"],
        message_secret: payload["message_secret"] || record.message_secret,
        quoted_message_id: payload["quoted_id"],
        status: payload["status"],
        created_at: time(payload["sent_at"]) || record.created_at
      )
      record.save!

      if payload.dig("media", "media_key").present? && !record.file_uploads.exists?
        DownloadWhatsappMediaJob.set(priority: payload["live"] ? 0 : DownloadWhatsappMediaJob::HISTORY_PRIORITY).perform_later(record.id, payload["kind"], payload["media"])
      end

      # History sync replays old messages; only new ones are worth a notification.
      return if payload["from_me"] || !payload["live"]

      Notification.create!(
        title: payload["sender_name"],
        body: record.body,
        source: "messages.whatsapp.#{chat}"
      )
    end

    def message_edited(payload)
      message = Message.find_by(id: payload["id"])
      return unless message

      body = payload["body"]
      body ||= decrypt_edit(message, payload["encrypted"]) if payload["encrypted"]
      # Without a readable body keep the old text.
      message.update!(body: body) unless body.nil?
    end

    # Secret-encrypted edits are keyed on the original message's secret, which only we stored.
    def decrypt_edit(message, encrypted)
      return nil unless message.message_secret.present?

      Bridge.decrypt_edit(
        secret: message.message_secret,
        target_id: message.id,
        creators: encrypted["creators"],
        editors: encrypted["editors"],
        payload: encrypted["payload"],
        iv: encrypted["iv"]
      )["body"]
    rescue Bridge::Error => e
      Rails.logger.warn("[whatsapp] could not decrypt edit of #{message.id}: #{e.message}")
      nil
    end

    # One reaction per person per message; an empty emoji takes it back.
    def reaction(payload)
      sender = resolve(payload["sender"])
      return if sender.blank?

      scope = MessageReaction.where(message_id: payload["id"], contact_id: sender)
      return scope.delete_all if payload["emoji"].blank?
      return unless Message.exists?(id: payload["id"])

      ensure_contact(sender, nil)
      scope.first_or_initialize.update!(reaction: payload["emoji"])
    end

    def ensure_channel(jid, is_group:)
      Channel.find_or_create_by!(id: jid) do |channel|
        channel.is_group_chat = is_group
        channel.is_dm = !is_group
        channel.contact_id = jid unless is_group
      end
    end

    # Push names travel with every message, so people outside the address book still get a name.
    def ensure_contact(jid, name)
      contact = Contact.find_or_initialize_by(id: jid)
      contact.name = name if contact.name.blank? && name.present?
      contact.save! if contact.changed?
      contact
    end

    def delete_channel(jid)
      clear_messages(jid)
      Channel.where(id: jid).delete_all
    end

    def clear_messages(jid)
      Message.where(channel_id: jid).find_each(&:destroy)
    end

    # Events can still name a privacy id after we learned its phone jid; file them under the phone jid straight away.
    def resolve(jid)
      return jid unless jid.to_s.end_with?("@lid")

      Contact.where(lid: jid).where.not(id: jid).pick(:id) || jid
    end

    def time(value)
      value.present? ? Time.zone.parse(value) : nil
    end
  end
end
