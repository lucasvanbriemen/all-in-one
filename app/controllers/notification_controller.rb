class NotificationController < ApplicationController
  def new
  end

  def index
    @notifications = Notification.unread.order(created_at: :desc)

    render json: @notifications
  end

  def create
  end

  def update
    @notification = Notification.find(params[:id])
    @notification.update(read: true)
    render json: @notification
  end

  def show
  end
end
