module CalendarConfig
  GROUPS = [
    {
      path: "month",
      name: "Month"
    },
    {
      path: "agenda",
      name: "Agenda"
    }
  ].freeze

  ALLOWED_PLATFORMS = ["web", "macOS", "iOS"].freeze
end
