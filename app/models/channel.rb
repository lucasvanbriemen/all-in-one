class Channel < ApplicationRecord
  has_many :messages

  scope :slack, -> { where(type: "Slack::Channel") }
  scope :joined, -> { where(is_member: true) }
  scope :active, -> { where(is_active: true) }

  FALL_BACK_NAME = "Unknown name"

  def last_message
    messages.top_level.order(created_at: :desc).first
  end

  def display_name
    name.presence || FALL_BACK_NAME
  end
end
