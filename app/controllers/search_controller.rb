class SearchController < ApplicationController
  def index
    @query = params[:query]

    @liked_songs = Music::LikedSongMatcher.new.match(@query)
    @channels = Channel.where("name LIKE ?", "%#{@query}%")

    render json: {
      "liked_songs" => @liked_songs,
      "channels" => @channels
    }
  end
end
