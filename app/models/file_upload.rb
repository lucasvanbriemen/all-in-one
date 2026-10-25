class FileUpload < ApplicationRecord
  belongs_to :message

  def filename
    File.basename(path)
  end
end
