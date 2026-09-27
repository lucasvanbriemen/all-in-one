class CreateBankConnections < ActiveRecord::Migration[8.0]
  def change
    create_table :bank_connections do |t|
      t.timestamps
      t.string :session_id
      t.string :aspsp_name
      t.string :aspsp_country
      t.datetime :valid_until
     end
  end
end
