require "net/http"

module Lights
  class Bridge
    BASE_URL = "http://10.167.192.213:4003/" # ZeroTier IP to the raspberry pi running the lights bridge

    def self.change(hex, brightness: 254)
      # Send a post request to /change
      uri = URI.join(BASE_URL, "change")
      http = Net::HTTP.new(uri.host, uri.port)
      request = Net::HTTP::Post.new(uri.path, { "Content-Type" => "application/json" })
      request.body = { hex_color: hex, brightness: brightness }.to_json
      http.request(request)
    end
  end
end
