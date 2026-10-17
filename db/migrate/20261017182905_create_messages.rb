class CreateMessages < ActiveRecord::Migration[8.0]
  def change
    drop_table :messages, if_exists: true

    create_table :messages, id: :string do |t|
      t.timestamps
      t.string :type, null: false
      t.references :contact, type: :string, null: false, foreign_key: true
      t.references :channel, type: :string, null: false, foreign_key: true
      t.string :body
    end
  end
end
