class Message < ApplicationRecord
  belongs_to :channel
  belongs_to :contact
  belongs_to :thread, class_name: "Message", optional: true
  has_many :replies, class_name: "Message", foreign_key: :thread_id
  has_many :file_uploads
  has_many :reactions, class_name: "MessageReaction", dependent: :delete_all

  scope :top_level, -> { where(thread_id: nil) }

  def from_me
    contact.is_me
  end
end
