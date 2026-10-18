class Channel < ApplicationRecord
  scope :slack, -> { where(type: "Slack::Channel") }
  scope :joined, -> { where(is_member: true) }
end
