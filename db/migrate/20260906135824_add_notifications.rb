class AddNotifications < ActiveRecord::Migration[8.0]
  def change
    create_table :notifications do |t|
      t.string :title
      t.text :body
      t.text :source
      t.boolean :read, default: false

      t.timestamps
    end
  end
end
