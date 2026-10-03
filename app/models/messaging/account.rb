module Messaging
  # A linked messaging account. One row per provider; the provider's connector
  # keeps the session, this row keeps what the app needs to show about it.
  class Account < ApplicationRecord
    PROVIDERS = %w[whatsapp].freeze
    STATUSES = %w[disconnected connecting pairing open closed needs_relink].freeze

    has_many :contacts, inverse_of: :account, dependent: :destroy
    has_many :conversations, inverse_of: :account, dependent: :destroy

    validates :provider, presence: true, inclusion: { in: PROVIDERS }, uniqueness: true
    validates :status, inclusion: { in: STATUSES }

    def self.whatsapp
      find_or_create_by!(provider: "whatsapp")
    end

    def linked?
      status == "open"
    end
  end
end
