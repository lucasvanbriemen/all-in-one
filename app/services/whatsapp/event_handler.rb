module Whatsapp
  # Turns webhook events from the connector into database rows.
  class EventHandler
    def self.handle(event, payload)
      new.handle(event, payload)
    end

    def handle(event, payload)
      case event
      when "batch" then payload["events"].each { |e| handle(e["event"], e["payload"]) }
      when "connection" then connection(payload)
      when "pairing_code" then Connection.current.update!(status: "pairing", pairing_code: payload["code"])
      when "contact" then contact(payload)
      when "chat" then chat(payload)
      when "chat_deleted" then Chat.where(jid: payload["id"]).destroy_all
      when "chat_cleared" then Message.where(chat_jid: payload["chat"]).delete_all
      when "group" then group(payload)
      when "group_participants" then group_participants(payload)
      when "message" then message(payload)
      when "message_edited" then message_edited(payload)
      when "message_deleted" then message_deleted(payload)
      when "message_status" then Message.where(chat_jid: payload["chat"], wa_id: payload["id"]).update_all(status: payload["status"])
      when "reaction" then reaction(payload)
      when "lid_mapping" then Contact.where(lid: payload["lid"]).where.not(jid: payload["phone"]).update_all(jid: payload["phone"])
      when "presence" then nil # Ephemeral; not stored.
      else Rails.logger.warn("[whatsapp] unknown event #{event}")
      end
    end

    private

    def connection(payload)
      me = payload["me"] || {}
      attributes = { status: payload["status"], last_error: payload["reason"] }
      if payload["status"] == "open"
        attributes.merge!(me_jid: me["id"], me_lid: me["lid"], me_name: me["name"], pairing_code: nil, connected_at: Time.current)
      end
      Connection.current.update!(attributes)
    end

    def contact(payload)
      record = Contact.find_or_initialize_by(jid: payload["id"])
      record.assign_attributes(
        lid: payload["lid"] || record.lid,
        name: payload["name"],
        push_name: payload["push_name"],
        verified_name: payload["verified_name"],
        avatar_url: payload["avatar_url"],
        status: payload["status"]
      )
      record.save!
    end

    def chat(payload)
      record = Chat.find_or_initialize_by(jid: payload["id"])
      record.assign_attributes(
        name: payload["name"] || record.name,
        is_group: payload["is_group"],
        unread_count: payload["unread_count"],
        archived: payload["archived"],
        pinned: payload["pinned"],
        read_only: payload["read_only"],
        muted_until: payload["muted_until"],
        last_message_at: time(payload["last_message_at"]) || record.last_message_at
      )
      record.save!
    end

    def group(payload)
      record = Chat.find_or_initialize_by(jid: payload["id"])
      record.assign_attributes(
        is_group: true,
        name: payload["subject"] || record.name,
        description: payload["description"],
        owner_jid: payload["owner"],
        participants: payload["participants"]
      )
      record.save!
    end

    def group_participants(payload)
      record = Chat.find_by(jid: payload["id"])
      return unless record

      current = (record.participants || []).reject { |p| payload["participants"].include?(p["id"]) }
      case payload["action"]
      when "add" then current += payload["participants"].map { |id| { "id" => id, "admin" => nil } }
      when "promote" then current += payload["participants"].map { |id| { "id" => id, "admin" => "admin" } }
      when "demote" then current += payload["participants"].map { |id| { "id" => id, "admin" => nil } }
      end
      record.update!(participants: current)
    end

    def message(payload)
      record = Message.find_or_initialize_by(chat_jid: payload["chat"], wa_id: payload["id"])
      record.assign_attributes(
        sender_jid: payload["sender"],
        sender_name: payload["sender_name"],
        from_me: payload["from_me"],
        kind: payload["kind"],
        body: payload["body"],
        media: payload["media"],
        quoted_id: payload["quoted_id"],
        mentions: payload["mentions"],
        status: payload["status"],
        live: payload["live"],
        sent_at: time(payload["sent_at"])
      )
      record.save!

      Chat.where(jid: payload["chat"]).where("last_message_at IS NULL OR last_message_at < ?", record.sent_at).update_all(last_message_at: record.sent_at) if record.sent_at
    end

    def message_edited(payload)
      # Secret-encrypted edits arrive without a readable body; keep the old text and only mark the edit.
      changes = { edited_at: time(payload["at"]) }
      changes[:body] = payload["body"] unless payload["body"].nil?
      Message.where(chat_jid: payload["chat"], wa_id: payload["id"]).update_all(changes)
    end

    def message_deleted(payload)
      Message.where(chat_jid: payload["chat"], wa_id: payload["id"]).update_all(deleted_at: time(payload["at"]) || Time.current, deleted_by_jid: payload["by"])
    end

    def reaction(payload)
      scope = Reaction.where(chat_jid: payload["chat"], message_wa_id: payload["id"], sender_jid: payload["sender"])
      return scope.delete_all if payload["emoji"].blank?

      record = scope.first_or_initialize
      record.update!(emoji: payload["emoji"], reacted_at: time(payload["at"]))
    end

    def time(value)
      value.present? ? Time.zone.parse(value) : nil
    end
  end
end
