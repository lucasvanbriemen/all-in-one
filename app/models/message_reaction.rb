class MessageReaction < ApplicationRecord
  belongs_to :message
  belongs_to :contact

  def from_me
    contact&.is_me || false
  end
end
