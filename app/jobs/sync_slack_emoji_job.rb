class SyncSlackEmojiJob < ApplicationJob
  queue_as :default

  def perform
    Slack::CustomEmoji.sync!
  end
end
