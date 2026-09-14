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

ActiveRecord::Schema[8.0].define(version: 2026_09_14_220000) do
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

  create_table "senders", id: { type: :bigint, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.string "email", null: false
    t.string "name"
    t.index ["email"], name: "sender_email_email_unique", unique: true
  end

  add_foreign_key "emails", "senders", name: "emails_sender_id_foreign", on_delete: :nullify
end
