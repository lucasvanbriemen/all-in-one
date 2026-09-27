module Bank
  # A booked transaction. +amount+ is signed: negative when money left the
  # account, so sums over a period need no case on direction. Pending
  # transactions have no entry_reference yet and are skipped until booked.
  class Transaction < ApplicationRecord
    belongs_to :account, foreign_key: :bank_account_id, inverse_of: :transactions

    validates :entry_reference, :booking_date, :amount, :currency, :status, presence: true

    scope :in_month, ->(month) { where(booking_date: month.beginning_of_month..month.end_of_month) }
    scope :debits, -> { where("amount < 0") }
    scope :credits, -> { where("amount > 0") }
    scope :recent, -> { order(booking_date: :desc, id: :desc) }

    # Upserts one transaction from the API payload. Returns nil for pending
    # entries, which cannot be identified reliably across syncs.
    def self.from_api!(account, payload)
      reference = payload["entry_reference"]
      return nil if reference.blank?

      transaction = account.transactions.find_or_initialize_by(entry_reference: reference)
      transaction.update!(attributes_from_api(payload))
      transaction
    end

    def self.attributes_from_api(payload)
      amount = BigDecimal(payload.dig("transaction_amount", "amount"))
      amount = -amount if payload["credit_debit_indicator"] == "DBIT"
      counterparty = payload["creditor"].presence || payload["debtor"].presence || {}
      counterparty_account = payload["creditor_account"].presence || payload["debtor_account"].presence || {}
      remittance = Array(payload["remittance_information"])

      {
        booking_date: payload["booking_date"],
        value_date: payload["value_date"],
        amount: amount,
        currency: payload.dig("transaction_amount", "currency"),
        description: remittance.join("\n").presence,
        counterparty_name: counterparty["name"].presence || remittance.first.to_s.delete_prefix("Naam: ").presence,
        counterparty_iban: counterparty_account["iban"],
        transaction_type: payload.dig("bank_transaction_code", "description"),
        status: payload["status"],
        category: MoneyConfig.category_for(counterparty["name"], remittance.join(" ")),
        raw: payload
      }
    end

    def debit?
      amount.negative?
    end

    def as_json(options = {})
      super({ only: %i[id booking_date value_date amount currency description counterparty_name counterparty_iban transaction_type category] }.merge(options))
    end
  end
end
