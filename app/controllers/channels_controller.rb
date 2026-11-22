class ChannelsController < ApplicationController
  def index
    type = params[:type]

    channels = Channel.joined.listed.where(dismissed: false).public_send(type).includes(:contact).to_a
    Channel.preload_for_listing(channels)
    channels = channels.sort_by { |channel| channel.last_message&.created_at || Time.at(0) }.reverse

    render json: channels, methods: [ :display_name, :last_message, :last_message_preview, :unread_count ], include: :contact
  end

  def show
    channel = Channel.find(params[:id])
    render json: channel, methods: [ :display_name, :last_message, :muted ], include: :contact
  end

  # Takes a chat out of the list (or puts it back); search still finds it.
  def dismiss
    channel = Channel.find(params[:id])
    channel.update!(dismissed: params[:dismissed] != false && params[:dismissed] != "false")
    MessagesChannel.chat_changed(channel.id, platform: channel.channel_type)
    render json: { dismissed: channel.dismissed }
  end

  def mark_as_read
    channel = Channel.find(params[:id])
    channel.mark_read!
    render json: { success: true }
  end
end
