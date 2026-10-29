class FileUpload < ApplicationRecord
  belongs_to :message

  before_create { self.id ||= SecureRandom.uuid }
  after_destroy_commit { FileUtils.rm_f(path) if path.present? }

  def filename
    name.presence || File.basename(path)
  end
end
