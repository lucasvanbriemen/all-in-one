class FilesController < ApplicationController
  skip_before_action :require_login, only: :show

  def show
    file_upload = FileUpload.find(params[:id])
    type = file_upload.mimetype || "application/octet-stream"
    size = File.size(file_upload.path)
    response.headers["Accept-Ranges"] = "bytes"

    # WebKit only plays audio/video from servers that honour byte ranges.
    ranges = Rack::Utils.get_byte_ranges(request.headers["Range"], size)
    if ranges&.one?
      range = ranges.first
      response.headers["Content-Range"] = "bytes #{range.begin}-#{range.end}/#{size}"
      bytes = File.open(file_upload.path, "rb") { |file| file.seek(range.begin) && file.read(range.size) }
      send_data bytes, type: type, disposition: "inline", status: :partial_content
    else
      send_file file_upload.path, filename: file_upload.filename, type: type, disposition: "inline"
    end
  end
end
