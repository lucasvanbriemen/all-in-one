# One-on-one WhatsApp pictures were fetched onto the chat; they belong to the person, so move them to the contact.
class MoveWhatsappDmAvatarsToContacts < ActiveRecord::Migration[8.0]
  def up
    execute <<~SQL
      UPDATE contacts
      JOIN channels ON channels.contact_id = contacts.id
      SET contacts.avatar_url = channels.avatar_url
      WHERE channels.type = 'Whatsapp::Channel' AND channels.is_group_chat = FALSE
        AND channels.avatar_url IS NOT NULL AND channels.avatar_url <> ''
        AND (contacts.avatar_url IS NULL OR contacts.avatar_url = '')
    SQL

    execute <<~SQL
      UPDATE channels SET avatar_url = NULL
      WHERE type = 'Whatsapp::Channel' AND is_group_chat = FALSE
    SQL
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end
end
