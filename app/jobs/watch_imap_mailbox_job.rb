# Runs one IDLE watch session for a credential (see Imap::Watcher).
#
# The session occupies its worker thread for as long as it lasts, so the
# schedule re-enqueues this every minute purely to restart sessions that have
# ended or died. A cache lease, not SolidQueue's concurrency control, keeps
# those re-enqueues from stacking up: limits_concurrency would *block* each
# one and then release the whole backlog at once when the session finally
# finished, which is exactly the stampede FetchImapEmailsJob guards against.
# A lease lets a redundant enqueue return immediately instead.
class WatchImapMailboxJob < ApplicationJob
  queue_as :default

  # Credential deleted between enqueue and run.
  discard_on ActiveRecord::RecordNotFound

  # Long enough to span one IDLE timeout plus the import pass that follows it,
  # since the lease is only renewed once per loop. Kept tight beyond that: a
  # process killed mid-session (a deploy, say) cannot run its ensure block, so
  # the lease outlives it and this mailbox sits on poll-interval latency until
  # it expires. The slack over IDLE_TIMEOUT is the import budget — overrun it
  # and a second watcher starts alongside the first, which is wasteful but not
  # harmful: the unique index on (profile_id, message_id) collapses the
  # duplicate imports and the token check stops either evicting the other.
  LEASE_TTL = Imap::Watcher::IDLE_TIMEOUT + 3.minutes

  def perform(credential_id)
    token = SecureRandom.uuid
    return unless acquire_lease(credential_id, token)

    begin
      credential = ImapCredential.find(credential_id)
      Imap::Watcher.new(credential).run { renew_lease(credential_id, token) }
    ensure
      release_lease(credential_id, token)
    end
  end

  # Whether a session is currently watching this mailbox.
  def self.watching?(credential_id)
    Rails.cache.read(lease_key(credential_id)).present?
  end

  def self.lease_key(credential_id)
    "imap:watcher:#{credential_id}"
  end

  private

  def acquire_lease(credential_id, token)
    Rails.cache.write(self.class.lease_key(credential_id), token, unless_exist: true, expires_in: LEASE_TTL)
  end

  def renew_lease(credential_id, token)
    Rails.cache.write(self.class.lease_key(credential_id), token, expires_in: LEASE_TTL)
  end

  # Only ever drop our own lease. Without the token check, a session that
  # overran its lease would release the lease of the session that replaced it.
  def release_lease(credential_id, token)
    key = self.class.lease_key(credential_id)
    Rails.cache.delete(key) if Rails.cache.read(key) == token
  end
end
