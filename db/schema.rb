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

ActiveRecord::Schema[8.0].define(version: 2026_10_04_120000) do
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

  create_table "whatsapp_chats", charset: "utf8mb4", collation: "utf8mb4_general_ci", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "jid", null: false
    t.string "name"
    t.boolean "is_group", default: false, null: false
    t.integer "unread_count", default: 0, null: false
    t.boolean "archived", default: false, null: false
    t.boolean "pinned", default: false, null: false
    t.boolean "read_only", default: false, null: false
    t.string "muted_until"
    t.datetime "last_message_at"
    t.text "description"
    t.string "owner_jid"
    t.text "participants", size: :long, collation: "utf8mb4_bin"
    t.index ["jid"], name: "index_whatsapp_chats_on_jid", unique: true
    t.index ["last_message_at"], name: "index_whatsapp_chats_on_last_message_at"
    t.check_constraint "json_valid(`participants`)", name: "participants"
  end

  create_table "whatsapp_connections", charset: "utf8mb4", collation: "utf8mb4_general_ci", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "status", default: "unknown", null: false
    t.string "me_jid"
    t.string "me_lid"
    t.string "me_name"
    t.string "pairing_code"
    t.string "last_error"
    t.datetime "connected_at"
  end

  create_table "whatsapp_contacts", charset: "utf8mb4", collation: "utf8mb4_general_ci", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "jid", null: false
    t.string "lid"
    t.string "name"
    t.string "push_name"
    t.string "verified_name"
    t.string "avatar_url"
    t.string "status"
    t.index ["jid"], name: "index_whatsapp_contacts_on_jid", unique: true
    t.index ["lid"], name: "index_whatsapp_contacts_on_lid"
  end

  create_table "whatsapp_messages", charset: "utf8mb4", collation: "utf8mb4_general_ci", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "wa_id", null: false
    t.string "chat_jid", null: false
    t.string "sender_jid"
    t.string "sender_name"
    t.boolean "from_me", default: false, null: false
    t.string "kind"
    t.text "body"
    t.text "media", size: :long, collation: "utf8mb4_bin"
    t.string "quoted_id"
    t.text "mentions", size: :long, collation: "utf8mb4_bin"
    t.integer "status"
    t.boolean "live", default: false, null: false
    t.datetime "sent_at"
    t.datetime "edited_at"
    t.datetime "deleted_at"
    t.string "deleted_by_jid"
    t.index ["chat_jid", "sent_at"], name: "index_whatsapp_messages_on_chat_jid_and_sent_at"
    t.index ["chat_jid", "wa_id"], name: "index_whatsapp_messages_on_chat_jid_and_wa_id", unique: true
    t.check_constraint "json_valid(`media`)", name: "media"
    t.check_constraint "json_valid(`mentions`)", name: "mentions"
  end

  create_table "whatsapp_reactions", charset: "utf8mb4", collation: "utf8mb4_general_ci", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "chat_jid", null: false
    t.string "message_wa_id", null: false
    t.string "sender_jid", null: false
    t.string "emoji"
    t.datetime "reacted_at"
    t.index ["chat_jid", "message_wa_id", "sender_jid"], name: "whatsapp_reactions_unique", unique: true
  end

  add_foreign_key "bank_accounts", "bank_connections"
  add_foreign_key "bank_transactions", "bank_accounts"
  add_foreign_key "emails", "senders", name: "emails_sender_id_foreign", on_delete: :nullify
end
