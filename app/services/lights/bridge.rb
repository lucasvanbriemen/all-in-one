require "net/http"

module Lights
  class Bridge
    BASE_URL = "http://10.167.192.213:4003/" # ZeroTier IP to the raspberry pi running the lights bridge

    # Leave id out to change all lamps at once.
    def self.change(hex, brightness: 254, id: nil)
      # Send a post request to /change
      uri = URI.join(BASE_URL, "change")
      http = Net::HTTP.new(uri.host, uri.port)
      request = Net::HTTP::Post.new(uri.path, { "Content-Type" => "application/json" })
      request.body = { id: id, hex: hex, brightness: brightness }.compact.to_json
      http.request(request)
    end

    # Scenes are keyed by slug, the bridge by lamp id, so look up each light's id and change it separately.
    def self.apply_scene(scene)
      ids_by_slug = LightsConfig::LIGHTS_NAMES.to_h { |id, light| [ light[:slug], id ] }

      scene[:lights].map do |slug, settings|
        change(settings[:hex], brightness: settings[:brightness], id: ids_by_slug.fetch(slug.to_s))
      end
    end
  end
end
