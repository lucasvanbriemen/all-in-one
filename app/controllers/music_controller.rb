class MusicController < ApplicationController
  def new
  end

  def index
    @songs = Music::Song.liked_songs

    render json: @songs
  end

  def get_mp3
    isrc = params[:isrc].to_s
    Music::SongCache.ensure_cached(isrc)
    send_audio_file(Music::SongCache.path(isrc))
  end

  def preload_song
    isrc = params[:isrc].to_s
    CacheSongJob.perform_later(isrc) unless Music::SongCache.cached?(isrc)
    head :accepted
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
