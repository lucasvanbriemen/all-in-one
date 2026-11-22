class AddSilentToNotifications < ActiveRecord::Migration[8.0]
  # A silent notification still marks its chat unread, but sends no push and stays off the home screen.
  def change
    add_column :notifications, :silent, :boolean, default: false, null: false
  end
end
