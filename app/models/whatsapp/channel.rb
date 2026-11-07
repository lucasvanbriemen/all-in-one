module Whatsapp
  class Channel < ::Channel
    include Avatar

    attribute :is_private, default: true
    attribute :is_member, default: true

    attr_writer :resolved_contact

    # Batch version of #resolved_contact for a list of chats: one query for all lid lookups.
    def self.preload_resolved_contacts(channels)
      by_lid = channels.select { |channel| channel.contact.nil? && channel.id.end_with?("@lid") }
      found = Contact.where(lid: by_lid.map(&:id)).index_by(&:lid)
      by_lid.each { |channel| channel.resolved_contact = found[channel.id] }
    end

    # Contacts are keyed by phone jid; a chat still stored under a privacy id finds its contact through the lid column.
    def resolved_contact
      return @resolved_contact if defined?(@resolved_contact)

      @resolved_contact = contact || (Contact.find_by(lid: id) if id.end_with?("@lid"))
    end

    def display_name
      return "You" if id == Connection.me_jid

      name.presence || resolved_contact&.display_name.presence || (id.end_with?("@lid") ? "Unknown contact" : "+#{id.split("@").first}")
    end

    def send_message(text, quote_id: nil, **)
      Bridge.send_text(to: id, text: text, quote: quote_for(quote_id))
    end

    def upload(file, text: nil, quote_id: nil, **)
      Bridge.send_media(to: id, data: file.read, mimetype: file.content_type, filename: file.original_filename, caption: text, quote: quote_for(quote_id))
    end

    # WhatsApp keeps one reaction per person, so a new emoji replaces the old one and nil takes it back.
    # The echo from the connector lands on the same row, so storing it here just skips the wait.
    def react(message, emoji)
      Bridge.react(chat: id, id: message.id, from_me: message.from_me, participant: (message.contact_id if is_group_chat && !message.from_me), emoji: emoji)

      me = Connection.current.me_jid
      mine = message.reactions.where(contact_id: me)
      return mine.delete_all if emoji.blank?

      Contact.find_or_create_by!(id: me)
      mine.first_or_initialize.update!(reaction: emoji)
    end

    def unreact(message, _emoji)
      react(message, nil)
    end

    # WhatsApp marks a chat read through receipts for its incoming messages; the latest few cover everything before them.
    def marked_as_read
      incoming = messages.where.not(contact_id: Connection.current.me_jid).order(created_at: :desc).limit(20)
      return if incoming.empty?

      Bridge.read(chat: id, messages: incoming.map { |message| { id: message.id, participant: (message.contact_id if is_group_chat) } })
    end

    # Groups have their own picture; a one-on-one chat shows the other person's, which lives on their contact.
    def avatar_contact = resolved_contact

    private

    # Replies carry who wrote the quoted message and its text, so recipients see the right preview.
    def quote_for(message_id)
      return nil if message_id.blank?

      quoted = messages.find_by(id: message_id)
      return { id: message_id } unless quoted

      { id: quoted.id, from_me: quoted.from_me, participant: (quoted.contact_id if is_group_chat && !quoted.from_me), body: quoted.body }
    end
  end
end
