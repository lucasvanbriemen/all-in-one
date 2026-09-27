class MusicController < ApplicationController
  def new
  end

  def index
    @songs = Music::Song.liked_songs

    render json: @songs
  end

  def search
    term = params[:term].to_s.strip
    use_liked_songs = params[:use_liked_songs] == "true"
    return render json: [] if term.empty?

    render json: Music::SongSearch.new.search(term, use_liked_songs: use_liked_songs)
  end

  def toggle_favorite
    song = Music::Song.find(params[:id])
    song.toggle_favorite!

    render json: { success: true }
  end

  def show
    id = params[:id].to_s
    Music::SongDownloader.ensure_downloaded(id)
    send_audio_file(Music::SongDownloader.path(id))
  end

  def prepare_song
    id = params[:id].to_s
    Music::SongDownloader.ensure_downloaded(id)
    render json: { success: true }
  end

  private

  def send_audio_file(path)
    response.headers["Accept-Ranges"] = "bytes"
    ranges = Rack::Utils.get_byte_ranges(request.headers["Range"], path.size)
    if ranges&.one?
      range = ranges.first
      response.headers["Content-Range"] = "bytes #{range.begin}-#{range.end}/#{path.size}"
      send_data File.binread(path, range.size, range.begin), type: "audio/mpeg", disposition: "inline", status: :partial_content
    else
      send_file path, type: "audio/mpeg", disposition: "inline"
    end
  end
end
