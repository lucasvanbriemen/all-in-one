class Notification < ApplicationRecord
  scope :unread, -> { where(read: false) }
end
