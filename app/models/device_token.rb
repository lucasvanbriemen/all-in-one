# An APNs device token registered by one install of the iOS or macOS app.
# The same token is re-posted on every launch, so registration is an upsert
# that just bumps updated_at; tokens APNs reports as gone are deleted by
# PushNotificationJob.
class DeviceToken < ApplicationRecord
  PLATFORMS = %w[ios macos].freeze

  validates :token, presence: true, uniqueness: true
  validates :platform, inclusion: { in: PLATFORMS }

  def self.register(token:, platform:)
    record = find_or_initialize_by(token: token)
    record.platform = platform
    record.updated_at = Time.current if record.persisted?
    record.save!
    record
  end
end
