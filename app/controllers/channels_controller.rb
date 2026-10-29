class ChannelsController < ApplicationController
  def index
    type = params[:type]

    render json: Channel.joined.active.public_send(type).recently_active.includes(:contact), methods: [ :display_name, :last_message, :last_message_preview ], include: :contact
  end

  def show
    channel = Channel.find(params[:id])
    render json: channel, methods: [ :display_name, :last_message ], include: :contact
  end
end
