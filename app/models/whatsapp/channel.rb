module Whatsapp
  class Channel < ::Channel
    include Avatar

    attribute :is_private, default: true
    attribute :is_member, default: true

    # Contacts are keyed by phone jid; a chat still stored under a privacy id finds its contact through the lid column.
    def resolved_contact
      contact || (Contact.find_by(lid: id) if id.end_with?("@lid"))
    end

    def display_name
      return "You" if id == Connection.current.me_jid

      name.presence || resolved_contact&.display_name.presence || (id.end_with?("@lid") ? "Unknown contact" : "+#{id.split("@").first}")
    end

    def send_message(text, quote_id: nil, **)
      Bridge.send_text(to: id, text: text, quote: quote_for(quote_id))
    end

    def upload(file, text: nil, quote_id: nil, **)
      Bridge.send_media(to: id, data: file.read, mimetype: file.content_type, filename: file.original_filename, caption: text, quote: quote_for(quote_id))
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
