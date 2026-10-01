class RemindersController < ApplicationController
  def new
  end

  def index
    @reminders = Reminder.uncompleted.order(created_at: :desc)

    render json: @reminders
  end

  def create
  end

  def update
    @reminder = Reminder.find(params[:id])
    @reminder.update(completed: true)
    render json: @reminder
  end

  def show
  end
end
