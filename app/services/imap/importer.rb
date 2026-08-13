module Imap
  # Fetches every message in a credential's INBOX, persists each one as an
  # Email and archives it on the remote host. Idempotent: dedupes on
  # (profile_id, message_id), and a message is only archived once its Email
  # row is persisted — failures leave it in INBOX for the next run.
  #
  # Work is batched to keep the number of IMAP round trips proportional to the
  # number of batches rather than the number of messages:
  #
  #   1. SEARCH the inbox for UIDs.
  #   2. FETCH just the envelopes and drop UIDs already in the database — those
  #      only need archiving, not a body download.
  #   3. FETCH bodies for the remainder in slices, persisting as we go.
  #   4. MOVE everything that is safely stored, in one batch.
  class Importer
    def initialize(credential, client: nil)
      @credential = credential
      @client = client || Imap::Client.new(credential)
      @senders = {}
    end

    def run
      @client.connect do |imap|
        import_inbox(imap, imap.inbox_uids)
      end
      @credential.record_fetch_success!
    rescue StandardError => e
      # The recurring schedule is the retry mechanism — record and move on.
      @credential.record_fetch_failure!(e)
      Rails.logger.error("[IMAP] credential=#{@credential.id} fetch failed: #{e.class}: #{e.message}")
    end

    private

    def import_inbox(imap, uids)
      uids = Array(uids)
      return if uids.empty?

      already_imported, to_download = partition_by_stored(imap, uids)

      # Anything already in the database just needs to leave INBOX. Without
      # this they would linger and be re-examined on every single run.
      archivable = already_imported

      to_download.each_slice(Imap::Client::BODY_BATCH) do |slice|
        archivable.concat(import_batch(imap, slice))
      end

      archive(imap, archivable)
    end

    # Splits UIDs into those whose Message-ID is already stored and those that
    # still need downloading. A UID lands in the second group whenever we
    # cannot cheaply prove we have it — no envelope, no Message-ID header (the
    # mapper falls back to hashing the raw source), or an envelope fetch that
    # failed outright.
    def partition_by_stored(imap, uids)
      message_ids = imap.message_ids(uids)
      return [ [], uids ] if message_ids.empty?

      stored = Email.where(profile_id: @credential.profile_id, message_id: message_ids.values)
                    .pluck(:message_id)
                    .to_set

      uids.partition { |uid| stored.include?(message_ids[uid]) }
    rescue StandardError => e
      # Never let the optimisation itself break the import.
      Rails.logger.warn("[IMAP] credential=#{@credential.id} envelope prefetch failed, downloading all: #{e.class}: #{e.message}")
      [ [], uids ]
    end

    # Downloads and persists one slice, returning the UIDs safe to archive.
    def import_batch(imap, uids)
      imap.raw_messages(uids).filter_map do |uid, raw|
        import_message(uid, raw)
      end
    rescue StandardError => e
      # A failed slice must not abort the remaining slices; nothing in it is
      # archived, so the next run retries it.
      Rails.logger.warn("[IMAP] credential=#{@credential.id} batch #{uids.first}..#{uids.last} skipped: #{e.class}: #{e.message}")
      []
    end

    # Returns the UID if the message is safely stored, otherwise nil.
    def import_message(uid, raw)
      return nil if raw.blank?

      mapper = Imap::MessageMapper.new(raw, uid: uid, profile_id: @credential.profile_id)
      persist(mapper)&.persisted? ? uid : nil
    rescue StandardError => e
      # One bad message must not block the rest (and is never archived).
      Rails.logger.warn("[IMAP] credential=#{@credential.id} uid=#{uid} skipped: #{e.class}: #{e.message}")
      nil
    end

    def archive(imap, uids)
      return if uids.empty?

      imap.archive(uids)
    rescue StandardError => e
      # The messages are already stored locally, so a failed archive is not a
      # failed import — it just means they get archived on a later run.
      Rails.logger.warn("[IMAP] credential=#{@credential.id} archive of #{uids.size} message(s) failed: #{e.class}: #{e.message}")
    end

    def persist(mapper)
      attrs = mapper.email_attributes

      Email.find_or_create_by(profile_id: attrs[:profile_id], message_id: attrs[:message_id]) do |email|
        email.assign_attributes(attrs)
        email.uuid = SecureRandom.uuid
        email.sender = find_or_update_sender(mapper)
      end
    rescue ActiveRecord::RecordNotUnique
      # Concurrent run won the race on the unique index — the email exists.
      Email.find_by(profile_id: attrs[:profile_id], message_id: attrs[:message_id])
    end

    # Senders repeat heavily within a mailbox, so resolve each address at most
    # once per run.
    def find_or_update_sender(mapper)
      address = mapper.sender_email
      return nil if address.blank?

      sender = @senders[address] ||= Sender.find_or_create_by(email: address)
      name = mapper.sender_name
      sender.update(name: name) if name.present? && sender.name != name
      sender
    end
  end
end
