class PlaysController < ApplicationController
  def new
  end

  def update
  end

  def show
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
end
