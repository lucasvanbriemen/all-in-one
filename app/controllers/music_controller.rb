class MusicController < ApplicationController
  def new
  end

  def index
    @songs = Music::Song.liked_songs

    render json: @songs
  end

  def create
  end

  def show
  end
end
