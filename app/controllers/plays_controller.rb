class PlaysController < ApplicationController
  PLAY_TIMEOUT = 15.seconds # time distance within which repeated plays are considered the same play

  def create
    song_id = params.require(:song_id)
    seconds_played = params.require(:seconds_played).to_i

    play = Music::Play
      .where(song_id: song_id)
      .where("updated_at > ?", PLAY_TIMEOUT.ago)
      .order(updated_at: :desc)
      .first

    if play.nil? || seconds_played < play.seconds_played
      play = Music::Play.new(song_id: song_id)
    end

    play.seconds_played = seconds_played
    play.save!

    render json: { success: true }
  end

  def show
    # Get the songs that have the most seconds played
    top_songs = Music::Song.joins(:plays)
                           .select("songs.*, SUM(plays.seconds_played) AS total_seconds_played, COUNT(plays.id) AS times_played")
                           .group("songs.id")
                           .order("total_seconds_played DESC")
                           .limit(10)

    seconds_played = Music::Play.sum(&:seconds_played)
    time_played = TimeConversion.seconds_to_human_readable(seconds_played)
    total_plays = Music::Play.count
    different_plays = Music::Play.select(:song_id).distinct.count

    render json: {
      top_songs: top_songs,
      time_played: time_played,
      total_plays: total_plays,
      different_plays: different_plays
    }
  end
end
