require "net/http"

module Music
  # Searches YouTube through the same JSON endpoint its web player uses. No
  # API key or quota, and the video id it returns is exactly what yt-dlp
  # downloads.
  #
  # Undocumented endpoint, so the parsing is deliberately defensive: any
  # result that lacks the fields we need is dropped rather than raising.
  class Youtube
    SEARCH_URL = "https://www.youtube.com/youtubei/v1/search?prettyPrint=false"
    # Restricts the search to videos (no channels, playlists or shorts).
    VIDEOS_FILTER = "EgIQAQ%3D%3D"
    CLIENT = { "clientName" => "WEB", "clientVersion" => "2.20240101.00.00", "hl" => "en", "gl" => "NL" }.freeze
    TIMEOUT_SECONDS = 5
    # Auto-generated artist channels are named "<Artist> - Topic".
    TOPIC_SUFFIX = / - Topic\z/

    def search(term)
      body = post(query: term, params: VIDEOS_FILTER)
      renderers(body).filter_map { |renderer| song(renderer) }.uniq { |song| song[:id] }
    rescue JSON::ParserError, Net::OpenTimeout, Net::ReadTimeout, SocketError, Errno::ECONNRESET => e
      Rails.logger.warn("[music] YouTube search failed: #{e.class}: #{e.message}")
      []
    end

    private

    def post(payload)
      uri = URI(SEARCH_URL)
      request = Net::HTTP::Post.new(uri)
      request["Content-Type"] = "application/json"
      request["Origin"] = "https://www.youtube.com"
      request["User-Agent"] = "Mozilla/5.0"
      request.body = JSON.generate(payload.merge(context: { client: CLIENT }))

      response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: TIMEOUT_SECONDS, read_timeout: TIMEOUT_SECONDS) do |http|
        http.request(request)
      end
      return {} unless response.is_a?(Net::HTTPOK)

      JSON.parse(response.body)
    end

    # Every video in the response is a videoRenderer, nested at a depth that
    # shifts between releases, so walk the whole tree.
    def renderers(node, found = [])
      case node
      when Hash
        found << node["videoRenderer"] if node["videoRenderer"]
        node.each_value { |value| renderers(value, found) }
      when Array
        node.each { |value| renderers(value, found) }
      end
      found
    end

    def song(renderer)
      id = renderer["videoId"]
      return nil if id.blank?

      title = text(renderer.dig("title", "runs"))
      artist = text(renderer.dig("ownerText", "runs")).sub(TOPIC_SUFFIX, "")
      duration = parse_duration(renderer.dig("lengthText", "simpleText"))
      return nil if title.blank? || artist.blank? || duration.nil?

      {
        id: id,
        title: title,
        artist: artist,
        album: title,
        image_url: "https://i.ytimg.com/vi/#{id}/hqdefault.jpg",
        duration: duration
      }
    end

    def text(runs)
      runs.to_a.map { |run| run["text"] }.join
    end

    def parse_duration(label)
      return nil unless label.to_s.match?(/\A(\d+:)?\d{1,2}:\d{2}\z/)

      label.split(":").map(&:to_i).reduce(0) { |total, part| total * 60 + part }
    end
  end
end
