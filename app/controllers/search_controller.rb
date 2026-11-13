class SearchController < ApplicationController
  def index
    @query = params[:query]

    @liked_songs = Music::LikedSongMatcher.new.match(@query)
    @channels = Channel.where("name LIKE ?", "%#{@query}%")

    @results = []

    @liked_songs.each { |song|
      @results << { type: "liked_song", data: song }
    }

    render json: {
      "results" => @results
    }
  end
end
