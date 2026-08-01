class EmailsController < ApplicationController
  def new
  end

  def index
    @emails = Email.in_group(params[:path]).order(created_at: :desc)

    if params[:q].present?
      @emails = @emails.where(
        "emails.subject LIKE :q OR emails.sender_name LIKE :q",
        q: "%#{Email.sanitize_sql_like(params[:q])}%"
      )
    end

    @emails = @emails.page(params[:page])
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
