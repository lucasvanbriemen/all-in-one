class AddCreatedAtIndexToEmails < ActiveRecord::Migration[8.0]
  def change
    # EmailsController#index pages through `ORDER BY created_at DESC`, which
    # filesorts the whole table without this. The table has indexes on
    # sent_at/subject/has_read but never had one on created_at.
    add_index :emails, :created_at, name: "emails_created_at_index"
  end
end
