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

ActiveRecord::Schema[8.0].define(version: 2026_06_05_000001) do
  create_table "attachments", id: { type: :bigint, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.bigint "email_id", null: false, unsigned: true
    t.string "name", null: false
    t.string "path", null: false
    t.string "mime_type"
    t.index ["email_id"], name: "attachments_email_id_foreign"
  end

  create_table "cache", primary_key: "key", id: :string, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.text "value", size: :medium, null: false
    t.integer "expiration", null: false
  end

  create_table "cache_locks", primary_key: "key", id: :string, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.string "owner", null: false
    t.integer "expiration", null: false
  end

  create_table "device_tokens", id: { type: :bigint, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.bigint "user_id", null: false, unsigned: true
    t.string "token", null: false
    t.string "platform", default: "ios", null: false
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.index ["token"], name: "device_tokens_token_unique", unique: true
    t.index ["user_id"], name: "device_tokens_user_id_index"
  end

  create_table "emails", id: { type: :bigint, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.string "uuid", null: false, comment: "Unique identifier for the email in the IMAP server"
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.string "subject"
    t.text "to", size: :long
    t.datetime "sent_at", precision: nil
    t.boolean "has_read", default: false, null: false
    t.string "uid"
    t.text "html_body", size: :long, null: false
    t.bigint "folder_id", unsigned: true
    t.boolean "is_archived", default: false, null: false
    t.boolean "is_starred", default: false, null: false
    t.boolean "is_deleted", default: false, null: false
    t.integer "profile_id", null: false
    t.string "sender_name"
    t.bigint "sender_id", unsigned: true
    t.bigint "tag_id", unsigned: true
    t.string "message_id", comment: "RFC822 Message-ID, used to dedupe IMAP imports"
    t.index ["folder_id"], name: "emails_folder_id_foreign"
    t.index ["has_read"], name: "emails_has_read_index"
    t.index ["html_body"], name: "ft_html_body", type: :fulltext
    t.index ["profile_id", "message_id"], name: "emails_profile_message_id_unique", unique: true
    t.index ["sender_id"], name: "emails_sender_id_index"
    t.index ["sent_at"], name: "emails_sent_at_index"
    t.index ["subject", "html_body"], name: "ft_both", type: :fulltext
    t.index ["subject"], name: "emails_subject_index"
    t.index ["subject"], name: "ft_subject", type: :fulltext
    t.index ["tag_id"], name: "emails_tag_id_foreign"
  end

  create_table "failed_jobs", id: { type: :bigint, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.string "uuid", null: false
    t.text "connection", null: false
    t.text "queue", null: false
    t.text "payload", size: :long, null: false
    t.text "exception", size: :long, null: false
    t.timestamp "failed_at", default: -> { "current_timestamp()" }, null: false
    t.index ["uuid"], name: "failed_jobs_uuid_unique", unique: true
  end

  create_table "folders", id: { type: :bigint, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.string "name", null: false
    t.string "icon"
    t.string "path", null: false
    t.integer "profile_id", null: false
    t.index ["profile_id"], name: "profile_id"
  end

  create_table "imap_credentials", id: { type: :bigint, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.string "host", null: false
    t.integer "port", default: 993, null: false
    t.string "protocol", default: "imap", null: false
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

  create_table "job_batches", id: :string, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.string "name", null: false
    t.integer "total_jobs", null: false
    t.integer "pending_jobs", null: false
    t.integer "failed_jobs", null: false
    t.text "failed_job_ids", size: :long, null: false
    t.text "options", size: :medium
    t.integer "cancelled_at"
    t.integer "created_at", null: false
    t.integer "finished_at"
  end

  create_table "jobs", id: { type: :bigint, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.string "queue", null: false
    t.text "payload", size: :long, null: false
    t.integer "attempts", limit: 1, null: false, unsigned: true
    t.integer "reserved_at", unsigned: true
    t.integer "available_at", null: false, unsigned: true
    t.integer "created_at", null: false, unsigned: true
    t.index ["queue"], name: "jobs_queue_index"
  end

  create_table "migrations", id: { type: :integer, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.string "migration", null: false
    t.integer "batch", null: false
  end

  create_table "password_reset_tokens", primary_key: "email", id: :string, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.string "token", null: false
    t.timestamp "created_at"
  end

  create_table "personal_access_tokens", id: { type: :bigint, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.string "tokenable_type", null: false
    t.bigint "tokenable_id", null: false, unsigned: true
    t.string "name", null: false
    t.string "token", limit: 64, null: false
    t.text "abilities"
    t.timestamp "last_used_at"
    t.timestamp "expires_at"
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.index ["token"], name: "personal_access_tokens_token_unique", unique: true
    t.index ["tokenable_type", "tokenable_id"], name: "personal_access_tokens_tokenable_type_tokenable_id_index"
  end

  create_table "profiles", id: { type: :bigint, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.string "name"
    t.bigint "user_id", null: false, unsigned: true
    t.string "email", null: false
    t.string "linked_profile_count", default: "1", null: false
    t.index ["email"], name: "profiles_email_unique", unique: true
    t.index ["user_id"], name: "profiles_user_id_foreign"
  end

  create_table "senders", id: { type: :bigint, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.string "email", null: false
    t.string "name"
    t.string "image_path"
    t.string "top_level_domain"
    t.index ["email"], name: "sender_email_email_unique", unique: true
  end

  create_table "sessions", id: :string, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.bigint "user_id", unsigned: true
    t.string "ip_address", limit: 45
    t.text "user_agent"
    t.text "payload", size: :long, null: false
    t.integer "last_activity", null: false
    t.index ["last_activity"], name: "sessions_last_activity_index"
    t.index ["user_id"], name: "sessions_user_id_index"
  end

  create_table "smtp_credentials", id: { type: :bigint, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.integer "profile_id"
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.string "host", null: false
    t.integer "port", default: 587, null: false
    t.string "username", null: false
    t.string "password", null: false
    t.string "reply_to_name"
    t.string "reply_to_email"
    t.string "from_name"
    t.string "from_email"
  end

  create_table "system_info", id: { type: :bigint, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.datetime "last_email_fetched_at", precision: nil
  end

  create_table "tags", id: { type: :bigint, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.bigint "profile_id", null: false, unsigned: true
    t.string "name", null: false
    t.string "color", default: "#000000", null: false
    t.index ["profile_id"], name: "tags_profile_id_foreign"
  end

  create_table "users", id: { type: :bigint, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.string "name", null: false
    t.string "email", null: false
    t.timestamp "email_verified_at"
    t.timestamp "last_activity"
    t.string "password", null: false
    t.string "remember_token", limit: 100
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.index ["email"], name: "users_email_unique", unique: true
  end

  add_foreign_key "attachments", "emails", name: "attachments_email_id_foreign", on_delete: :cascade
  add_foreign_key "emails", "folders", name: "emails_folder_id_foreign", on_delete: :nullify
  add_foreign_key "emails", "senders", name: "emails_sender_id_foreign", on_delete: :nullify
  add_foreign_key "emails", "tags", name: "emails_tag_id_foreign", on_delete: :nullify
  add_foreign_key "profiles", "users", name: "profiles_user_id_foreign", on_delete: :cascade
  add_foreign_key "tags", "profiles", name: "tags_profile_id_foreign", on_delete: :cascade
end
