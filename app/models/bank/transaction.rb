module Bank
  # A booked transaction. +amount+ is signed: negative when money left the
  # account, so sums over a period need no case on direction. Pending
  # transactions have no entry_reference yet and are skipped until booked.
  class Transaction < ApplicationRecord
    belongs_to :account, foreign_key: :bank_account_id, inverse_of: :transactions

    # MariaDB stores json columns as longtext with a validity check, which
    # Rails does not recognise as JSON on its own.
    attribute :raw, :json

    validates :entry_reference, :booking_date, :amount, :currency, :status, presence: true

    scope :in_month, ->(month) { where(booking_date: month.beginning_of_month..month.end_of_month) }
    scope :debits, -> { where("amount < 0") }
    scope :credits, -> { where("amount > 0") }
    scope :recent, -> { order(booking_date: :desc, id: :desc) }

    # Upserts one transaction from the API payload. Returns nil for pending
    # entries: they have no booking date yet and their reference can change
    # once booked, so they are picked up on a later sync instead.
    def self.from_api!(account, payload)
      reference = payload["entry_reference"]
      return nil if reference.blank? || payload["booking_date"].blank? || payload["status"] != "BOOK"

      transaction = account.transactions.find_or_initialize_by(entry_reference: reference)
      transaction.update!(attributes_from_api(payload))
      transaction
    end

    def self.attributes_from_api(payload)
      amount = BigDecimal(payload.dig("transaction_amount", "amount"))
      amount = -amount if payload["credit_debit_indicator"] == "DBIT"
      # The other party is the creditor when money left the account and the
      # debtor when it came in; the remaining side is this account itself.
      side = payload["credit_debit_indicator"] == "DBIT" ? "creditor" : "debtor"
      counterparty = payload[side].presence || {}
      counterparty_account = payload["#{side}_account"].presence || {}
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
        raw: payload
      }
    end

    # Rebuilds every derived column from the stored payload, for after the
    # category patterns or the mapping change. No API call needed.
    def self.reapply_from_raw!
      find_each { |transaction| transaction.update!(attributes_from_api(transaction.raw)) }
    end

    def debit?
      amount.negative?
    end

    def as_json(options = {})
      super({ only: %i[id booking_date value_date amount currency description counterparty_name counterparty_iban transaction_type category] }.merge(options))
    end
  end
end
