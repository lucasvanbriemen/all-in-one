class MessageReaction < ApplicationRecord
  belongs_to :message
  belongs_to :contact

  def from_me
    contact&.is_me || false
  end

  # Slack stores reaction names, WhatsApp the emoji itself; the app always gets the emoji.
  def emoji
    message.is_a?(Slack::Message) ? Slack::Emoji.to_unicode(reaction) : reaction
  end

  # Custom Slack emoji (:party_parrot:) are images; the app shows this instead of the :name:.
  def emoji_url
    Slack::Emoji.url(reaction) if message.is_a?(Slack::Message)
  end
end
