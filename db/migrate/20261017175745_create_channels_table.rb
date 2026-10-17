class CreateChannelsTable < ActiveRecord::Migration[8.0]
  def change
    create_table :channels, id: :string do |t|
      t.timestamps
      t.string :type, null: false
      t.string :name
      t.boolean :is_active, null: false, default: true
      t.boolean :is_private, null: false, default: false
    end
  end
end
