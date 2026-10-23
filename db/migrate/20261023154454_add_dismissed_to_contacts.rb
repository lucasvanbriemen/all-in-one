class AddDismissedToContacts < ActiveRecord::Migration[8.0]
  def change
    add_column :contacts, :dismissed, :boolean, default: false
  end
end
