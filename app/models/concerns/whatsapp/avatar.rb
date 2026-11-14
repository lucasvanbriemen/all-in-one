require "net/http"

module Whatsapp
  # A profile picture belongs to whoever owns the jid: a person (contact) or a group (channel).
  module Avatar
    extend ActiveSupport::Concern

    AVATAR_TTL = 1.day
    AVATAR_DIR = Rails.root.join("storage", "whatsapp", "avatars")
    # Clients load pictures from a link of ours, since WhatsApp's own CDN links expire within days.
    PUBLIC_HOST = ENV.fetch("APP_URL", "https://aio.ltvb.nl")

    # The stored column keeps WhatsApp's raw CDN link; clients get our proxy route instead.
    def avatar_url
      return nil if id.end_with?("@newsletter")

      "#{PUBLIC_HOST}#{Rails.application.routes.url_helpers.whatsapp_avatar_path(jid: id)}"
    end

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

    # Downloads the picture once per CDN link and serves it from disk; the CDN forces downloads on direct navigation.
    def avatar_file
      url = refresh_avatar!
      return cached_avatar_file if url.blank?

      path = AVATAR_DIR.join("#{id.parameterize}-#{Digest::SHA1.hexdigest(url)[0, 12]}.jpg")
      return path if path.exist?

      uri = URI(url)
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https", open_timeout: 5, read_timeout: 10) { |http| http.get(uri.request_uri) }
      # An expired link still leaves the last downloaded copy, which beats showing nothing.
      return cached_avatar_file unless response.is_a?(Net::HTTPSuccess)

      FileUtils.mkdir_p(AVATAR_DIR)
      cached_avatar_files.each { |old| File.delete(old) }
      File.binwrite(path, response.body)
      path
    rescue Net::OpenTimeout, Net::ReadTimeout, SocketError, SystemCallError => e
      Rails.logger.warn("[whatsapp] avatar download failed for #{id}: #{e.message}")
      cached_avatar_file
    end

    private

    def cached_avatar_files
      Dir.glob(AVATAR_DIR.join("#{id.parameterize}-*.jpg"))
    end

    def cached_avatar_file
      cached_avatar_files.first&.then { |file| Pathname(file) }
    end

    def avatar_cache_key
      "whatsapp/avatar_checked/#{id}"
    end
  end
end
