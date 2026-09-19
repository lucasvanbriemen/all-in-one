class MusicController < ApplicationController
  def new
  end

  def index
    @songs = Music::Song.liked_songs

    render json: @songs
  end

  def search
    term = params[:term].to_s.strip
    return render json: [] if term.empty?

    render json: Music::SongSearch.new.search(term)
  end

  def stats
    # Get the songs that have the most seconds played
    top_songs = Music::Song.joins(:plays)
                           .select("songs.*, SUM(plays.seconds_played) AS total_seconds_played, COUNT(plays.id) AS times_played")
                           .group("songs.isrc")
                           .order("total_seconds_played DESC")
                           .limit(10)

    seconds_played = Music::Play.sum(&:seconds_played)
    time_played = TimeConversion.seconds_to_human_readable(seconds_played)
    total_plays = Music::Play.count
    different_plays = Music::Play.select(:song_isrc).distinct.count

    render json: {
      top_songs: top_songs,
      time_played: time_played,
      total_plays: total_plays,
      different_plays: different_plays
    }
  end

  def toggle_favorite
    song = Music::Song.find(params[:id])
    song.toggle_favorite!

    render json: { success: true }
  end

  def show
    isrc = params[:isrc].to_s
    Music::SongDownloader.ensure_downloaded(isrc)
    send_audio_file(Music::SongDownloader.path(isrc))
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
