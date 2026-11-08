class Notification < ApplicationRecord
  scope :unread, -> { where(read: false) }

  after_create_commit -> { PushNotificationJob.perform_later(id) }

  def source_top_level
    self[:source].to_s.split(".").first
  end
end
