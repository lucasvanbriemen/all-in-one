module HomepageConfig
  GROUPS = [
    {
      path: "home",
      name: "Home",
      send_notifications: true,
      rules: { exclude_from: %w[work github pathe] }
    },
    {
      path: "work",
      name: "Work",
      send_notifications: true,
      rules: {
        from: %w[*@webinargeek.com],
        to: %w[*@webinargeek.com]
      }
    },
    {
      path: "github",
      name: "GitHub",
      send_notifications: false,
      rules: {
        from: %w[*@github.com *@notifications.github.com],
        sender_name: [ "github GUI" ]
      }
    },
    {
      path: "pathe",
      name: "Pathe",
      send_notifications: true,
      rules: { from: %w[*@service.pathe.nl] }
    }
  ].freeze
end
