class ChannelsController < ApplicationController
  def index
    type = params[:type]

    channels = Channel.joined.listed.public_send(type).includes(:contact).to_a
    Channel.preload_for_listing(channels)
    channels = channels.sort_by { |channel| channel.last_message&.created_at || Time.at(0) }.reverse

    render json: channels, methods: [ :display_name, :last_message, :last_message_preview ], include: :contact
  end

  def show
    channel = Channel.find(params[:id])
    render json: channel, methods: [ :display_name, :last_message ], include: :contact
  end
end
