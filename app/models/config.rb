module Config
  CONFIG = {
    email: [
      {
        path: "home",
        name: "Home",
        rules: { exclude_from: %w[work github pathe] }
      },
      {
        path: "work",
        name: "Work",
        rules: {
          from: %w[*@webinargeek.com],
          to: %w[*@webinargeek.com]
        }
      },
      {
        path: "github",
        name: "GitHub",
        rules: {
          from: %w[*@github.com *@notifications.github.com],
          sender_name: [ "github GUI" ]
        }
      },
      {
        path: "pathe",
        name: "Pathe",
        rules: { from: %w[*@service.pathe.nl] }
      }
    ]
  }.freeze
end
