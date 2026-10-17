class CreateContactsTable < ActiveRecord::Migration[8.0]
  def change
    create_table :contacts, id: :string do |t|
      t.timestamps
      t.string :type, null: false
      t.string :name
      t.string :avatar_url
      t.boolean :is_active, null: false, default: true
    end
  end
end
