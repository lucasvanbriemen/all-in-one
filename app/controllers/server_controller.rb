class ServerController < ApplicationController
  def new
  end

  def index
    @server_data = ServerData.all
    @notififications = Notification.unread.order(created_at: :desc)

    render json: { server_data: @server_data, notifications: @notififications }
  end

  def create
  end

  def show
  end
end
