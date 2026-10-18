class ChannelsController < ApplicationController

  def index
    type = params[:type]
    
    render json: Channel.public_send(type)
  end
end
