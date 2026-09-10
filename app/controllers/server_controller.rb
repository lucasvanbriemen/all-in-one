class ServerController < ApplicationController
  def new
  end

  def index
    @server_data = ServerData.all

    render json: @server_data
  end

  def create
  end

  def show
  end
end
