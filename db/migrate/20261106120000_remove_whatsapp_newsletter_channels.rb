# Followed WhatsApp Channels were stored as nameless one-on-one chats and listed as "+120363…"; the app has nothing to show for them.
class RemoveWhatsappNewsletterChannels < ActiveRecord::Migration[8.0]
  def up
    execute <<~SQL
      DELETE FROM channels
      WHERE type = 'Whatsapp::Channel' AND (id LIKE '%@newsletter' OR id LIKE '%@broadcast')
        AND NOT EXISTS (SELECT 1 FROM messages WHERE messages.channel_id = channels.id)
    SQL
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end
end
