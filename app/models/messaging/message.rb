module Messaging
  class Message < ApplicationRecord
    STATUSES = { 0 => "error", 1 => "pending", 2 => "sent", 3 => "delivered", 4 => "read", 5 => "played" }.freeze
    # Kinds that have no text body and should not count as "a message from someone".
    SYSTEM_KINDS = %w[protocolMessage senderKeyDistributionMessage].freeze

    belongs_to :conversation, inverse_of: :messages
    has_many :reactions, inverse_of: :message, dependent: :destroy

    attribute :media, :json
    attribute :mentions, :json

    validates :external_id, presence: true, uniqueness: { scope: :conversation_id }
    validates :sent_at, presence: true

    scope :chronological, -> { order(sent_at: :asc, id: :asc) }
    scope :present, -> { where(deleted_at: nil) }

    def deleted?
      deleted_at.present?
    end

    def status_name
      STATUSES[status]
    end

    def sender_display_name
      return "You" if from_me
      sender_name.presence || conversation.account.contacts.find_by(external_id: sender_id)&.display_name || sender_id&.[](/\A(\d+)@/, 1)
    end

    def as_json(_options = {})
      {
        id: id,
        external_id: external_id,
        sender_id: sender_id,
        sender_name: sender_display_name,
        from_me: from_me,
        kind: kind,
        body: deleted? ? nil : body,
        media: deleted? ? nil : media,
        quoted_external_id: quoted_external_id,
        mentions: mentions,
        status: status_name,
        sent_at: sent_at,
        edited_at: edited_at,
        deleted: deleted?,
        reactions: reactions.map { |r| { sender_id: r.sender_id, emoji: r.emoji } }
      }
    end
  end
end
