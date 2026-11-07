# Counts each mailbox's sent mail over the last day and caches it for the
# server page (ServerData#busy_senders). Lucas rarely sends mail, so a spike
# usually means a leaked password. Gmail files SMTP sends under Sent Mail too,
# so mail sent with stolen credentials still shows up here.
class CountSentImapEmailsJob < ApplicationJob
  queue_as :default

  WINDOW = 24.hours
  # Outlives a couple of missed runs (schedule is every 30 minutes) but goes
  # away if the job stops, rather than showing a stale count forever.
  CACHE_TTL = 2.hours

  def self.cache_key(credential_id)
    "imap:sent_count:#{credential_id}"
  end

  def perform
    ImapCredential.find_each do |credential|
      count = Imap::Client.new(credential).connect { |client| client.sent_count_since(WINDOW.ago) }
      Rails.cache.write(self.class.cache_key(credential.id), count, expires_in: CACHE_TTL)
    rescue StandardError => e
      # One broken mailbox shouldn't stop the others being counted. Fetch
      # failures already show up as "Mailbox failing".
      Rails.logger.warn("[CountSentImapEmailsJob] #{credential.username}: #{e.class}: #{e.message}")
    end
  end
end
