class ChannelsController < ApplicationController

  def index
    type = params[:type]
    
    render json: Channel.joined.active.public_send(type), methods: [:display_name, :last_message]
  end
end
