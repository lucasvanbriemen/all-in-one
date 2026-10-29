class AddWhatsappColumnsToMessages < ActiveRecord::Migration[8.0]
  def change
    add_column :channels, :avatar_url, :string

    add_column :contacts, :lid, :string
    add_index :contacts, :lid

    add_column :messages, :quoted_message_id, :string
    add_column :messages, :message_secret, :string
    add_column :messages, :status, :integer
  end
end
