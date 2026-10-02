class AddGoogleCalendar < ActiveRecord::Migration[8.0]
  def change
    create_table :google_calendar_connections do |t|
      t.timestamps

      t.string :email, null: false
      t.text :access_token, null: false
      t.text :refresh_token, null: false
      t.datetime :token_expires_at, null: false
      # calendar id => incremental sync token from the last successful pull
      t.json :sync_tokens
      t.datetime :last_synced_at
      t.text :last_sync_error
    end
    add_index :google_calendar_connections, :email, unique: true

    change_table :calendar_events do |t|
      t.string :source, null: false, default: "local"
      t.string :calendar_id
      t.string :calendar_name
      t.string :external_id
      t.string :color
      t.string :html_link
    end
    add_index :calendar_events, [:calendar_id, :external_id], unique: true
  end
end
