class ServerController < ApplicationController
  def new
  end

  def index
    @server_data = ServerData.all

    @server_data.select! { |item| item.fetch(:should_show, true) }

    render json: @server_data
  end

  def create
  end

  def show
  end
end
