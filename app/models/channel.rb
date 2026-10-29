class Channel < ApplicationRecord
  has_many :messages
  belongs_to :contact, optional: true

  scope :slack, -> { where(type: "Slack::Channel") }
  scope :whatsapp, -> { where(type: "Whatsapp::Channel") }
  scope :joined, -> { where(is_member: true) }
  scope :active, -> { where(is_active: true) }
  scope :recently_active, -> { order(Arel.sql("(SELECT MAX(messages.created_at) FROM messages WHERE messages.channel_id = channels.id) DESC")) }

  FALL_BACK_NAME = "Unknown name"

  def last_message
    return @last_message if defined?(@last_message)

    @last_message = messages.top_level.order(created_at: :desc).first
  end

  def last_message_preview
    last_message&.preview
  end

  def display_name
    name.presence || FALL_BACK_NAME
  end
end
