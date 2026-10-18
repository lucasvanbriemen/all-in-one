class MessagesController < ApplicationController

  def show
    type = params[:type]
    channel = Channel.find(params[:id])
    render json: channel.messages
  end

  def new
    Slack::Api.send_message(params[:channel], params[:text])
    render :json { success: true }
  end
end
