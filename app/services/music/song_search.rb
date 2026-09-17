require "net/http"

module Music
  # iTunes is forgiving about what you type (a half-remembered lyric finds the
  # song), Deezer is not. So search iTunes, then ask Deezer for the ISRC the
  # player streams by.
  class SongSearch
    ITUNES_URL = "https://itunes.apple.com/search"
    TIMEOUT_SECONDS = 5
    LIMIT = 20
    # Deezer returns several editions of a song; take the one whose length
    # matches iTunes, falling back to Deezer's first hit.
    DURATION_TOLERANCE_SECONDS = 5

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

      expected = hit["trackTimeMillis"].to_f / 1000
      track = candidates.find { |t| (t["duration"].to_f - expected).abs <= DURATION_TOLERANCE_SECONDS } || candidates.first

      # existing song?
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
  end
end
