module Messaging
  module Whatsapp
    # Applies events from the connector to the database. Every handler is
    # idempotent: the connector replays history on reconnect and may deliver
    # the same event twice, so "already there" is always fine.
    class Events
      def initialize(account = Account.whatsapp)
        @account = account
      end

      def handle(event, payload)
        payload = (payload || {}).with_indifferent_access
        handler = "on_#{event}"
        if respond_to?(handler, true)
          send(handler, payload)
        else
          Rails.logger.info("[WhatsApp] ignoring unknown event #{event}")
        end
      end

      private

      attr_reader :account

      def on_batch(payload)
        Array(payload[:events]).each { |item| handle(item[:event], item[:payload]) }
      end

      # --- account -------------------------------------------------------------

      def on_pairing_code(payload)
        account.update!(status: "pairing", pairing_code: payload[:code])
        Notification.create!(
          title: "WhatsApp pairing code: #{payload[:code]}",
          body: "WhatsApp > Linked devices > Link with phone number",
          source: "messages.whatsapp.pairing"
        )
      end

      def on_connection(payload)
        attrs = { status: payload[:status], last_error: payload[:reason] }
        case payload[:status]
        when "open"
          attrs.merge!(pairing_code: nil, connected_at: Time.current, last_error: nil, external_id: payload.dig(:me, :id), name: payload.dig(:me, :name))
        when "needs_relink"
          Notification.create!(title: "WhatsApp needs relinking", body: "The phone unlinked this device. Open Messages to pair again.", source: "messages.whatsapp.relink")
        end
        account.update!(attrs)
      end

      def on_lid_mapping(payload)
        lid, phone = payload.values_at(:lid, :phone)
        return if lid.blank? || phone.blank?

        merge_conversations(lid: lid, phone: phone)
        merge_contacts(lid: lid, phone: phone)
      end

      # --- contacts & chats ----------------------------------------------------

      def on_contact(payload)
        contact = account.contacts.find_or_initialize_by(external_id: payload[:id])
        contact.assign_attributes({
          alt_external_id: payload[:lid],
          name: payload[:name],
          push_name: payload[:push_name],
          verified_name: payload[:verified_name],
          avatar_url: payload[:avatar_url],
          status_text: payload[:status]
        }.compact)
        contact.save! if contact.changed?
      end

      def on_chat(payload)
        conversation = find_or_build_conversation(payload[:id], group: payload[:is_group])
        conversation.assign_attributes({
          name: payload[:name],
          unread_count: payload[:unread_count],
          archived: payload[:archived],
          pinned: payload[:pinned],
          read_only: payload[:read_only],
          last_message_at: payload[:last_message_at]
        }.compact)
        apply_mute(conversation, payload[:muted_until]) if payload.key?(:muted_until)
        conversation.save! if conversation.changed?
      end

      def on_chat_deleted(payload)
        account.conversations.find_by(external_id: payload[:id])&.destroy!
      end

      def on_chat_cleared(payload)
        account.conversations.find_by(external_id: payload[:chat])&.messages&.delete_all
      end

      def on_group(payload)
        conversation = find_or_build_conversation(payload[:id], group: true)
        conversation.assign_attributes({
          name: payload[:subject],
          description: payload[:description],
          participants: payload[:participants]
        }.compact)
        conversation.save! if conversation.changed?
      end

      def on_group_participants(payload)
        conversation = account.conversations.find_by(external_id: payload[:id])
        return unless conversation

        current = Array(conversation.participants).map(&:with_indifferent_access)
        ids = Array(payload[:participants])
        case payload[:action]
        when "add" then ids.each { |id| current << { id: id, admin: nil } unless current.any? { |p| p[:id] == id } }
        when "remove" then current.reject! { |p| ids.include?(p[:id]) }
        when "promote" then current.each { |p| p[:admin] = "admin" if ids.include?(p[:id]) }
        when "demote" then current.each { |p| p[:admin] = nil if ids.include?(p[:id]) }
        end
        conversation.update!(participants: current)
      end

      # --- messages ------------------------------------------------------------

      def on_message(payload)
        return if Message::SYSTEM_KINDS.include?(payload[:kind])

        conversation = find_or_build_conversation(payload[:chat], group: payload[:is_group])
        conversation.last_message_at = [ conversation.last_message_at, payload[:sent_at]&.to_time ].compact.max
        conversation.save! if conversation.changed? || conversation.new_record?

        message = conversation.messages.find_or_initialize_by(external_id: payload[:id])
        created = message.new_record?
        message.assign_attributes(
          sender_id: payload[:sender],
          sender_name: payload[:sender_name].presence || message.sender_name,
          from_me: payload[:from_me],
          kind: payload[:kind],
          body: payload[:body],
          media: payload[:media],
          quoted_external_id: payload[:quoted_id],
          mentions: payload[:mentions],
          status: payload[:status] || message.status,
          sent_at: payload[:sent_at],
          live: message.live || payload[:live]
        )
        message.save! if message.changed?

        notify(conversation, message) if created && payload[:live] && !payload[:from_me]
      end

      def on_message_status(payload)
        with_message(payload) { |message| message.update!(status: payload[:status]) if payload[:status].to_i > message.status.to_i }
      end

      def on_message_edited(payload)
        with_message(payload) { |message| message.update!(body: payload[:body], edited_at: payload[:at]) }
      end

      def on_message_deleted(payload)
        with_message(payload) { |message| message.update!(deleted_at: payload[:at] || Time.current) }
      end

      def on_reaction(payload)
        with_message(payload) do |message|
          reaction = message.reactions.find_or_initialize_by(sender_id: payload[:sender])
          if payload[:emoji].blank?
            reaction.destroy! if reaction.persisted?
          else
            reaction.update!(emoji: payload[:emoji], reacted_at: payload[:at])
          end
        end
      end

      def on_presence(_payload)
        # Typing indicators are transient; nothing to store until the UI shows them live.
      end

      # --- helpers -------------------------------------------------------------

      def find_or_build_conversation(external_id, group: nil)
        conversation = account.conversations.find_by(external_id: external_id) ||
          account.conversations.find_by(alt_external_id: external_id) ||
          account.conversations.new(external_id: external_id)
        conversation.alt_external_id = external_id if external_id.end_with?("@lid") && conversation.external_id != external_id
        conversation.kind = group.nil? ? (external_id.end_with?("@g.us") ? "group" : "direct") : (group ? "group" : "direct") if conversation.new_record?
        conversation
      end

      def with_message(payload)
        conversation = account.conversations.find_by(external_id: payload[:chat]) || account.conversations.find_by(alt_external_id: payload[:chat])
        message = conversation&.messages&.find_by(external_id: payload[:id])
        yield message if message
      end

      def apply_mute(conversation, muted_until)
        case muted_until
        when nil then conversation.assign_attributes(muted_until: nil, muted_forever: false)
        when "forever" then conversation.assign_attributes(muted_until: nil, muted_forever: true)
        else conversation.assign_attributes(muted_until: muted_until, muted_forever: false)
        end
      end

      # A LID conversation turns out to be a phone we already know: fold the
      # two into one, keeping the phone-addressed row.
      def merge_conversations(lid:, phone:)
        by_lid = account.conversations.find_by(external_id: lid)
        by_phone = account.conversations.find_by(external_id: phone)

        if by_lid && by_phone
          by_lid.messages.update_all(conversation_id: by_phone.id)
          by_phone.update!(alt_external_id: lid, last_message_at: [ by_lid.last_message_at, by_phone.last_message_at ].compact.max)
          by_lid.destroy!
        elsif by_lid
          by_lid.update!(external_id: phone, alt_external_id: lid)
        elsif by_phone && by_phone.alt_external_id != lid
          by_phone.update!(alt_external_id: lid)
        end

        Message.joins(:conversation).where(messaging_conversations: { account_id: account.id }, sender_id: lid).update_all(sender_id: phone)
      end

      def merge_contacts(lid:, phone:)
        by_lid = account.contacts.find_by(external_id: lid)
        by_phone = account.contacts.find_by(external_id: phone)

        if by_lid && by_phone
          by_phone.update!({ alt_external_id: lid, name: by_phone.name.presence || by_lid.name, push_name: by_phone.push_name.presence || by_lid.push_name, avatar_url: by_phone.avatar_url.presence || by_lid.avatar_url }.compact)
          by_lid.destroy!
        elsif by_lid
          by_lid.update!(external_id: phone, alt_external_id: lid)
        elsif by_phone && by_phone.alt_external_id != lid
          by_phone.update!(alt_external_id: lid)
        end
      end

      def notify(conversation, message)
        return if conversation.muted? || conversation.archived

        sender = conversation.group? ? "#{message.sender_display_name} in #{conversation.display_name}" : conversation.display_name
        Notification.create!(
          title: sender,
          body: message.body.presence || "Sent #{describe_media(message)}",
          source: "messages.whatsapp.#{conversation.id}.#{message.id}"
        )
      rescue StandardError => e
        # A failed notification must not fail the import.
        Rails.logger.warn("[WhatsApp] notification for message=#{message.id} failed: #{e.class}: #{e.message}")
      end

      def describe_media(message)
        case message.kind
        when "imageMessage" then "a photo"
        when "videoMessage" then "a video"
        when "audioMessage" then "a voice message"
        when "documentMessage" then "a document"
        when "stickerMessage" then "a sticker"
        when "locationMessage", "liveLocationMessage" then "a location"
        when "contactMessage", "contactsArrayMessage" then "a contact"
        else "a message"
        end
      end
    end
  end
end
