module LightsConfig
  GROUPS = [
    {
      path: "lights",
      name: "Lights"
    }
  ].freeze

  # ALLOWED_PLATFORMS = [ "web", "macOS", "iOS" ].freeze
  ALLOWED_PLATFORMS = [].freeze

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

  SCENES = [
    {
      name: "Relax",
      lights: {
        "living-room": {
          hex: "#18FF08",
          brightness: 100
        },
        "bed": {
          hex: "#FFAA00",
          brightness: 80
        }
      }
    },
    {
      name: "Focus",
      lights: {
        "living-room": {
          hex: "#00AAFF",
          brightness: 90
        },
        "bed": {
          hex: "#FF5500",
          brightness: 70
        }
      }
    }
  ]
end
