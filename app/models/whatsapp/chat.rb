module Whatsapp
  class Chat < ApplicationRecord
    self.table_name = "whatsapp_chats"

    # MariaDB exposes json columns as longtext, so Rails would otherwise store Ruby inspect output.
    attribute :participants, :json

    has_many :messages, class_name: "Whatsapp::Message", primary_key: :jid, foreign_key: :chat_jid
    has_one :contact, class_name: "Whatsapp::Contact", primary_key: :jid, foreign_key: :jid

    scope :visible, -> { where(archived: false) }
    scope :recent, -> { order(pinned: :desc, last_message_at: :desc) }

    def display_name
      name.presence || contact&.display_name || jid.split("@").first
    end

    AVATAR_TTL = 1.day

    # Profile pictures are fetched lazily from the connector and refreshed daily; WhatsApp's CDN links expire.
    def avatar_url
      self[:avatar_url].presence || contact&.avatar_url
    end

    def refresh_avatar!
      return avatar_url if avatar_checked_at && avatar_checked_at > AVATAR_TTL.ago

      url = Bridge.avatar(jid)["url"]
      update_columns(avatar_url: url, avatar_checked_at: Time.current)
      url
    rescue Bridge::Error => e
      Rails.logger.warn("[whatsapp] avatar lookup failed for #{jid}: #{e.message}")
      avatar_url
    end

    def last_message
      messages.order(sent_at: :desc).first
    end
  end
end
