module Whatsapp
  class Chat < ApplicationRecord
    self.table_name = "whatsapp_chats"

    has_many :messages, class_name: "Whatsapp::Message", primary_key: :jid, foreign_key: :chat_jid
    has_one :contact, class_name: "Whatsapp::Contact", primary_key: :jid, foreign_key: :jid

    scope :visible, -> { where(archived: false) }
    scope :recent, -> { order(pinned: :desc, last_message_at: :desc) }

    def display_name
      name.presence || contact&.display_name || jid.split("@").first
    end

    def avatar_url
      contact&.avatar_url
    end

    def last_message
      messages.order(sent_at: :desc).first
    end
  end
end
