class DownloadWhatsappMediaJob < ApplicationJob
  queue_as :default

  FILES_DIR = Rails.root.join("storage", "files")
  # History sync can bring thousands of files; new messages go first.
  HISTORY_PRIORITY = 10

  retry_on Whatsapp::Bridge::Error, wait: 1.minute, attempts: 5 do |job, error|
    Rails.logger.warn("[whatsapp] gave up downloading media for #{job.arguments.first}: #{error.message}")
  end

  def self.extension_for(media)
    Rack::Mime::MIME_TYPES.key(media["mimetype"].to_s.split(";").first) || File.extname(media["filename"].to_s)
  end

  def perform(message_id, kind, media)
    message = Whatsapp::Message.find_by(id: message_id)
    return if message.nil? || message.file_uploads.exists?(external_id: message_id)

    mimetype, bytes = Whatsapp::Bridge.download_media(kind: kind, media: media)

    id = SecureRandom.uuid
    path = FILES_DIR.join("#{id}#{self.class.extension_for(media)}").to_s
    FileUtils.mkdir_p(FILES_DIR)
    File.binwrite(path, bytes)
    message.file_uploads.create!(id: id, path: path, external_id: message_id, name: media["filename"], mimetype: mimetype.presence || media["mimetype"])

    ActionCable.server.broadcast("whatsapp", { type: "chat_changed", jid: message.channel_id })
  rescue Whatsapp::Bridge::Error => e
    # Only an unreachable connector is worth retrying; anything else (usually media WhatsApp no longer has) stays that way.
    raise if e.status >= 503

    Rails.logger.warn("[whatsapp] media for #{message_id} is unavailable: #{e.message}")
  end
end
