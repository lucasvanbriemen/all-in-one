class AddContactIdToChannels < ActiveRecord::Migration[8.0]
  def change
    add_column :channels, :contact_id, :string
    add_index :channels, :contact_id
  end
end
