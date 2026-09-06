module Imap
  # Holds one long-lived connection to a credential's INBOX and lets the
  # server announce new mail through IDLE (RFC 2177) instead of polling for
  # it. Arrival-to-stored latency drops to whatever the server takes to
  # notify us, and the TCP + TLS + LOGIN handshake is paid once per session
  # rather than once per poll.
  #
  # This sits *on top of* FetchImapEmailsJob, which is deliberately left
  # running unchanged. IDLE is an accelerator, not a replacement: a server
  # that cannot IDLE, a connection that dies quietly, and the gap between
  # sessions are all still covered by polling, so the worst case here is no
  # worse than polling alone. Both paths importing at once is safe — the
  # unique index on (profile_id, message_id) collapses the race, and a UID
  # already moved out of INBOX is simply not in the other's SEARCH.
  class Watcher
    # RFC 2177 requires re-issuing IDLE at least every 29 minutes. Far under
    # that, because re-arming is nearly free — two round trips (DONE + IDLE)
    # on the connection we already hold, no reconnect — while a short timeout
    # buys two things worth more than the round trips: it bounds how long a
    # connection that has quietly stopped delivering notifications goes
    # undetected (the main way IDLE fails in the wild), and it bounds how
    # stale WatchImapMailboxJob's lease can get, since the lease is only
    # renewed between idles.
    IDLE_TIMEOUT = 2.minutes

    # How long one session runs before exiting cleanly to be restarted by the
    # supervisor. Bounded so a restart or deploy is not left waiting on a
    # connection that is idle by design, and so a mailbox whose notifications
    # have quietly stopped gets a fresh connection on a known schedule.
    SESSION_DURATION = 30.minutes

    def initialize(credential, client: nil, importer: nil, session_duration: SESSION_DURATION)
      @credential = credential
      @client = client || Imap::Client.new(credential)
      # Shares the watcher's connection rather than opening its own, so the
      # archive-mailbox lookup and sender cache survive the whole session.
      @importer = importer || Imap::Importer.new(credential, client: @client)
      @deadline = Time.current + session_duration
    end

    # Runs one watch session. Returns true if the session ran, false if the
    # server cannot IDLE and this mailbox should be left to the poller.
    #
    # Yields after every import pass so the caller can renew a lease or
    # otherwise prove the session is alive.
    def run(&heartbeat)
      @client.connect do |imap|
        unless imap.idle_supported?
          Rails.logger.info("[IMAP] credential=#{@credential.id} server does not advertise IDLE, leaving it to the poller")
          return false
        end

        watch(imap, &heartbeat)
      end

      true
    rescue StandardError => e
      # Deliberately not recorded via record_fetch_failure!. A dropped IDLE
      # connection is routine — servers, NAT and load balancers all reap idle
      # sockets — and says nothing about whether the mailbox is reachable.
      # The poller owns the credential's health fields; treating a reaped
      # socket as a fetch failure would bury real errors in noise.
      Rails.logger.info("[IMAP] credential=#{@credential.id} watch session ended: #{e.class}: #{e.message}")
      true
    end

    private

    # Import first, then wait: mail that landed before this connection was
    # opened is never going to be announced.
    def watch(imap, &heartbeat)
      loop do
        @importer.run_on(imap)
        heartbeat&.call

        # Evaluated once and reused: recomputing it for the IDLE call would
        # leave a window where the deadline passes in between and we ask the
        # server for a zero-second IDLE, spinning DONE/IDLE pairs at it until
        # the next check catches up.
        timeout = idle_timeout
        break if timeout <= 0

        imap.idle(timeout)
      end
    end

    # Never overshoot the deadline: a session that idles past it holds its
    # worker thread for longer than the supervisor expects. Rounded down, so
    # the last IDLE of a session is skipped rather than run past the end.
    def idle_timeout
      [ IDLE_TIMEOUT.to_i, (@deadline - Time.current).floor ].min
    end
  end
end
