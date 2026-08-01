class ImapCredential < ApplicationRecord
  # Whether the connection to the IMAP server should use TLS.
  def ssl?
    %w[ssl tls].include?(encryption.to_s.downcase)
  end

  def record_fetch_success!
    update!(last_fetched_at: Time.current, last_fetch_error: nil, fetch_attempts: 0)
  end

  def record_fetch_failure!(error)
    update!(
      last_fetch_error: "#{error.class}: #{error.message}".truncate(60_000),
      fetch_attempts: fetch_attempts + 1
    )
  end
end
