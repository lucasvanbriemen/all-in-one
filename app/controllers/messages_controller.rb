class MessagesController < ApplicationController
  def show
    channel = Channel.find(params[:id])

    messages = channel.messages.top_level.includes(:contact)

    render json: messages
  end

  def new
    Slack::Api.send_message(params[:channel], params[:text])
    render json: { success: true }
  end
end
