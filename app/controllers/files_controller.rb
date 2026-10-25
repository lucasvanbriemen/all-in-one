class FilesController < ApplicationController
  def show
    file_upload = FileUpload.find(params[:id])
    # send whatever is at file_upload.path
    send_file file_upload.path, filename: file_upload.filename
  end
end
