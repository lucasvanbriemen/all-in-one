class CreateDeviceEvents < ActiveRecord::Migration[8.0]
  def change
    create_table :device_events do |t|
      t.string :device_id, null: false
      t.string :device_type
      t.string :attribute_name, null: false
      t.json :value
      t.boolean :snapshot, null: false, default: false
      t.datetime :occurred_at, null: false
      t.datetime :created_at, null: false
    end
  end
end
