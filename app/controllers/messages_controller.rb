class MessagesController < ApplicationController

  def show
    type = params[:type]
    channel = Channel.find(params[:id])
    render json: channel.messages
  end
end
