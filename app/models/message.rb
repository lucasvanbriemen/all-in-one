class Message < ApplicationRecord
  belongs_to :channel
  belongs_to :contact
end
