require "net/http"

module Music
  # Searches YouTube Music through the same JSON endpoint its web player
  # uses. It answers in well under a second and returns structured song
  # metadata (title, artists, album, duration, artwork) rather than raw video
  # titles, and the video id it returns is exactly what yt-dlp downloads.
  #
  # Undocumented endpoint, so the parsing is deliberately defensive: any
  # result that lacks the fields we need is dropped rather than raising.
  class YoutubeMusic
    SEARCH_URL = "https://music.youtube.com/youtubei/v1/search?prettyPrint=false"
    # Restricts the search to songs (no videos, albums, artists or playlists).
    SONGS_FILTER = "EgWKAQIIAWoKEAoQCRADEAQQBQ%3D%3D"
    CLIENT = { "clientName" => "WEB_REMIX", "clientVersion" => "1.20240101.01.00", "hl" => "en", "gl" => "NL" }.freeze
    TIMEOUT_SECONDS = 5
    ARTWORK_SIZE = 300

    def search(term)
      body = post(query: term, params: SONGS_FILTER)
      renderers(body).filter_map { |renderer| song(renderer) }.uniq { |song| song[:id] }
    rescue JSON::ParserError, Net::OpenTimeout, Net::ReadTimeout, SocketError, Errno::ECONNRESET => e
      Rails.logger.warn("[music] YouTube Music search failed: #{e.class}: #{e.message}")
      []
    end

    private

    def post(payload)
      uri = URI(SEARCH_URL)
      request = Net::HTTP::Post.new(uri)
      request["Content-Type"] = "application/json"
      request["Origin"] = "https://music.youtube.com"
      request["User-Agent"] = "Mozilla/5.0"
      request.body = JSON.generate(payload.merge(context: { client: CLIENT }))

      response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: TIMEOUT_SECONDS, read_timeout: TIMEOUT_SECONDS) do |http|
        http.request(request)
      end
      return {} unless response.is_a?(Net::HTTPOK)

      JSON.parse(response.body)
    end

    # Every song in the response is a musicResponsiveListItemRenderer, nested
    # at a depth that shifts between releases, so walk the whole tree.
    def renderers(node, found = [])
      case node
      when Hash
        found << node["musicResponsiveListItemRenderer"] if node["musicResponsiveListItemRenderer"]
        node.each_value { |value| renderers(value, found) }
      when Array
        node.each { |value| renderers(value, found) }
      end
      found
    end

    def song(renderer)
      id = renderer.dig("playlistItemData", "videoId")
      return nil if id.blank?

      columns = renderer["flexColumns"].to_a.map { |column| column.dig("musicResponsiveListItemFlexColumnRenderer", "text", "runs").to_a }
      title = text(columns[0])
      # Second column reads "Artist, Artist & Artist • Album • 3:45".
      details = columns[1].to_a
      artists = details.select { |run| page_type(run) == "MUSIC_PAGE_TYPE_ARTIST" }.map { |run| run["text"] }
      album = details.find { |run| page_type(run) == "MUSIC_PAGE_TYPE_ALBUM" }&.dig("text")
      duration = parse_duration(details.last&.dig("text"))
      return nil if title.blank? || artists.empty? || duration.nil?

      {
        id: id,
        title: title,
        artist: artists.join(", "),
        album: album.presence || title,
        image_url: artwork(renderer) || Song::PLACEHOLDER_IMAGE,
        duration: duration
      }
    end

    def text(runs)
      runs.to_a.map { |run| run["text"] }.join
    end

    def page_type(run)
      run.dig("navigationEndpoint", "browseEndpoint", "browseEndpointContextSupportedConfigs", "browseEndpointContextMusicConfig", "pageType")
    end

    def parse_duration(label)
      return nil unless label.to_s.match?(/\A(\d+:)?\d{1,2}:\d{2}\z/)

      label.split(":").map(&:to_i).reduce(0) { |total, part| total * 60 + part }
    end

    def artwork(renderer)
      thumbnails = renderer.dig("thumbnail", "musicThumbnailRenderer", "thumbnail", "thumbnails").to_a
      url = thumbnails.last&.dig("url")
      return nil if url.blank?

      # Google image URLs carry their size as a suffix; ask for a bigger one.
      url.sub(/=w\d+-h\d+.*\z/, "=w#{ARTWORK_SIZE}-h#{ARTWORK_SIZE}-l90-rj")
    end
  end
end
