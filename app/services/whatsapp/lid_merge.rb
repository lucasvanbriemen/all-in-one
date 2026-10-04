module Whatsapp
  # WhatsApp addresses a person by phone jid (…@s.whatsapp.net) or privacy id (…@lid). Events that arrive before the
  # connector knows the mapping are stored under the lid, which leaves a second chat for the same person. Once the
  # mapping is known, fold everything under the lid into the phone jid.
  class LidMerge
    def self.call(lid:, phone:) = new(lid, phone).call

    def initialize(lid, phone)
      @lid = lid
      @phone = phone
    end

    def call
      return if @lid.blank? || @phone.blank? || @lid == @phone

      Chat.transaction do
        merge_contacts
        merge_chats
        move_messages
        move_reactions
        Message.where(sender_jid: @lid).update_all(sender_jid: @phone)
        Reaction.where(sender_jid: @lid).update_all(sender_jid: @phone)
      end
    end

    # Resolves every stored lid for which a contact mapping is already known.
    def self.backfill
      Contact.where.not(lid: nil).where("jid NOT LIKE '%@lid'").pluck(:lid, :jid).each { |lid, phone| call(lid: lid, phone: phone) }
    end

    private

    def merge_contacts
      lid_contact = Contact.find_by(jid: @lid)
      phone_contact = Contact.find_by(jid: @phone)
      if lid_contact && phone_contact
        phone_contact.update!(
          lid: @lid,
          name: phone_contact.name.presence || lid_contact.name,
          push_name: phone_contact.push_name.presence || lid_contact.push_name,
          verified_name: phone_contact.verified_name.presence || lid_contact.verified_name,
          avatar_url: phone_contact.avatar_url.presence || lid_contact.avatar_url
        )
        lid_contact.destroy!
      elsif lid_contact
        lid_contact.update!(jid: @phone, lid: @lid)
      elsif phone_contact && phone_contact.lid != @lid
        phone_contact.update!(lid: @lid)
      end
    end

    def merge_chats
      lid_chat = Chat.find_by(jid: @lid)
      return unless lid_chat

      phone_chat = Chat.find_by(jid: @phone)
      if phone_chat
        phone_chat.update!(
          name: phone_chat.name.presence || lid_chat.name,
          unread_count: phone_chat.unread_count + lid_chat.unread_count,
          pinned: phone_chat.pinned || lid_chat.pinned,
          archived: phone_chat.archived && lid_chat.archived,
          last_message_at: [ phone_chat.last_message_at, lid_chat.last_message_at ].compact.max
        )
        lid_chat.destroy!
      else
        lid_chat.update!(jid: @phone)
      end
    end

    # A message replayed under both ids is the same message; keep the phone-jid copy.
    def move_messages
      existing = Message.where(chat_jid: @phone).pluck(:wa_id)
      Message.where(chat_jid: @lid, wa_id: existing).delete_all
      Message.where(chat_jid: @lid).update_all(chat_jid: @phone)
    end

    def move_reactions
      Reaction.where(chat_jid: @lid).find_each do |reaction|
        if Reaction.exists?(chat_jid: @phone, message_wa_id: reaction.message_wa_id, sender_jid: reaction.sender_jid)
          reaction.destroy!
        else
          reaction.update!(chat_jid: @phone)
        end
      end
    end
  end
end
