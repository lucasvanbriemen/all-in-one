require "net/http"

module Music
  # iTunes is forgiving about what you type (a half-remembered lyric finds the
  # song), Deezer is not. So search iTunes, then ask Deezer for the ISRC the
  # player streams by.
  class SongSearch
    ITUNES_URL = "https://itunes.apple.com/search"
    TIMEOUT_SECONDS = 5
    LIMIT = 20
    # Deezer returns several editions of a song (live, remaster, single edit).
    # Prefer the ones whose title matches iTunes', then the one closest in
    # length. Deezer's first hit is often a live version, so never trust order.
    MAX_DURATION_DIFFERENCE_SECONDS = 30

    def search(term)
      hits = itunes(term)
      resolved = hits.map { |hit| Thread.new { resolve(hit) } }.map(&:value).compact
      resolved.uniq { |song| song[:isrc] }
    end

    private

    def itunes(term)
      uri = URI(ITUNES_URL)
      uri.query = URI.encode_www_form(term: term, entity: "song", country: "NL", limit: LIMIT)
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: TIMEOUT_SECONDS, read_timeout: TIMEOUT_SECONDS) do |http|
        http.request(Net::HTTP::Get.new(uri))
      end
      return [] unless response.is_a?(Net::HTTPOK)

      JSON.parse(response.body)["results"] || []
    end

    def resolve(hit)
      title, artist = hit["trackName"], hit["artistName"]
      candidates = DeezerClient.new.search_tracks("#{artist} #{title}", limit: 5).select { |t| t["isrc"].present? }
      return nil if candidates.empty?

      track = best_match(hit, candidates)
      return nil unless track

      existing = Song.find_by(isrc: track["isrc"])

      {
        isrc: track["isrc"],
        title: title,
        artist: artist,
        album: hit["collectionName"],
        image_url: hit["artworkUrl100"] || Song::PLACEHOLDER_IMAGE,
        duration: track["duration"],
        is_liked: existing&.is_liked || false
      }
    end

    def best_match(hit, candidates)
      expected = hit["trackTimeMillis"].to_f / 1000
      same_title = candidates.select { |t| normalize(t["title"]) == normalize(hit["trackName"]) }
      pool = same_title.presence || candidates
      closest = pool.min_by { |t| (t["duration"].to_f - expected).abs }
      return closest if same_title.any? || (closest["duration"].to_f - expected).abs <= MAX_DURATION_DIFFERENCE_SECONDS

      nil
    end

    def normalize(title)
      title.to_s.downcase.gsub(/[^a-z0-9]/, "")
    end
  end
end
