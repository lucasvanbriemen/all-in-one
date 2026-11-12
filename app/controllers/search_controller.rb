class SearchController < ApplicationController
  def index
    @query = params[:query]

    @liked_songs = Music::LikedSongMatcher.new.match(@query)

    render json: {
      "liked_songs" => @liked_songs
    }
  end
end
