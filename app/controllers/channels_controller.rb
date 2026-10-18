class ChannelsController < ApplicationController

  def index
    type = params[:type]
    
    render json: Channel.joined.public_send(type)
  end
end
