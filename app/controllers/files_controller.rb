class FilesController < ApplicationController
  skip_before_action :require_login, only: :show

  def show
    file_upload = FileUpload.find(params[:id])
    send_file file_upload.path, filename: file_upload.filename, type: file_upload.mimetype || "application/octet-stream", disposition: "inline"
  end
end
