class RemindersController < ApplicationController
  def index
    @reminders = Reminder.reminding.order(remind_at: :asc, created_at: :asc)

    render json: @reminders
  end

  def create
    @reminder = Reminder.new(reminder_params)

    if @reminder.save
      render json: @reminder, status: :created
    else
      render json: { errors: @reminder.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    @reminder = Reminder.find(params[:id])
    @reminder.update(completed: true)
    render json: @reminder
  end

  private

  def reminder_params
    params.permit(:title, :description, :remind_at)
  end
end
