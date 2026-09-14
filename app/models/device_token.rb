class DeviceToken < ApplicationRecord
  DEFAULT_TOPIC = "nl.ltvb.aio"


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
end
