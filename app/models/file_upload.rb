class FileUpload < ApplicationRecord
  belongs_to :message

  before_create { self.id ||= SecureRandom.uuid }

  def filename
    name.presence || File.basename(path)
  end
end
