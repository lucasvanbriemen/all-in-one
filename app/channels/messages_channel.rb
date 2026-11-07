# Signals which chats changed; clients refetch them over the regular API.
class MessagesChannel < ApplicationCable::Channel
  STREAM = "messages".freeze

  def subscribed
    stream_from STREAM
  end

  def self.chat_changed(channel_id, platform:)
    ActionCable.server.broadcast(STREAM, { type: "chat_changed", channel_id: channel_id, platform: platform })
  end
end
