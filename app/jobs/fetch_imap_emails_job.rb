# Fetches one credential's INBOX. Serialized per credential via SolidQueue
# concurrency control so a slow fetch spanning more than one scheduler tick
# never runs twice against the same mailbox; different credentials still
# run in parallel.
class FetchImapEmailsJob < ApplicationJob
  queue_as :default

  limits_concurrency to: 1, key: ->(credential_id) { "imap_fetch_#{credential_id}" }, duration: 15.minutes

  # Credential deleted between enqueue and run.
  discard_on ActiveRecord::RecordNotFound

  def perform(credential_id)
    credential = ImapCredential.find(credential_id)
    Imap::Importer.new(credential).run
  end
end
