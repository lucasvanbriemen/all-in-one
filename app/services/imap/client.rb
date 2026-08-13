require "net/imap"

module Imap
  # Thin wrapper around Net::IMAP exposing exactly the operations the
  # importer needs, so the importer can be tested against a stub.
  #
  # Every operation is batched: IMAP is a request/response protocol over a
  # single socket, so wall-clock time is dominated by round trips rather than
  # bytes. One command covering 50 messages beats 50 commands.
  class Client
    INBOX = "INBOX".freeze
    ARCHIVE_MAILBOX = "Archive".freeze
    OPEN_TIMEOUT = 15

    # Envelopes are small, so a wide batch is cheap. Bodies are not: 25 full
    # messages is a reasonable ceiling on how much we buffer in memory at once.
    ENVELOPE_BATCH = 500
    BODY_BATCH = 25
    ARCHIVE_BATCH = 200

    # How long a resolved archive mailbox name stays cached. Bounded so a
    # mailbox renamed on the server heals without a deploy.
    ARCHIVE_MAILBOX_TTL = 1.day

    def initialize(credential)
      @credential = credential
      @imap = nil
    end

    # Connect, login and select INBOX. Yields self and guarantees the
    # connection is closed afterwards, even on error.
    def connect
      @imap = Net::IMAP.new(
        @credential.host,
        port: @credential.port,
        ssl: ssl_options,
        open_timeout: OPEN_TIMEOUT
      )
      @imap.login(@credential.username, @credential.password)
      @imap.select(INBOX)
      yield self
    ensure
      disconnect
    end

    # All UIDs currently in INBOX. Everything in there counts as "new",
    # because imported messages are archived out of INBOX.
    def inbox_uids
      @imap.uid_search([ "ALL" ])
    end

    # uid => RFC822 Message-ID for the given UIDs, in as few round trips as
    # possible. Lets the importer discard messages it already has without
    # paying to download their bodies. UIDs the server omits (deleted since
    # the SEARCH) and messages with no Message-ID header are absent from the
    # result, so callers must treat "missing" as "unknown".
    def message_ids(uids)
      each_batch(uids, ENVELOPE_BATCH, [ "UID", "ENVELOPE" ]) do |data, result|
        message_id = normalize_message_id(data.envelope&.message_id)
        result[data.uid] = message_id if message_id.present?
      end
    end

    # uid => raw RFC822 source. PEEK avoids setting \Seen, so a message that
    # fails to import stays untouched for the next run.
    def raw_messages(uids)
      each_batch(uids, BODY_BATCH, [ "UID", "BODY.PEEK[]" ]) do |data, result|
        # The response is keyed "BODY[]" — servers strip the .PEEK modifier.
        body = data.attr["BODY[]"]
        result[data.uid] = body if body.present?
      end
    end

    # Move messages to the archive mailbox, creating it if missing. Falls back
    # to COPY + \Deleted + EXPUNGE on servers without MOVE. Batched, so the
    # whole run costs a constant number of round trips instead of one set per
    # message.
    def archive(uids)
      uids = Array(uids)
      return if uids.empty?

      mailbox = archive_mailbox
      movable = @imap.capabilities.include?("MOVE")

      uids.each_slice(ARCHIVE_BATCH) do |slice|
        if movable
          @imap.uid_move(slice, mailbox)
        else
          @imap.uid_copy(slice, mailbox)
          @imap.uid_store(slice, "+FLAGS", [ :Deleted ])
          @imap.expunge
        end
      end
    rescue Net::IMAP::NoResponseError, Net::IMAP::BadResponseError
      # The cached name may point at a mailbox that no longer exists. Drop it
      # so the next run rediscovers rather than failing for the whole TTL.
      forget_archive_mailbox
      raise
    end

    private

    # An IMAP ENVELOPE carries the Message-ID exactly as it appears in the
    # header, angle brackets included ("<abc@host>"). Mail::Message#message_id
    # strips them, and that stripped form is what Imap::MessageMapper stores.
    # Without matching the two representations here, every comparison against
    # a stored message_id fails and the dedupe silently does nothing.
    def normalize_message_id(value)
      return nil if value.nil?

      value.to_s.dup.force_encoding(Encoding::UTF_8).scrub("").strip.delete_prefix("<").delete_suffix(">")
    end

    # Runs one UID FETCH per slice and folds the responses into a single
    # uid => value hash. Keyed off the UID in the response, never the request
    # order — servers may reorder or omit messages.
    def each_batch(uids, size, attributes)
      uids = Array(uids)
      return {} if uids.empty?

      uids.each_slice(size).each_with_object({}) do |slice, result|
        Array(@imap.uid_fetch(slice, attributes)).each do |data|
          next if data.uid.nil?

          yield data, result
        end
      end
    end

    # The mailbox to archive into. Resolving it costs a LIST (slow on accounts
    # with many folders) plus a NAMESPACE, so the answer is cached across runs
    # and memoized within one.
    def archive_mailbox
      @archive_mailbox ||= Rails.cache.fetch(archive_mailbox_cache_key, expires_in: ARCHIVE_MAILBOX_TTL) do
        discover_archive_mailbox
      end
    end

    def forget_archive_mailbox
      @archive_mailbox = nil
      Rails.cache.delete(archive_mailbox_cache_key)
    end

    def archive_mailbox_cache_key
      "imap:archive_mailbox:#{@credential.id}"
    end

    # An existing mailbox the server advertises as \Archive (SPECIAL-USE), an
    # existing "Archive"/"INBOX.Archive", or a freshly created "Archive" under
    # the personal namespace prefix (Dovecot and friends require e.g.
    # "INBOX.Archive").
    def discover_archive_mailbox
      mailboxes = @imap.list("", "*") || []

      special_use = mailboxes.find { |mb| mb.attr.include?(:Archive) }
      existing = mailboxes.find { |mb| mb.name.split(%r{[/.]}).last.casecmp?(ARCHIVE_MAILBOX) }

      if special_use || existing
        (special_use || existing).name
      else
        name = "#{personal_namespace_prefix}#{ARCHIVE_MAILBOX}"
        @imap.create(name)
        name
      end
    end

    # e.g. "INBOX." on Dovecot with an INBOX namespace, "" on Gmail.
    def personal_namespace_prefix
      @imap.namespace.personal.first&.prefix.to_s
    rescue Net::IMAP::Error
      ""
    end

    def ssl_options
      return false unless @credential.ssl?

      @credential.validate_cert ? true : { verify_mode: OpenSSL::SSL::VERIFY_NONE }
    end

    def disconnect
      @imap&.logout
    rescue StandardError
      nil
    ensure
      begin
        @imap&.disconnect
      rescue StandardError
        nil
      end
    end
  end
end
