module MessagesConfig
  GROUPS = [
    {
      path: "whatsapp",
      name: "WhatsApp"
    },
    {
      path: "slack",
      name: "Slack"
    }
  ].freeze

  ALLOWED_PLATFORMS = [ "web", "macOS", "iOS" ].freeze
end
