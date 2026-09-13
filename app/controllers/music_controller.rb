class MusicController < ApplicationController
  def new
  end

  def index
    @songs = Music::Song.liked_songs

    render json: @songs
  end

  # Mirrors the music app's /api/get-mp3/:isrc: downloads the song on first
  # request (see Music::SongCache), then streams the cached file.
  def get_mp3
    isrc = params[:isrc].to_s
    Music::SongCache.ensure_cached(isrc)
    send_audio_file(Music::SongCache.path(isrc))
  rescue Music::DeezerClient::Error
    head :not_found
  end

  # Fire-and-forget warmup for upcoming songs: downloads in the background so
  # pressing play on it later is instant.
  def prepare
    isrc = params[:isrc].to_s
    CacheSongJob.perform_later(isrc) unless Music::SongCache.cached?(isrc)
    head :accepted
  end

  private

  # Lets the front proxy handle Range requests via X-Sendfile in production,
  # or handles a single-range request itself so seeking still works without it.
  def send_audio_file(path)
    return head :not_found unless path.file?

    if Rails.application.config.action_dispatch.x_sendfile_header.present?
      return send_file path, type: "audio/mpeg", disposition: "inline"
    end

    response.headers["Accept-Ranges"] = "bytes"
    ranges = Rack::Utils.get_byte_ranges(request.headers["Range"], path.size)
    if ranges&.one?
      range = ranges.first
      response.headers["Content-Range"] = "bytes #{range.begin}-#{range.end}/#{path.size}"
      send_data File.binread(path, range.size, range.begin),
        type: "audio/mpeg", disposition: "inline", status: :partial_content
    else
      send_file path, type: "audio/mpeg", disposition: "inline"
    end
  end
end
