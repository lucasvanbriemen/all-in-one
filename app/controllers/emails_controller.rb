class EmailsController < ApplicationController
  def new
  end

  def index
    @page = params[:page] || 1

    @emails = Email.in_group(params[:path]).includes(:sender).order(created_at: :desc).limit(Email::ITEMS_PER_PAGE).offset((@page.to_i - 1) * Email::ITEMS_PER_PAGE)

    @total_pages = (Email.in_group(params[:path]).count / Email::ITEMS_PER_PAGE.to_f).ceil

    render json: {
      emails: @emails.as_json(only: [ :id, :subject, :from, :to, :created_at, :sender_name ], methods: [ :sender_image_url ]),
      total_pages: @total_pages,
      current_page: @page
    }
  end

  def create
  end

  def show
    @email = Email.find(params[:id])

    render json: {
      id: @email.id,
      subject: @email.subject,
      to: @email.to,
      time_ago: helpers.time_ago_in_words(@email.created_at),
      internal: @email.internal?,
      html_body: @email.html_body,
      sender_name: @email.sender&.name,
      sender_email: @email.sender&.email,
      sender_image_url: @email.sender_image_url,
      resize_script: helpers.iframe_resize_script
    }
  end
end
