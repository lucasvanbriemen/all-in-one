class Message < ApplicationRecord
  belongs_to :channel
  belongs_to :contact
  belongs_to :thread, class_name: "Message", optional: true
  belongs_to :quoted_message, class_name: "Message", optional: true
  has_many :replies, class_name: "Message", foreign_key: :thread_id
  has_many :file_uploads, dependent: :destroy
  has_many :reactions, class_name: "MessageReaction", dependent: :delete_all

  scope :top_level, -> { where(thread_id: nil) }
  scope :replies, ->(message_id) { where(thread_id: message_id) }

  def from_me
    contact.is_me
  end

  def reply_count
    replies.size
  end

  # Stands in for the body in chat lists when a message is only a file.
  def preview
    return body if body.present?

    case file_uploads.first&.mimetype.to_s
    when /\Aimage\// then "Photo"
    when /\Avideo\// then "Video"
    when /\Aaudio\// then "Audio"
    when "" then nil
    else "File"
    end
  end
end
