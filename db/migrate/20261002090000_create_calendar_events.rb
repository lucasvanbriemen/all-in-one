class CreateCalendarEvents < ActiveRecord::Migration[8.0]
  def change
    create_table :calendar_events do |t|
      t.timestamps

      t.string :title, null: false
      t.text :description
      t.string :location
      t.datetime :starts_at, null: false
      t.datetime :ends_at
      t.boolean :all_day, default: false, null: false
    end

    add_index :calendar_events, :starts_at
  end
end
