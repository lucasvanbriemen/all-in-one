class EmailsController < ApplicationController
  def new
  end

  def index
    @page = params[:page] || 1

    @emails = Email.in_group(params[:path]).order(created_at: :desc).limit(50).offset((@page.to_i - 1) * 50)
    render json: @emails
  end

  def create
  end

  def show
    @email = Email.find(params[:id])

    render partial: "show", locals: { email: @email }
  end

  private

  def session_params
    params.fetch(:session, {}).permit(:email, :password, :redirect_to)
  end
end
