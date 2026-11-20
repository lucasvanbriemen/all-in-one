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

ActiveRecord::Schema[8.0].define(version: 2026_07_25_120000) do
  create_table "accounts", charset: "utf8mb4", collation: "utf8mb4_general_ci", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "email", null: false
    t.string "password_digest", null: false
    t.string "name", null: false
    t.index ["email"], name: "index_accounts_on_email", unique: true
  end

  create_table "active_storage_attachments", charset: "utf8mb4", collation: "utf8mb4_general_ci", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", charset: "utf8mb4", collation: "utf8mb4_general_ci", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", charset: "utf8mb4", collation: "utf8mb4_general_ci", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "base_comments", id: { type: :bigint, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.bigint "comment_id", null: false, unsigned: true
    t.bigint "issue_id", null: false, unsigned: true
    t.bigint "user_id", null: false, unsigned: true
    t.text "body"
    t.boolean "resolved", default: false, null: false
    t.column "type", "enum('issue','code','review')", default: "issue", null: false
    t.index ["comment_id"], name: "issue_comments_github_id_unique", unique: true
    t.index ["issue_id"], name: "base_comments_issue_id_idx"
    t.index ["user_id"], name: "issue_comments_user_id_foreign"
  end

  create_table "branches", id: { type: :bigint, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.string "name", null: false
    t.bigint "repository_id", null: false, unsigned: true
    t.index ["repository_id", "name"], name: "branches_repository_id_name_unique", unique: true
  end

  create_table "cache", primary_key: "key", id: :string, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.text "value", size: :medium, null: false
    t.integer "expiration", null: false
  end

  create_table "cache_locks", primary_key: "key", id: :string, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.string "owner", null: false
    t.integer "expiration", null: false
  end

  create_table "commits", primary_key: "sha", id: :string, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.bigint "repository_id", null: false, unsigned: true
    t.bigint "branch_id", null: false, unsigned: true
    t.bigint "user_id", null: false, unsigned: true
    t.text "message", null: false
    t.bigint "workflow_id", unsigned: true
    t.index ["branch_id"], name: "commits_branch_id_foreign"
    t.index ["repository_id"], name: "commits_repository_id_foreign"
    t.index ["user_id"], name: "commits_user_id_foreign"
    t.index ["workflow_id"], name: "commits_workflow_id_foreign"
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

  create_table "github_users", id: { type: :bigint, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.string "login", null: false
    t.string "name"
    t.string "avatar_url"
    t.string "type", default: "User", null: false
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.string "display_name"
    t.index ["id"], name: "github_users_github_id_unique", unique: true
  end

  create_table "incoming_webhooks", id: { type: :bigint, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.string "event", null: false
    t.text "payload", size: :long, null: false
    t.timestamp "created_at"
    t.timestamp "updated_at"
  end

  create_table "issue_assignees", primary_key: ["issue_id", "user_id"], charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.bigint "issue_id", null: false, unsigned: true
    t.bigint "user_id", null: false, unsigned: true
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.index ["issue_id"], name: "issue_assignees_issue_id_index"
    t.index ["user_id"], name: "issue_assignees_github_user_id_index"
  end

  create_table "item_labels", id: { type: :bigint, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.bigint "item_id", null: false, unsigned: true
    t.bigint "label_id", null: false, unsigned: true
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.index ["item_id", "label_id"], name: "item_labels_item_id_label_id_unique", unique: true
    t.index ["label_id"], name: "item_labels_label_id_foreign"
  end

  create_table "items", id: { type: :bigint, unsigned: true, default: nil }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.bigint "repository_id", null: false, unsigned: true
    t.bigint "number", null: false, unsigned: true
    t.string "title"
    t.text "body"
    t.column "state", "enum('open','closed','draft','merged')", default: "open", null: false
    t.bigint "opened_by_id", unsigned: true
    t.column "type", "enum('issue','pull_request')", null: false
    t.bigint "milestone_id"
    t.integer "importance_score", default: 0, null: false
    t.index ["milestone_id"], name: "items_milestone_id_idx"
    t.index ["opened_by_id"], name: "items_opened_by_id_foreign"
    t.index ["repository_id", "number"], name: "items_repository_id_number_index"
    t.index ["repository_id", "type", "state", "created_at"], name: "items_repo_type_state_created_idx"
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

  create_table "labels", id: { type: :bigint, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.bigint "github_id", null: false, unsigned: true
    t.bigint "repository_id", null: false, unsigned: true
    t.string "name", null: false
    t.string "color", limit: 6, null: false
    t.text "description"
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.index ["repository_id", "name"], name: "labels_repository_id_name_unique", unique: true
  end

  create_table "migrations", id: { type: :integer, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.string "migration", null: false
    t.integer "batch", null: false
  end

  create_table "milestones", id: :bigint, default: nil, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.bigint "repository_id", null: false, unsigned: true
    t.string "state", null: false
    t.string "title", null: false
    t.datetime "due_on", precision: nil
    t.bigint "number"
    t.index ["repository_id"], name: "milestones_repository_id_foreign"
  end

  create_table "notifications", id: { type: :bigint, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.string "type", null: false
    t.string "related_id", null: false
    t.boolean "completed", default: false, null: false
    t.bigint "triggered_by_id", unsigned: true
    t.date "emailed_at"
    t.index ["type", "completed", "related_id"], name: "notifications_type_completed_related_idx"
  end

  create_table "organizations", id: { type: :bigint, unsigned: true, default: nil }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.string "name", null: false
    t.text "description", size: :long, null: false
    t.string "avatar_url", null: false
    t.string "banner_light_url"
    t.string "banner_dark_url"
    t.index ["name"], name: "organizations_name_index"
  end

  create_table "password_reset_tokens", primary_key: "email", id: :string, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.string "token", null: false
    t.timestamp "created_at"
  end

  create_table "personal_access_tokens", id: { type: :bigint, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.string "tokenable_type", null: false
    t.bigint "tokenable_id", null: false, unsigned: true
    t.text "name", null: false
    t.string "token", limit: 64, null: false
    t.text "abilities"
    t.timestamp "last_used_at"
    t.timestamp "expires_at"
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.index ["expires_at"], name: "personal_access_tokens_expires_at_index"
    t.index ["token"], name: "personal_access_tokens_token_unique", unique: true
    t.index ["tokenable_type", "tokenable_id"], name: "personal_access_tokens_tokenable_type_tokenable_id_index"
  end

  create_table "pull_request_comments", id: { type: :bigint, unsigned: true, default: nil }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.bigint "in_reply_to_id", unsigned: true
    t.text "diff_hunk", size: :long
    t.integer "line_start"
    t.integer "line_end"
    t.integer "original_line", unsigned: true
    t.string "path"
    t.string "side"
    t.bigint "pull_request_review_id"
    t.bigint "base_comment_id", unsigned: true
  end

  create_table "pull_request_reviews", id: { type: :bigint, unsigned: true, default: nil }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.bigint "base_comment_id", unsigned: true
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.column "state", "enum('approved','changes_requested','commented')", default: "commented", null: false
    t.index ["base_comment_id"], name: "pull_request_reviews_base_comment_id_foreign"
  end

  create_table "pull_requests", id: { type: :bigint, unsigned: true, default: nil }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.string "head_branch"
    t.string "head_sha"
    t.string "base_branch"
    t.string "merge_base_sha"
    t.datetime "closed_at", precision: nil
    t.index ["id"], name: "pull_request_github_id_unique", unique: true
  end

  create_table "releases", id: { type: :bigint, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.bigint "github_id", unsigned: true
    t.bigint "repository_id", null: false, unsigned: true
    t.string "name"
    t.text "description"
    t.bigint "author_id", unsigned: true
    t.string "status", default: "draft", null: false
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.index ["author_id"], name: "releases_author_id_foreign"
    t.index ["repository_id"], name: "releases_repository_id_foreign"
  end

  create_table "repositories", id: { type: :bigint, unsigned: true, default: nil }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.bigint "organization_id", unsigned: true
    t.string "name", null: false
    t.string "full_name", null: false
    t.boolean "private", null: false
    t.datetime "last_updated", precision: nil, null: false
    t.string "description"
    t.integer "pr_count", default: 0, null: false
    t.integer "issue_count", default: 0, null: false
    t.string "master_branch"
    t.index ["id"], name: "repositories_github_id_unique", unique: true
    t.index ["organization_id"], name: "repositories_organization_id_index"
  end

  create_table "repository_users", primary_key: ["repository_id", "user_id"], charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.bigint "repository_id", null: false, unsigned: true
    t.bigint "user_id", null: false, unsigned: true
  end

  create_table "requested_reviewers", id: { type: :bigint, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.bigint "pull_request_id", null: false, unsigned: true
    t.bigint "user_id", null: false, unsigned: true
    t.column "state", "enum('pending','approved','changes_requested','commented')", default: "pending", null: false
    t.column "last_state_before_dismiss", "enum('approved','changes_requested','commented')"
    t.index ["pull_request_id", "user_id"], name: "requested_reviewers_pr_user_unique", unique: true
    t.index ["user_id"], name: "requested_reviewers_user_id_foreign"
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

  create_table "tokens", charset: "utf8mb4", collation: "utf8mb4_general_ci", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "value", null: false
    t.datetime "expires_at", null: false
    t.bigint "account_id", null: false
    t.index ["account_id"], name: "index_tokens_on_account_id"
  end

  create_table "users", id: { type: :bigint, unsigned: true }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.string "name", null: false
    t.string "email", null: false
    t.timestamp "email_verified_at"
    t.string "password", null: false
    t.string "remember_token", limit: 100
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.string "github_username"
    t.index ["email"], name: "users_email_unique", unique: true
  end

  create_table "workflow_jobs", id: { type: :bigint, unsigned: true, default: nil }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.bigint "workflow_id", null: false, unsigned: true
    t.string "name", null: false
    t.text "steps", size: :long, null: false, collation: "utf8mb4_bin"
    t.string "state", default: "queued", null: false
    t.string "conclusion"
    t.index ["workflow_id"], name: "workflow_jobs_workflow_id_foreign"
    t.check_constraint "json_valid(`steps`)", name: "steps"
  end

  create_table "workflows", id: { type: :bigint, unsigned: true, default: nil }, charset: "utf8mb4", collation: "utf8mb4_unicode_ci", force: :cascade do |t|
    t.timestamp "created_at"
    t.timestamp "updated_at"
    t.string "name", null: false
    t.string "state", default: "queued", null: false
    t.string "conclusion"
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "base_comments", "github_users", column: "user_id", name: "issue_comments_user_id_foreign", on_delete: :cascade
  add_foreign_key "base_comments", "items", column: "issue_id", name: "issue_comments_issue_id_foreign", on_delete: :cascade
  add_foreign_key "branches", "repositories", name: "branches_repository_id_foreign", on_delete: :cascade
  add_foreign_key "commits", "github_users", column: "user_id", name: "commits_user_id_foreign", on_delete: :cascade
  add_foreign_key "commits", "repositories", name: "commits_repository_id_foreign", on_delete: :cascade
  add_foreign_key "commits", "workflows", name: "commits_workflow_id_foreign", on_delete: :nullify
  add_foreign_key "issue_assignees", "github_users", column: "user_id", name: "issue_assignees_user_id_foreign", on_delete: :cascade
  add_foreign_key "issue_assignees", "items", column: "issue_id", name: "issue_assignees_issue_id_foreign", on_delete: :cascade
  add_foreign_key "item_labels", "items", name: "item_labels_item_id_foreign", on_delete: :cascade
  add_foreign_key "item_labels", "labels", name: "item_labels_label_id_foreign", on_delete: :cascade
  add_foreign_key "items", "github_users", column: "opened_by_id", name: "items_opened_by_id_foreign", on_delete: :nullify
  add_foreign_key "items", "milestones", name: "items_milestone_id_foreign", on_delete: :nullify
  add_foreign_key "items", "repositories", name: "items_repository_id_foreign", on_delete: :cascade
  add_foreign_key "labels", "repositories", name: "labels_repository_id_foreign", on_delete: :cascade
  add_foreign_key "milestones", "repositories", name: "milestones_repository_id_foreign", on_delete: :cascade
  add_foreign_key "pull_request_reviews", "base_comments", name: "pull_request_reviews_base_comment_id_foreign", on_delete: :cascade
  add_foreign_key "pull_requests", "items", column: "id", name: "pull_requests_id_foreign", on_delete: :cascade
  add_foreign_key "releases", "github_users", column: "author_id", name: "releases_author_id_foreign", on_delete: :nullify
  add_foreign_key "releases", "repositories", name: "releases_repository_id_foreign", on_delete: :cascade
  add_foreign_key "repositories", "organizations", name: "repositories_organization_id_foreign", on_delete: :nullify
  add_foreign_key "repository_users", "repositories", name: "repository_users_repository_id_foreign", on_delete: :cascade
  add_foreign_key "requested_reviewers", "github_users", column: "user_id", name: "requested_reviewers_user_id_foreign", on_delete: :cascade
  add_foreign_key "requested_reviewers", "pull_requests", name: "requested_reviewers_pull_request_id_foreign", on_delete: :cascade
  add_foreign_key "tokens", "accounts"
  add_foreign_key "workflow_jobs", "workflows", name: "workflow_jobs_workflow_id_foreign", on_delete: :cascade
end
