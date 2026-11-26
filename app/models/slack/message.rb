class Slack::Message < Message
  # A forwarded message (or a pasted link to one) arrives as an attachment next to
  # the comment, which is all "text" holds. Keep what was shared as a quote below it.
  def self.body_from(event)
    parts = [ event["text"].presence ]

    shared_attachments(event).each do |attachment|
      text = attachment["text"].presence || attachment["fallback"].presence
      next unless text

      lines = text.lines.map { |line| "> #{line.chomp}" }
      lines.unshift("> *#{attachment["author_name"]}*") if attachment["author_name"].present?
      parts << lines.join("\n")
    end

    parts.compact.join("\n").presence
  end

  # Files of the message itself and of anything forwarded with it.
  def self.files_from(event)
    Array(event["files"]) + shared_attachments(event).flat_map { |attachment| Array(attachment["files"]) }
  end

  # Link previews of ordinary websites are attachments too; only shared messages count.
  def self.shared_attachments(event)
    Array(event["attachments"]).select { |attachment| attachment["is_share"] || attachment["is_msg_unfurl"] }
  end
end
