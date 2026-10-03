module Messaging
  class Conversation < ApplicationRecord
    KINDS = %w[direct group].freeze

    belongs_to :account, inverse_of: :conversations
    has_many :messages, inverse_of: :conversation, dependent: :destroy

    attribute :participants, :json

    validates :external_id, presence: true, uniqueness: { scope: :account_id }
    validates :kind, inclusion: { in: KINDS }

    scope :visible, -> { where(archived: false) }
    scope :recent, -> { order(pinned: :desc, last_message_at: :desc) }

    def group?
      kind == "group"
    end

    def muted?
      muted_forever || (muted_until.present? && muted_until > Time.current)
    end

    # Direct chats carry no name of their own; it comes from the contact.
    def contact
      return nil if group?
      @contact ||= account.contacts.find_by(external_id: external_id) ||
        (alt_external_id.present? && account.contacts.find_by(alt_external_id: alt_external_id)) || nil
    end

    # Chat name, else the contact, else the push name of whoever last wrote,
    # else the phone number. A LID-only chat has no number to fall back on.
    def display_name
      name.presence || contact&.display_name || last_sender_name || external_id[/\A(\d+)@/, 1] || external_id
    end

    def last_sender_name
      messages.where(from_me: false).where.not(sender_name: [ nil, "" ]).order(sent_at: :desc).pick(:sender_name)
    end

    def display_avatar_url
      avatar_url.presence || contact&.avatar_url
    end

    def as_json(options = {})
      {
        id: id,
        external_id: external_id,
        kind: kind,
        name: display_name,
        avatar_url: display_avatar_url,
        unread_count: unread_count,
        archived: archived,
        pinned: pinned,
        muted: muted?,
        last_message_at: last_message_at,
        last_message: messages.order(sent_at: :desc).first&.as_json
      }.merge(options[:extra] || {})
    end
  end
end
