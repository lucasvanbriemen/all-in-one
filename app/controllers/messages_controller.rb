class MessagesController < ApplicationController
  def show
    channel = Channel.find(params[:id])

    messages = channel.messages.top_level.includes(:contact, :file_uploads, :reactions).limit(50).order(created_at: :desc)

    render json: messages.as_json(include: [ :contact, :reactions, { file_uploads: { methods: :filename } } ], methods: :from_me)
  end

  def new
    channel = Channel.find(params[:id])
    Slack::Api.send_message(channel.id, params[:text])
    render json: { success: true }
  end
end
