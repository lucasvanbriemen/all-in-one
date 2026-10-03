# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2026_10_03_200000) do
  create_table "alarms", charset: "utf8mb4", collation: "utf8mb4_general_ci", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "time", null: false
    t.text "weekdays", null: false
    t.boolean "enabled", default: true, null: false
    t.string "label"
    t.date "last_fired_on"
  end

  create_table "bank_accounts", charset: "utf8mb4", collation: "utf8mb4_general_ci", force: :cascade do |t|
    t.bigint "bank_connection_id", null: false
    t.string "uid", null: false
    t.string "iban", null: false
    t.string "name"
    t.string "product"
    t.string "currency", null: false
    t.decimal "balance_amount", precision: 12, scale: 2
    t.string "balance_type"
    t.datetime "balance_updated_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["bank_connection_id"], name: "index_bank_accounts_on_bank_connection_id"
  end

  create_table "bank_connections", charset: "utf8mb4", collation: "utf8mb4_general_ci", force: :cascade do |t|
    t.string "session_id", null: false
    t.string "aspsp_name", null: false
    t.string "aspsp_country", null: false
    t.datetime "valid_until", null: false
    t.datetime "last_synced_at"
    t.text "last_sync_error"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "bank_transactions", charset: "utf8mb4", collation: "utf8mb4_general_ci", force: :cascade do |t|
    t.bigint "bank_account_id", null: false
    t.string "entry_reference", null: false
    t.date "booking_date", null: false
    t.date "value_date"
    t.decimal "amount", precision: 12, scale: 2, null: false
    t.string "currency", null: false
    t.text "description"
    t.string "counterparty_name"
    t.string "counterparty_iban"
    t.string "transaction_type"
    t.string "status", null: false
    t.string "category"
    t.text "raw", size: :long, collation: "utf8mb4_bin"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["bank_account_id"], name: "index_bank_transactions_on_bank_account_id"
    t.check_constraint "json_valid(`raw`)", name: "raw"
  end

  create_table "calendar_events", charset: "utf8mb4", collation: "utf8mb4_general_ci", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "title", null: false
    t.text "description"
    t.string "location"
    t.datetime "starts_at", null: false
    t.datetime "ends_at"
    t.boolean "all_day", default: false, null: false
    t.string "source", default: "local", null: false
    t.string "calendar_id"
    t.string "calendar_name"
    t.string "external_id"
    t.string "color"
    t.string "html_link"
    t.index ["calendar_id", "external_id"], name: "index_calendar_events_on_calendar_id_and_external_id", unique: true
    t.index ["starts_at"], name: "index_calendar_events_on_starts_at"
  end

  create_table "conversations", charset: "utf8mb4", collation: "utf8mb4_general_ci", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "provider", default: "slack", null: false
    t.bigint "slack_connection_id"
    t.string "external_id", null: false
    t.string "name"
    t.string "kind", null: false
    t.string "counterpart_id"
    t.boolean "is_member", default: true, null: false
    t.boolean "archived", default: false, null: false
    t.string "last_read"
    t.string "latest_ts"
    t.datetime "last_message_at"
    t.text "last_message_preview"
    t.integer "unread_count", default: 0, null: false
    t.index ["last_message_at"], name: "index_conversations_on_last_message_at"
    t.index ["provider", "external_id"], name: "index_conversations_on_provider_and_external_id", unique: true
    t.index ["slack_connection_id"], name: "index_conversations_on_slack_connection_id"
  end

  create_table "device_tokens", charset: "utf8mb4", collation: "utf8mb4_general_ci", force: :cascade do |t|
    t.string "token", null: false
    t.string "platform", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "topic"
    t.string "environment", default: "production", null: false
    t.index ["token"], name: "index_device_tokens_on_token", unique: true
  end

  create_table "emails", id: { type: :bigint, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.string "subject"
    t.text "to", size: :long
    t.text "html_body", size: :long, null: false
    t.integer "profile_id", null: false
    t.string "sender_name"
    t.bigint "sender_id", unsigned: true
    t.string "message_id", comment: "RFC822 Message-ID, used to dedupe IMAP imports"
    t.index ["created_at"], name: "emails_created_at_index"
    t.index ["html_body"], name: "ft_html_body", type: :fulltext
    t.index ["profile_id", "message_id"], name: "emails_profile_message_id_unique", unique: true
    t.index ["sender_id"], name: "emails_sender_id_index"
    t.index ["subject", "html_body"], name: "ft_both", type: :fulltext
    t.index ["subject"], name: "emails_subject_index"
    t.index ["subject"], name: "ft_subject", type: :fulltext
  end

  create_table "google_calendar_connections", charset: "utf8mb4", collation: "utf8mb4_general_ci", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "email", null: false
    t.text "access_token", null: false
    t.text "refresh_token", null: false
    t.datetime "token_expires_at", null: false
    t.text "sync_tokens", size: :long, collation: "utf8mb4_bin"
    t.datetime "last_synced_at"
    t.text "last_sync_error"
    t.index ["email"], name: "index_google_calendar_connections_on_email", unique: true
    t.check_constraint "json_valid(`sync_tokens`)", name: "sync_tokens"
  end

  create_table "imap_credentials", id: { type: :bigint, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.string "host", null: false
    t.integer "port", default: 993, null: false
    t.string "encryption", default: "ssl", null: false
    t.boolean "validate_cert", default: true, null: false
    t.string "username", null: false
    t.string "password", null: false
    t.bigint "profile_id", null: false, unsigned: true
    t.timestamp "last_fetched_at"
    t.text "last_fetch_error"
    t.integer "fetch_attempts", default: 0, null: false
    t.index ["last_fetched_at"], name: "imap_credentials_last_fetched_at_index"
  end

  create_table "messages", charset: "utf8mb4", collation: "utf8mb4_general_ci", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "conversation_id", null: false
    t.string "external_id", null: false
    t.string "thread_id"
    t.string "sender_id"
    t.string "sender_name"
    t.string "subtype"
    t.text "text", size: :long
    t.text "raw", size: :long, collation: "utf8mb4_bin"
    t.datetime "posted_at", null: false
    t.index ["conversation_id", "external_id"], name: "index_messages_on_conversation_id_and_external_id", unique: true
    t.index ["conversation_id", "posted_at"], name: "index_messages_on_conversation_id_and_posted_at"
    t.index ["conversation_id"], name: "index_messages_on_conversation_id"
  end

  create_table "messaging_accounts", charset: "utf8mb4", collation: "utf8mb4_general_ci", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "provider", null: false
    t.string "status", default: "disconnected", null: false
    t.string "external_id", comment: "The account's own id at the provider, e.g. the phone JID"
    t.string "name"
    t.string "pairing_code"
    t.text "last_error"
    t.datetime "connected_at"
    t.index ["provider"], name: "index_messaging_accounts_on_provider", unique: true
  end

  create_table "messaging_contacts", charset: "utf8mb4", collation: "utf8mb4_general_ci", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "account_id", null: false
    t.string "external_id", null: false
    t.string "alt_external_id", comment: "WhatsApp privacy id (LID) when the contact has one"
    t.string "name", comment: "As saved in the user's address book"
    t.string "push_name", comment: "As chosen by the contact themselves"
    t.string "verified_name"
    t.string "avatar_url"
    t.string "status_text"
    t.index ["account_id", "alt_external_id"], name: "index_messaging_contacts_on_account_id_and_alt_external_id"
    t.index ["account_id", "external_id"], name: "index_messaging_contacts_on_account_id_and_external_id", unique: true
    t.index ["account_id"], name: "index_messaging_contacts_on_account_id"
  end

  create_table "messaging_conversations", charset: "utf8mb4", collation: "utf8mb4_general_ci", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "account_id", null: false
    t.string "external_id", null: false
    t.string "alt_external_id", comment: "WhatsApp privacy id (LID) for direct chats"
    t.string "kind", default: "direct", null: false
    t.string "name"
    t.text "description"
    t.string "avatar_url"
    t.integer "unread_count", default: 0, null: false
    t.boolean "archived", default: false, null: false
    t.boolean "pinned", default: false, null: false
    t.boolean "read_only", default: false, null: false
    t.datetime "muted_until"
    t.boolean "muted_forever", default: false, null: false
    t.datetime "last_message_at"
    t.text "participants", size: :long, comment: "JSON [{id, admin}] for groups"
    t.index ["account_id", "alt_external_id"], name: "idx_on_account_id_alt_external_id_690cb88ab5"
    t.index ["account_id", "external_id"], name: "index_messaging_conversations_on_account_id_and_external_id", unique: true
    t.index ["account_id", "last_message_at"], name: "idx_on_account_id_last_message_at_93a54620fa"
    t.index ["account_id"], name: "index_messaging_conversations_on_account_id"
  end

  create_table "messaging_messages", charset: "utf8mb4", collation: "utf8mb4_general_ci", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "conversation_id", null: false
    t.string "external_id", null: false
    t.string "sender_id", comment: "External id of the sender"
    t.string "sender_name"
    t.boolean "from_me", default: false, null: false
    t.string "kind", default: "conversation", null: false
    t.text "body", size: :long
    t.text "media", size: :long, comment: "JSON description of attached media"
    t.string "quoted_external_id"
    t.text "mentions", comment: "JSON array of external ids"
    t.integer "status", comment: "0 error, 1 pending, 2 sent, 3 delivered, 4 read, 5 played"
    t.datetime "sent_at", null: false
    t.datetime "edited_at"
    t.datetime "deleted_at"
    t.boolean "live", default: false, null: false, comment: "Arrived while linked, as opposed to replayed from history"
    t.index ["conversation_id", "external_id"], name: "index_messaging_messages_on_conversation_id_and_external_id", unique: true
    t.index ["conversation_id", "sent_at"], name: "index_messaging_messages_on_conversation_id_and_sent_at"
    t.index ["conversation_id"], name: "index_messaging_messages_on_conversation_id"
  end

  create_table "messaging_reactions", charset: "utf8mb4", collation: "utf8mb4_general_ci", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "message_id", null: false
    t.string "sender_id", null: false
    t.string "emoji", null: false
    t.datetime "reacted_at"
    t.index ["message_id", "sender_id"], name: "index_messaging_reactions_on_message_id_and_sender_id", unique: true
    t.index ["message_id"], name: "index_messaging_reactions_on_message_id"
  end

  create_table "notifications", charset: "utf8mb4", collation: "utf8mb4_general_ci", force: :cascade do |t|
    t.string "title"
    t.text "body"
    t.text "source"
    t.boolean "read", default: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "reminders", charset: "utf8mb4", collation: "utf8mb4_general_ci", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "title"
    t.text "description"
    t.datetime "remind_at"
    t.boolean "completed", default: false
  end

  create_table "senders", id: { type: :bigint, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.string "email", null: false
    t.string "name"
    t.index ["email"], name: "sender_email_email_unique", unique: true
  end

  create_table "slack_connections", charset: "utf8mb4", collation: "utf8mb4_general_ci", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "team_id", null: false
    t.string "team_name"
    t.string "user_id", null: false
    t.text "user_token", null: false
    t.string "scope"
    t.datetime "last_synced_at"
    t.text "last_sync_error"
    t.index ["team_id"], name: "index_slack_connections_on_team_id", unique: true
  end

  create_table "slack_users", charset: "utf8mb4", collation: "utf8mb4_general_ci", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "slack_connection_id", null: false
    t.string "user_id", null: false
    t.string "name"
    t.string "real_name"
    t.string "display_name"
    t.string "image_url"
    t.boolean "is_bot", default: false, null: false
    t.boolean "deleted", default: false, null: false
    t.index ["slack_connection_id", "user_id"], name: "index_slack_users_on_slack_connection_id_and_user_id", unique: true
    t.index ["slack_connection_id"], name: "index_slack_users_on_slack_connection_id"
  end

  add_foreign_key "bank_accounts", "bank_connections"
  add_foreign_key "bank_transactions", "bank_accounts"
  add_foreign_key "emails", "senders", name: "emails_sender_id_foreign", on_delete: :nullify
  add_foreign_key "messaging_contacts", "messaging_accounts", column: "account_id"
  add_foreign_key "messaging_conversations", "messaging_accounts", column: "account_id"
  add_foreign_key "messaging_messages", "messaging_conversations", column: "conversation_id"
  add_foreign_key "messaging_reactions", "messaging_messages", column: "message_id"
end
