class Message < ApplicationRecord
  belongs_to :channel
  belongs_to :contact
  belongs_to :thread, class_name: "Message", optional: true
  has_many :replies, class_name: "Message", foreign_key: :thread_id

  scope :top_level, -> { where(thread_id: nil) }

  def from_me?
    contact.is_me?
  end
end
