class SearchController < ApplicationController
  def index
    @query = params[:query]

    @liked_songs = Music::LikedSongMatcher.new.match(@query)
    @channels = Channel.where("name LIKE ?", "%#{@query}%")

    @results = []

    @liked_songs.each { |song|
      @results << {
        type: "liked_song",
        source: "music.songs.#{song.id}",
        title: song.title,
        subtitle: song.artist
      }
    }

    render json: {
      "results" => @results
    }
  end
end
