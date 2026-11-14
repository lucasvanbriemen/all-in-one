class NotificationController < ApplicationController
  def new
  end

  def index
    @notififications = Notification.unread.order(created_at: :desc)

    render json: @notififications
  end

  # Unread notifications grouped per source, newest stack first.
  def stacks
    limit = params.fetch(:limit, 50).to_i.clamp(1, 200)
    render json: Notification::Stack.unread(limit: limit)
  end

  # Dismisses a whole stack. Chats go through /channels/:id/mark_as_read
  # instead, which also sends the read receipt.
  def mark_source_as_read
    return head :bad_request if params[:source].blank?

    Notification.unread.where(source: params[:source]).update_all(read: true, updated_at: Time.current)
    render json: { success: true }
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
