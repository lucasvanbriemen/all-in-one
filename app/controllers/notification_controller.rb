class NotificationController < ApplicationController
  def new
  end

  def index
    @notififications = Notification.unread.order(created_at: :desc)

    render json: { server_data: @server_data, notifications: @notififications }
  end

  def create
  end

  def update
    @notification = Notification.find(params[:id])
    @notification.update(read: true)
    render json: { notification: @notification }
  end

  def show
  end
end
