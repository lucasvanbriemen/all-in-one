class MoveDismissedFromContactsToChannels < ActiveRecord::Migration[8.0]
  def change
    remove_column :contacts, :dismissed, :boolean, default: false
    add_column :channels, :dismissed, :boolean, default: false
  end
end
