module LightsConfig
  GROUPS = [
    {
      path: "lights",
      name: "Lights"
    }
  ].freeze

  ALLOWED_PLATFORMS = [ "web", "macOS", "iOS" ].freeze

  ROOMS = {
    "bedroom" => {
      name: "Bedroom",
      slug: "bedroom",
      lights: [ "bed" ]
    },
    "living-room" => {
      name: "Living Room",
      slug: "living-room",
      lights: [ "living-room" ]
    }
  }.freeze

  LIGHTS_NAMES = {
    "1-1" => {
      name: "Bedroom Light",
      slug: "bed"
    },
    "2-1" => {
      name: "Living Room Light",
      slug: "living-room"
    }
  }.freeze
end
