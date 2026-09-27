module Bank
  class Transaction < ApplicationRecord
    belongs_to :account, foreign_key: :bank_account_id, inverse_of: :transactions

    attribute :raw, :json

    validates :entry_reference, :booking_date, :amount, :currency, :status, presence: true

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
  end
end
