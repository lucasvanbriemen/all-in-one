module Whatsapp
  class Message < ApplicationRecord
    self.table_name = "whatsapp_messages"

    PER_PAGE = 50

    belongs_to :chat, class_name: "Whatsapp::Chat", primary_key: :jid, foreign_key: :chat_jid, optional: true
    belongs_to :sender, class_name: "Whatsapp::Contact", primary_key: :jid, foreign_key: :sender_jid, optional: true
    has_many :reactions, ->(message) { where(chat_jid: message.chat_jid) },
             class_name: "Whatsapp::Reaction", primary_key: :wa_id, foreign_key: :message_wa_id

    scope :active, -> { where(deleted_at: nil) }
    scope :newest_first, -> { order(sent_at: :desc, id: :desc) }

    def deleted?
      deleted_at.present?
    end

    def display_sender_name
      return "You" if from_me
      sender&.display_name || sender_name.presence || sender_jid.to_s.split("@").first
    end
  end
end
