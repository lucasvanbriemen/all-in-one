module Imap
  # Fetches every message in a credential's INBOX, persists each one as an
  # Email and archives it on the remote host. Idempotent: dedupes on
  # (profile_id, message_id), and a message is only archived once its Email
  # row is persisted — failures leave it in INBOX for the next run.
  class Importer
    def initialize(credential, client: nil)
      @credential = credential
      @client = client || Imap::Client.new(credential)
    end

    def run
      @client.connect do |imap|
        imap.inbox_uids.each { |uid| import_uid(imap, uid) }
      end
      @credential.record_fetch_success!
    rescue StandardError => e
      # The every-minute schedule is the retry mechanism — record and move on.
      @credential.record_fetch_failure!(e)
      Rails.logger.error("[IMAP] credential=#{@credential.id} fetch failed: #{e.class}: #{e.message}")
    end

    private

    def import_uid(imap, uid)
      raw = imap.raw_message(uid)
      return if raw.blank?

      mapper = Imap::MessageMapper.new(raw, uid: uid, profile_id: @credential.profile_id)
      email = persist(mapper)

      # Only archive once the Email row exists locally.
      imap.archive(uid) if email&.persisted?
    rescue StandardError => e
      # One bad message must not block the rest (and is never archived).
      Rails.logger.warn("[IMAP] credential=#{@credential.id} uid=#{uid} skipped: #{e.class}: #{e.message}")
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

    def find_or_update_sender(mapper)
      address = mapper.sender_email
      return nil if address.blank?

      sender = Sender.find_or_create_by(email: address)
      name = mapper.sender_name
      sender.update(name: name) if name.present? && sender.name != name
      sender
    end
  end
end
