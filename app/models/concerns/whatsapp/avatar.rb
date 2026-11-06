module Whatsapp
  # A profile picture belongs to whoever owns the jid: a person (contact) or a group (channel).
  module Avatar
    extend ActiveSupport::Concern

    AVATAR_TTL = 1.day

    # Profile pictures are looked up at most once a day: WhatsApp's CDN links expire, and many people have none.
    def refresh_avatar!
      # WhatsApp never answers picture queries for channels, so asking only ties up a request until it times out.
      return nil if id.end_with?("@newsletter")
      return self[:avatar_url] if Rails.cache.exist?(avatar_cache_key)

      url = Bridge.avatar(id)["url"]
      update_columns(avatar_url: url)
      Rails.cache.write(avatar_cache_key, true, expires_in: AVATAR_TTL)
      url
    rescue Bridge::Error => e
      Rails.logger.warn("[whatsapp] avatar lookup failed for #{id}: #{e.message}")
      self[:avatar_url]
    end

    # WhatsApp only says a picture changed, not what it is, so the next lookup has to ask again.
    def forget_avatar_check!
      Rails.cache.delete(avatar_cache_key)
    end

    private

    def avatar_cache_key
      "whatsapp/avatar_checked/#{id}"
    end
  end
end
