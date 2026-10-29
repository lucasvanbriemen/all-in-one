module Whatsapp
  class Message < ::Message
    # The key WhatsApp needs (who sent the target) comes from our copy of the message, not the client.
    def react!(emoji)
      Bridge.react(chat: channel_id, message_id: id, emoji: emoji, from_me: from_me, participant: (contact_id if channel.is_group_chat && !from_me))
    end
  end
end
