class CreateBankConnections < ActiveRecord::Migration[8.0]
  def change
    create_table :bank_connections do |t|
      t.string :session_id, null: false
      t.string :aspsp_name, null: false
      t.string :aspsp_country, null: false
      t.datetime :valid_until, null: false
      t.datetime :last_synced_at
      t.text :last_sync_error
      t.timestamps
    end
  end
end
