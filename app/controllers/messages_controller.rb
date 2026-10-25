class MessagesController < ApplicationController
  def show
    channel = Channel.find(params[:id])

    messages = channel.messages.top_level.includes(:contact, :file_uploads).limit(50)

    render json: messages.as_json(include: :contact, methods: :from_me)
  end

  def new
    Slack::Api.send_message(params[:channel], params[:text])
    render json: { success: true }
  end
end
