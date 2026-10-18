class AddIsDmAndIsGroupChatToChannels < ActiveRecord::Migration[8.0]
  def change
    add_column :channels, :is_dm, :boolean, null: false, default: false
    add_column :channels, :is_group_chat, :boolean, null: false, default: false
  end
end
