class EmailsController < ApplicationController
  def new
  end

  def index
    @page = params[:page] || 1

    @emails = Email.in_group(params[:path]).order(created_at: :desc).limit(Email::ITEMS_PER_PAGE).offset((@page.to_i - 1) * Email::ITEMS_PER_PAGE)

    @total_pages = (Email.in_group(params[:path]).count / Email::ITEMS_PER_PAGE.to_f).ceil

    render json: {
      emails: @emails.as_json(only: [ :id, :subject, :from, :to, :created_at ]),
      total_pages: @total_pages,
      current_page: @page
    }
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
