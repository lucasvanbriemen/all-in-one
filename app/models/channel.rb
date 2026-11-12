class Channel < ApplicationRecord
  has_many :messages
  belongs_to :contact, optional: true

  scope :slack, -> { where(type: "Slack::Channel") }
  scope :whatsapp, -> { where(type: "Whatsapp::Channel") }
  scope :joined, -> { where(is_member: true) }
  scope :active, -> { where(is_active: true) }
  # An archived Slack channel is dead, but an archived WhatsApp chat is just tucked away and still in use.
  scope :listed, -> { active.or(whatsapp) }

  FALL_BACK_NAME = "Unknown name"

  attr_writer :last_message

  # Everything the chat list renders, loaded in a fixed number of queries
  # however many channels there are, instead of a few per channel.
  def self.preload_for_listing(channels)
    preload_last_messages(channels)
    Whatsapp::Channel.preload_resolved_contacts(channels.grep(Whatsapp::Channel))
    channels
  end

  # Each channel's newest top-level message (with its files, for the preview)
  # in one query: the newest timestamp per channel, joined back to its row.
  def self.preload_last_messages(channels)
    return channels if channels.empty?

    newest = Message.top_level.where(channel_id: channels.map(&:id))
      .group(:channel_id).select("channel_id, MAX(created_at) AS newest_at")
    messages = Message.top_level.includes(:file_uploads)
      .joins("INNER JOIN (#{newest.to_sql}) newest ON newest.channel_id = messages.channel_id AND newest.newest_at = messages.created_at")
      .group_by(&:channel_id)

    channels.each { |channel| channel.last_message = messages[channel.id]&.first }
  end

  def last_message
    return @last_message if defined?(@last_message)

    @last_message = messages.top_level.order(created_at: :desc).first
  end

  def last_message_preview
    last_message&.preview
  end

  def unread_count
    Notification.unread.where("source LIKE ?", "messages.%.#{id}").count
  end

  # A DM shows the other person's picture; group chats and channels have no contact and carry their own.
  def avatar_url
    avatar_contact&.avatar_url.presence || self[:avatar_url]
  end

  def avatar_contact = contact

  # Reading a chat also dismisses the notifications it raised. They're cleared
  # before the platform read receipt so a failing bridge doesn't leave them behind.
  def mark_read!
    Notification.unread.where("source LIKE ?", "messages.%.#{id}").update_all(read: true)
    marked_as_read
  end

  def display_name
    name.presence || FALL_BACK_NAME
  end
end
