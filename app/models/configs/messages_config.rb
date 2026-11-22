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

  # Slack channels (by name, without the #) that only turn unread: no push and no card on the home screen.
  # A message that pings me still notifies as usual.
  MUTED_SLACK_CHANNELS = [
    "frontend",
    "development"
  ].freeze
end
