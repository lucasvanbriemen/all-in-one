module MusicConfig
  GROUPS = [
    {
      path: "songs",
      name: "Songs"
    },
    {
      path: "search",
      name: "Search"
    },
    {
      path: "stats",
      name: "Statistics"
    }
  ].freeze

  ALLOWED_PLATFORMS = ["web", "macOS", "iOS"].freeze
end
