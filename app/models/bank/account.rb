module Bank
  class Account < ApplicationRecord
    belongs_to :connection, foreign_key: :bank_connection_id, inverse_of: :accounts
    has_many :transactions, foreign_key: :bank_account_id, inverse_of: :account, dependent: :destroy

    validates :uid, :iban, :currency, presence: true

    def self.from_api!(payload)
      account = find_or_initialize_by(uid: payload.fetch("uid"))
      account.update!(
        iban: payload.dig("account_id", "iban"),
        name: payload["name"],
        product: payload["product"],
        currency: payload.fetch("currency")
      )
      account
    end

    # XPCD = expected: booked + pending, matches the ING app
    # ITAV = interim available: spendable now, may include overdraft
    # CLBD = closing booked: end of last business day, settled only
    # ITBD = interim booked: settled so far today, no pending
    BALANCE_PREFERENCE = %w[XPCD ITAV CLBD ITBD].freeze

    def update_balance!(balances)
      balance = BALANCE_PREFERENCE.lazy.filter_map { |type| balances.find { |b| b["balance_type"] == type } }.first || balances.first
      return if balance.nil?

      update!(
        balance_amount: balance.dig("balance_amount", "amount"),
        balance_type: balance["balance_type"],
        balance_updated_at: Time.current
      )
    end
  end
end
