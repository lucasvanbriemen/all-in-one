class AddIsMemberToChannels < ActiveRecord::Migration[8.0]
  def change
    add_column :channels, :is_member, :boolean, null: false, default: false
  end
end
