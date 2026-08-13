# Fetches one credential's INBOX. Serialized per credential via SolidQueue
# concurrency control so a slow fetch spanning more than one scheduler tick
# never runs twice against the same mailbox; different credentials still
# run in parallel.
class FetchImapEmailsJob < ApplicationJob
  queue_as :default

  limits_concurrency to: 1, key: ->(credential_id) { "imap_fetch_#{credential_id}" }, duration: 15.minutes

  # Credential deleted between enqueue and run.
  discard_on ActiveRecord::RecordNotFound

  # Shortest gap between two fetches of the same mailbox. The schedule ticks
  # every IMAP_FETCH_INTERVAL_SECONDS (see config/recurring.yml); if a fetch
  # ever overruns a tick, the concurrency limit above queues the ticks behind
  # it and they would all run back to back once it finishes. Half the interval
  # leaves normal ticks untouched while collapsing that backlog into no-ops.
  MIN_FETCH_INTERVAL = (ENV.fetch("IMAP_FETCH_INTERVAL_SECONDS", 15).to_i / 2.0).seconds

  def perform(credential_id)
    return if recently_attempted?(credential_id)

    mark_attempted(credential_id)

    credential = ImapCredential.find(credential_id)
    Imap::Importer.new(credential).run
  end

  private

  # Deliberately kept out of the shared email database: this is scheduling
  # bookkeeping, not data. `last_fetched_at` keeps its existing meaning.
  def recently_attempted?(credential_id)
    Rails.cache.read(attempt_cache_key(credential_id)).present?
  end

  def mark_attempted(credential_id)
    Rails.cache.write(attempt_cache_key(credential_id), true, expires_in: MIN_FETCH_INTERVAL)
  end

  def attempt_cache_key(credential_id)
    "imap:last_attempt:#{credential_id}"
  end
end
