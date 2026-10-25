class DownloadSlackFilesJob < ApplicationJob
  queue_as :default

  FILES_DIR = Rails.root.join("storage", "files")

  def perform(message_id, files)
    message = Slack::Message.find(message_id)
    FileUtils.mkdir_p(FILES_DIR)

    files.each do |file|
      next if message.file_uploads.exists?(external_id: file["id"])

      id = SecureRandom.uuid
      path = FILES_DIR.join("#{id}#{File.extname(file["name"].to_s)}").to_s

      File.binwrite(path, Slack::Api.download(file["url_private"]))
      message.file_uploads.create!(id: id, path: path, external_id: file["id"], name: file["name"], mimetype: file["mimetype"])
    end
  end
end
