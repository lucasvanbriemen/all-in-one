# Signals which chats changed; clients refetch them over the regular API.
class WhatsappChannel < ApplicationCable::Channel
  def subscribed
    stream_from "whatsapp"
  end
end
