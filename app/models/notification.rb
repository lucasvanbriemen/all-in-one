class Notification < ApplicationRecord
  scope :unread, -> { where(read: false) }

  after_create_commit -> { PushNotificationJob.perform_later(id) }
end
