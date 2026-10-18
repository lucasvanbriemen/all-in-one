class Channel < ApplicationRecord
  scope :slack, -> { where(type: "Slack::Channel") }
  scope :joined, -> { where(is_member: true) }
  scope :active, -> { where(is_active: true) }

  FALL_BACK_NAME = "Unknown name"

  def display_name
    name.presence || FALL_BACK_NAME
  end
end
