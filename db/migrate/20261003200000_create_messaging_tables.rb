class CreateMessagingTables < ActiveRecord::Migration[8.0]
  def change
    # One linked account per provider (WhatsApp today, Slack and Telegram later).
    create_table :messaging_accounts do |t|
      t.timestamps

      t.string :provider, null: false
      t.string :status, null: false, default: "disconnected"
      t.string :external_id, comment: "The account's own id at the provider, e.g. the phone JID"
      t.string :name
      t.string :pairing_code
      t.text :last_error
      t.datetime :connected_at

      t.index :provider, unique: true
    end

    create_table :messaging_contacts do |t|
      t.timestamps

      t.references :account, null: false, foreign_key: { to_table: :messaging_accounts }
      t.string :external_id, null: false
      t.string :alt_external_id, comment: "WhatsApp privacy id (LID) when the contact has one"
      t.string :name, comment: "As saved in the user's address book"
      t.string :push_name, comment: "As chosen by the contact themselves"
      t.string :verified_name
      t.string :avatar_url
      t.string :status_text

      t.index [ :account_id, :external_id ], unique: true
      t.index [ :account_id, :alt_external_id ]
    end

    create_table :messaging_conversations do |t|
      t.timestamps

      t.references :account, null: false, foreign_key: { to_table: :messaging_accounts }
      t.string :external_id, null: false
      t.string :alt_external_id, comment: "WhatsApp privacy id (LID) for direct chats"
      t.string :kind, null: false, default: "direct"
      t.string :name
      t.text :description
      t.string :avatar_url
      t.integer :unread_count, null: false, default: 0
      t.boolean :archived, null: false, default: false
      t.boolean :pinned, null: false, default: false
      t.boolean :read_only, null: false, default: false
      t.datetime :muted_until
      t.boolean :muted_forever, null: false, default: false
      t.datetime :last_message_at
      t.text :participants, size: :long, comment: "JSON [{id, admin}] for groups"

      t.index [ :account_id, :external_id ], unique: true
      t.index [ :account_id, :alt_external_id ]
      t.index [ :account_id, :last_message_at ]
    end

    create_table :messaging_messages do |t|
      t.timestamps

      t.references :conversation, null: false, foreign_key: { to_table: :messaging_conversations }
      t.string :external_id, null: false
      t.string :sender_id, comment: "External id of the sender"
      t.string :sender_name
      t.boolean :from_me, null: false, default: false
      t.string :kind, null: false, default: "conversation"
      t.text :body, size: :long
      t.text :media, size: :long, comment: "JSON description of attached media"
      t.string :quoted_external_id
      t.text :mentions, comment: "JSON array of external ids"
      t.integer :status, comment: "0 error, 1 pending, 2 sent, 3 delivered, 4 read, 5 played"
      t.datetime :sent_at, null: false
      t.datetime :edited_at
      t.datetime :deleted_at
      t.boolean :live, null: false, default: false, comment: "Arrived while linked, as opposed to replayed from history"

      t.index [ :conversation_id, :external_id ], unique: true
      t.index [ :conversation_id, :sent_at ]
    end

    create_table :messaging_reactions do |t|
      t.timestamps

      t.references :message, null: false, foreign_key: { to_table: :messaging_messages }
      t.string :sender_id, null: false
      t.string :emoji, null: false
      t.datetime :reacted_at

      t.index [ :message_id, :sender_id ], unique: true
    end
  end
end
