class CleanUpEmails < ActiveRecord::Migration[8.0]
  # Leftovers from the old Laravel email app. Nothing in this codebase reads
  # or writes any of these anymore; login is handled by login.ltvb.nl and
  # Solid Cache/Queue live in their own SQLite databases.
  # Ordered children-first: tags and profiles reference profiles/users.
  UNUSED_TABLES = %w[
    attachments
    folders
    tags
    sessions
    profiles
    users
    smtp_credentials
    system_info
    password_reset_tokens
    personal_access_tokens
    migrations
    jobs
    failed_jobs
    job_batches
    cache
    cache_locks
    device_tokens
    devices
  ].freeze

  # Columns that nothing reads anymore (uid and sent_at were only ever written).
  UNUSED_COLUMNS = {
    emails: %i[uuid uid sent_at folder_id tag_id is_archived is_starred is_deleted has_read],
    senders: %i[image_path top_level_domain],
    imap_credentials: %i[protocol]
  }.freeze

  def up
    # Foreign keys from emails must go before the tables they point at.
    remove_foreign_key :emails, :folders, if_exists: true
    remove_foreign_key :emails, :tags, if_exists: true

    UNUSED_COLUMNS.each do |table, columns|
      columns.each { |column| remove_column table, column, if_exists: true }
    end

    # The old DB may carry constraints the schema dump does not show.
    execute "SET FOREIGN_KEY_CHECKS = 0"
    UNUSED_TABLES.each do |table|
      drop_table table, if_exists: true
    end
    execute "SET FOREIGN_KEY_CHECKS = 1"
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end
end
