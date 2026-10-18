class Channel < ApplicationRecord
  scope :slack, -> { where(type: "Slack::Channel") }
end
