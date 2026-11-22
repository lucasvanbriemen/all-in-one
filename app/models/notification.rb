class Notification < ApplicationRecord
  scope :unread, -> { where(read: false) }
  # Silent ones (from muted chats) still mark the chat unread, but send no push and stay off the home screen.
  scope :audible, -> { where(silent: false) }

  after_create_commit -> { PushNotificationJob.perform_later(id) unless silent }

  def source_top_level
    self[:source].to_s.split(".").first
  end
end
