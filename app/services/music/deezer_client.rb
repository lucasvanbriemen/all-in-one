require "net/http"

module Music
  class DeezerClient
    BASE_URL = "https://api.deezer.com"
    TIMEOUT_SECONDS = 5

    def track_details(isrc)
      request("/track/isrc:#{isrc}")
    end

    def album_details(id)
      request("/album/#{id}")
    end

    private

    def request(path)
      response = get(path)
      JSON.parse(response.body)
    end

    def get(path)
      uri = URI("#{BASE_URL}#{path}")

      Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: TIMEOUT_SECONDS, read_timeout: TIMEOUT_SECONDS) do |http|
        http.request(Net::HTTP::Get.new(uri))
      end
    end
  end
end
