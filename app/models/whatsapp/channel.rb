require "net/http"

module Whatsapp
  class Channel < ::Channel
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

    def mark_read!
      unread = messages.where.not(contact_id: Connection.current.my_jids).order(created_at: :desc).limit(20)
      Bridge.mark_read(chat: id, messages: unread.map { |m| { id: m.id, participant: (m.contact_id if is_group_chat) }.compact }) if unread.any?
      Notification.where(source: "messages.whatsapp.#{id}").update_all(read: true)
    end

    AVATAR_TTL = 1.day
    AVATAR_DIR = Rails.root.join("storage", "whatsapp", "avatars")

    def avatar_url
      self[:avatar_url].presence || resolved_contact&.avatar_url
    end

    # Profile pictures are looked up at most once a day: WhatsApp's CDN links expire, and many people have none.
    def refresh_avatar!
      # WhatsApp never answers picture queries for channels, so asking only ties up a request until it times out.
      return nil if id.end_with?("@newsletter")
      return avatar_url if Rails.cache.exist?(avatar_cache_key)

      url = Bridge.avatar(id)["url"]
      update_columns(avatar_url: url)
      Rails.cache.write(avatar_cache_key, true, expires_in: AVATAR_TTL)
      url
    rescue Bridge::Error => e
      Rails.logger.warn("[whatsapp] avatar lookup failed for #{id}: #{e.message}")
      avatar_url
    end

    # Downloads the picture once per URL and serves it from disk; the CDN forces downloads on direct navigation.
    def avatar_file
      url = refresh_avatar!
      return nil if url.blank?

      path = AVATAR_DIR.join("#{id.parameterize}-#{Digest::SHA1.hexdigest(url)[0, 12]}.jpg")
      unless path.exist?
        uri = URI(url)
        response = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https", open_timeout: 5, read_timeout: 10) { |http| http.get(uri.request_uri) }
        return nil unless response.is_a?(Net::HTTPSuccess)

        FileUtils.mkdir_p(path.dirname)
        Dir.glob(AVATAR_DIR.join("#{id.parameterize}-*.jpg")).each { |old| File.delete(old) }
        File.binwrite(path, response.body)
      end
      path
    end

    private

    def avatar_cache_key
      "whatsapp/avatar_checked/#{id}"
    end

    # Replies carry who wrote the quoted message and its text, so recipients see the right preview.
    def quote_for(message_id)
      return nil if message_id.blank?

      quoted = messages.find_by(id: message_id)
      return { id: message_id } unless quoted

      { id: quoted.id, from_me: quoted.from_me, participant: (quoted.contact_id if is_group_chat && !quoted.from_me), body: quoted.body }
    end
  end
end
