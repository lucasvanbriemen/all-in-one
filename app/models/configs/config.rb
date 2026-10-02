module Config
  CONFIG = {
    home: HomepageConfig::GROUPS,
    code: CodeConfig::GROUPS,
    email: MailboxConfig::GROUPS,
    music: MusicConfig::GROUPS,
    money: MoneyConfig::GROUPS
  }.freeze

  ALLOWED_PLATFORMS = {
    home: HomepageConfig::ALLOWED_PLATFORMS,
    code: CodeConfig::ALLOWED_PLATFORMS,
    email: MailboxConfig::ALLOWED_PLATFORMS,
    music: MusicConfig::ALLOWED_PLATFORMS,
    money: MoneyConfig::ALLOWED_PLATFORMS
  }.freeze
end
