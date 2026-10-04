require "net/http"

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
      name.presence || contact&.display_name || (jid.end_with?("@lid") ? "Unknown contact" : jid.split("@").first)
    end

    AVATAR_TTL = 1.day
    AVATAR_DIR = Rails.root.join("storage", "whatsapp", "avatars")

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

    # Downloads the picture once per URL and serves it from disk; the CDN forces downloads on direct navigation.
    def avatar_file
      url = refresh_avatar!
      return nil if url.blank?

      path = AVATAR_DIR.join("#{jid.parameterize}-#{Digest::SHA1.hexdigest(url)[0, 12]}.jpg")
      unless path.exist?
        response = Net::HTTP.get_response(URI(url))
        return nil unless response.is_a?(Net::HTTPSuccess)

        FileUtils.mkdir_p(path.dirname)
        Dir.glob(AVATAR_DIR.join("#{jid.parameterize}-*.jpg")).each { |old| File.delete(old) }
        File.binwrite(path, response.body)
      end
      path
    end

    def last_message
      messages.order(sent_at: :desc).first
    end
  end
end
