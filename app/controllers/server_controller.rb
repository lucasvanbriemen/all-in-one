class ServerController < ApplicationController
  def new
  end

  def index
    @serverData = ServerData.all

    render json: @serverData
  end

  def create
  end

  def show
  end
end
