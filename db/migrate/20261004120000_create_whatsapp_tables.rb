class CreateWhatsappTables < ActiveRecord::Migration[8.0]
  def change
    # One row: the state of the linked phone, mirrored from the connector.
    create_table :whatsapp_connections do |t|
      t.timestamps

      t.string :status, null: false, default: "unknown"
      t.string :me_jid
      t.string :me_lid
      t.string :me_name
      t.string :pairing_code
      t.string :last_error
      t.datetime :connected_at
    end

    create_table :whatsapp_contacts do |t|
      t.timestamps

      t.string :jid, null: false
      t.string :lid
      t.string :name
      t.string :push_name
      t.string :verified_name
      t.string :avatar_url
      t.string :status

      t.index :jid, unique: true
      t.index :lid
    end

    create_table :whatsapp_chats do |t|
      t.timestamps

      t.string :jid, null: false
      t.string :name
      t.boolean :is_group, null: false, default: false
      t.integer :unread_count, null: false, default: 0
      t.boolean :archived, null: false, default: false
      t.boolean :pinned, null: false, default: false
      t.boolean :read_only, null: false, default: false
      t.string :muted_until # ISO timestamp, "forever" or null
      t.datetime :last_message_at
      # Groups only
      t.text :description
      t.string :owner_jid
      t.json :participants

      t.index :jid, unique: true
      t.index :last_message_at
    end

    create_table :whatsapp_messages do |t|
      t.timestamps

      t.string :wa_id, null: false
      t.string :chat_jid, null: false
      t.string :sender_jid
      t.string :sender_name
      t.boolean :from_me, null: false, default: false
      t.string :kind
      t.text :body
      t.json :media
      t.string :quoted_id
      t.json :mentions
      t.integer :status
      t.boolean :live, null: false, default: false
      t.datetime :sent_at
      t.datetime :edited_at
      t.datetime :deleted_at
      t.string :deleted_by_jid

      t.index [ :chat_jid, :wa_id ], unique: true
      t.index [ :chat_jid, :sent_at ]
    end

    create_table :whatsapp_reactions do |t|
      t.timestamps

      t.string :chat_jid, null: false
      t.string :message_wa_id, null: false
      t.string :sender_jid, null: false
      t.string :emoji
      t.datetime :reacted_at

      t.index [ :chat_jid, :message_wa_id, :sender_jid ], unique: true, name: "whatsapp_reactions_unique"
    end
  end
end
