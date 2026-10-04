class AddAvatarCheckedAtToWhatsappChats < ActiveRecord::Migration[8.0]
  def change
    add_column :whatsapp_chats, :avatar_url, :string
    add_column :whatsapp_chats, :avatar_checked_at, :datetime
  end
end
