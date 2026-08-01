require "mail"
require "digest"

module Imap
  # Maps a raw RFC822 message to Email attributes. Pure: no DB, no network.
  class MessageMapper
    def initialize(raw_source, uid:, profile_id:)
      @raw_source = raw_source
      @mail = Mail.read_from_string(raw_source)
      @uid = uid
      @profile_id = profile_id
    end

    def email_attributes
      {
        message_id: message_identifier,
        uid: @uid.to_s,
        subject: clean(@mail.subject),
        to: clean(to_addresses),
        sent_at: @mail.date&.to_time,
        html_body: html_body,
        sender_name: clean(sender_name),
        profile_id: @profile_id
      }
    end

    def sender_email
      clean(@mail.from&.first)&.downcase.presence
    end

    def sender_name
      @mail[:from]&.display_names&.first
    end

    private

    # Message-ID when present, otherwise a digest of the raw source so the
    # same physical message still dedupes across runs.
    def message_identifier
      mid = @mail.message_id
      mid.present? ? clean(mid) : "sha256:#{Digest::SHA256.hexdigest(@raw_source)}"
    end

    def to_addresses
      Array(@mail.to).join(", ").presence
    end

    # html_body is NOT NULL — always return a string. Prefer the HTML part,
    # fall back to the text part wrapped in <pre>.
    def html_body
      body =
        if @mail.html_part
          @mail.html_part.decoded
        elsif @mail.text_part
          wrap_text(@mail.text_part.decoded)
        elsif @mail.multipart?
          ""
        elsif @mail.mime_type.to_s == "text/html"
          @mail.decoded
        else
          wrap_text(@mail.decoded.to_s)
        end

      clean(body).to_s
    end

    def wrap_text(text)
      "<pre>#{ERB::Util.html_escape(text)}</pre>"
    end

    # Force UTF-8 and drop invalid bytes so MySQL utf8mb4 inserts never fail.
    def clean(str)
      return nil if str.nil?

      str.to_s.dup.force_encoding(Encoding::UTF_8).scrub("")
    end
  end
end
