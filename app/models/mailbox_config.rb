module MailboxConfig
  GROUPS = [
    {
      path: "home",
      name: "Home",
      ios_icon: "house",
      rules: { exclude_from: %w[work github pathe] }
    },
    {
      path: "work",
      name: "Work",
      ios_icon: "suitcase",
      rules: {
        from: %w[*@webinargeek.com],
        to: %w[*@webinargeek.com]
      }
    },
    {
      path: "github",
      name: "GitHub",
      ios_icon: "chevron.left.forwardslash.chevron.right",
      rules: {
        from: %w[*@github.com *@notifications.github.com],
        sender_name: [ "github GUI" ]
      }
    },
    {
      path: "pathe",
      name: "Pathe",
      ios_icon: "popcorn",
      rules: { from: %w[*@service.pathe.nl] }
    }
  ].freeze

  def self.find(path)
    GROUPS.find { |group| group[:path] == path }
  end
end
