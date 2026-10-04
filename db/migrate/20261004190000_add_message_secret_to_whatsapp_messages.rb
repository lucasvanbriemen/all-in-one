class AddMessageSecretToWhatsappMessages < ActiveRecord::Migration[8.0]
  def change
    add_column :whatsapp_messages, :message_secret, :string
  end
end
