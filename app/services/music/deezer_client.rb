require "net/http"

module Music
  # Minimal Deezer public API client: only what SongDownloader needs to look up a
  # track by ISRC (title, artist, duration, cover).
  class DeezerClient
    BASE_URL = "https://api.deezer.com"
    TIMEOUT_SECONDS = 5

    class Error < StandardError; end

    class << self
      def track_details(isrc)
        request("/track/isrc:#{isrc}")
      end

      def album_details(id)
        request("/album/#{id}")
      end

      private

      def request(path)
        response = get(path)
        raise Error, "Failed to fetch data from Deezer API" unless response.is_a?(Net::HTTPOK)

        payload = JSON.parse(response.body)
        # Deezer answers an unknown ISRC with HTTP 200 and an error body.
        raise Error, payload.dig("error", "message") || "Deezer error" if payload.is_a?(Hash) && payload.key?("error")

        payload
      end

      def get(path)
        uri = URI("#{BASE_URL}#{path}")

        Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: TIMEOUT_SECONDS, read_timeout: TIMEOUT_SECONDS) do |http|
          http.request(Net::HTTP::Get.new(uri))
        end
      rescue StandardError
        nil
      end
    end
  end
end
