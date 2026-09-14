class Notification < ApplicationRecord
  scope :unread, -> { where(read: false) }

  # Every notification is pushed to all registered devices. Runs after commit
  # so the job never races the insert.
  after_create_commit -> { PushNotificationJob.perform_later(id) }
end
