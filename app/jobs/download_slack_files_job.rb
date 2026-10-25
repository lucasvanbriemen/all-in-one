class DownloadSlackFilesJob < ApplicationJob
  queue_as :default

  FILES_DIR = Rails.root.join("storage", "files")

  def perform(message_id, files)
    message = Slack::Message.find(message_id)
    FileUtils.mkdir_p(FILES_DIR)

    files.each do |file|
      path = FILES_DIR.join("#{file["id"]}-#{file["name"].to_s.gsub(/[^\w.\-]/, "_")}").to_s
      next if message.file_uploads.exists?(path: path)

      File.binwrite(path, Slack::Api.download(file["url_private"]))
      message.file_uploads.create!(path: path)
    end
  end
end
