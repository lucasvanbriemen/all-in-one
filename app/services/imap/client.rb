require "net/imap"

module Imap
  # Thin wrapper around Net::IMAP exposing exactly the operations the
  # importer needs, so the importer can be tested against a stub.
  class Client
    INBOX = "INBOX".freeze
    ARCHIVE_MAILBOX = "Archive".freeze
    OPEN_TIMEOUT = 15

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

    # Raw RFC822 source for a UID. PEEK avoids setting \Seen, so a message
    # that fails to import stays untouched for the next run.
    def raw_message(uid)
      data = @imap.uid_fetch(uid, [ "BODY.PEEK[]" ])
      return nil if data.blank?

      # The response is keyed "BODY[]" — servers strip the .PEEK modifier.
      data.first.attr["BODY[]"]
    end

    # Move a message to the archive mailbox, creating it if missing.
    # Falls back to COPY + \Deleted + EXPUNGE on servers without MOVE.
    def archive(uid)
      mailbox = archive_mailbox

      if @imap.capabilities.include?("MOVE")
        @imap.uid_move(uid, mailbox)
      else
        @imap.uid_copy(uid, mailbox)
        @imap.uid_store(uid, "+FLAGS", [ :Deleted ])
        @imap.expunge
      end
    end

    private

    # The mailbox to archive into: an existing one the server advertises as
    # \Archive (SPECIAL-USE), an existing "Archive"/"INBOX.Archive", or a
    # freshly created "Archive" under the personal namespace prefix (Dovecot
    # and friends require e.g. "INBOX.Archive").
    def archive_mailbox
      @archive_mailbox ||= begin
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
