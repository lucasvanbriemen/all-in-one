class AddMessageIdToEmails < ActiveRecord::Migration[8.0]
  def change
    # Dedupe key for the IMAP importer: the same Message-ID must never be
    # imported twice for the same profile. Nullable so rows imported before
    # this column existed are unaffected (MySQL allows multiple NULLs in a
    # unique index).
    add_column :emails, :message_id, :string, comment: "RFC822 Message-ID, used to dedupe IMAP imports"
    add_index :emails, [ :profile_id, :message_id ], unique: true, name: "emails_profile_message_id_unique"
  end
end
