class CreateBankAccounts < ActiveRecord::Migration[8.0]
  def change
    create_table :bank_accounts do |t|
      t.references :bank_connection, null: false, foreign_key: true
      t.string :uid, null: false
      t.string :iban, null: false
      t.string :name
      t.string :product
      t.string :currency, null: false
      t.decimal :balance_amount, precision: 12, scale: 2
      t.string :balance_type
      t.datetime :balance_updated_at
      t.timestamps
    end
  end
end
