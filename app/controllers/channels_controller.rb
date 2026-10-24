class ChannelsController < ApplicationController
  def index
    type = params[:type]

    render json: Channel.joined.active.public_send(type).includes(:contact), methods: [ :display_name, :last_message ], include: :contact
  end
end
