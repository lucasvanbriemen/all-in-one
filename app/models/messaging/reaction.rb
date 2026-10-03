module Messaging
  class Reaction < ApplicationRecord
    belongs_to :message, inverse_of: :reactions

    validates :sender_id, :emoji, presence: true
    validates :sender_id, uniqueness: { scope: :message_id }
  end
end
