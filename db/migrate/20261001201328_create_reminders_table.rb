class CreateNotesTable < ActiveRecord::Migration[8.0]
  def change
    create_table :reminders_tables do |t|
      t.timestamps

      t.string :title
      t.text :description
      t.datetime :remind_at
      t.boolean :completed, default: false
    end
  end
end
