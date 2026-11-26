class DeviceToken < ApplicationRecord
  DEFAULT_TOPIC = "nl.ltvb.aio"
  ENVIRONMENTS = %w[production development].freeze

  # The Mac app sends a heartbeat about every 45s while the computer is in use
  # (not idle or locked). Allowing two missed beats keeps a brief network
  # hiccup from sending a push to the phone.
  ACTIVE_WINDOW = 2.minutes

  scope :desktop, -> { where(platform: "macos") }
  scope :active, -> { where(last_active_at: ACTIVE_WINDOW.ago..) }

  # Who gets a push: only the Macs in active use, or every device when nobody
  # is at a computer.
  def self.recipients
    active_desktops = desktop.active.to_a
    active_desktops.any? ? active_desktops : all.to_a
  end

  # The app re-posts on every launch (tokens can change), so registering is an
  # upsert on the token.
  def self.register(token:, platform:, topic: nil, environment: nil)
    record = find_or_initialize_by(token: token)
    record.platform = platform
    record.topic = topic.presence || record.topic.presence || DEFAULT_TOPIC
    record.environment = environment.presence || record.environment.presence || "production"
    record.save!
    record
  end

  def development? = environment == "development"

  def other_environment = development? ? "production" : "development"
end
