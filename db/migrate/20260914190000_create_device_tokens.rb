class CreateDeviceTokens < ActiveRecord::Migration[8.0]
  def change
    create_table :device_tokens do |t|
      t.string :token, null: false
      t.string :platform, null: false
      t.timestamps
    end
    add_index :device_tokens, :token, unique: true
  end
end
