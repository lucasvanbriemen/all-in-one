class MusicController < ApplicationController
  def new
  end

  def index
    Music::Song.liked_songs
  end

  def create
  end

  def show
  end
end
