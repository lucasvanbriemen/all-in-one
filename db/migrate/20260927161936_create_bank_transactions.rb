class CreateBankTransactions < ActiveRecord::Migration[8.0]
  def change
    create_table :bank_transactions do |t|
      t.references :bank_account, null: false, foreign_key: true
      t.string :entry_reference, null: false
      t.date :booking_date, null: false
      t.date :value_date
      t.decimal :amount, precision: 12, scale: 2, null: false
      t.string :currency, null: false
      t.text :description
      t.string :counterparty_name
      t.string :counterparty_iban
      t.string :transaction_type
      t.string :status, null: false
      t.string :category
      t.json :raw
      t.timestamps
    end
  end
end
