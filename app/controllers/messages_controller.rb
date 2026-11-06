class MessagesController < ApplicationController
  MESSAGE_INCLUDES = [
    { contact: { methods: :display_name } },
    { reactions: { methods: [ :from_me, :emoji ] } },
    { file_uploads: { methods: :filename } },
    { quoted_message: { include: { contact: { methods: :display_name }, file_uploads: { methods: :filename } }, methods: :from_me } }
  ].freeze

  rescue_from Whatsapp::Bridge::Error do |error|
    render json: { error: error.message }, status: error.status
  end

  rescue_from Slack::Api::Error do |error|
    render json: { error: error.message }, status: :bad_gateway
  end

  def show
    channel = Channel.find(params[:id])

    page = [ params[:page].to_i, 1 ].max

    messages = channel.messages.top_level.includes(:contact, :file_uploads, :replies, reactions: :contact, quoted_message: [ :contact, :file_uploads ]).limit(50).offset((page - 1) * 50).order(created_at: :desc).reverse

    mark_as_read(channel) if page == 1

    render json: messages.as_json(include: MESSAGE_INCLUDES, methods: [ :from_me, :reply_count, :platform ])
  end

  def new
    channel = Channel.find(params[:id])
    channel.send_message(params[:text], thread_id: params[:thread_id], quote_id: params[:quote_id])
    render json: { success: true }
  end

  def upload
    channel = Channel.find(params[:id])
    channel.upload(params.require(:file), text: params[:text].presence, thread_id: params[:thread_id], quote_id: params[:quote_id])
    render json: { success: true }
  end

  # Answers with the message's reactions so the app can redraw them without reloading the chat.
  def react
    channel = Channel.find(params[:id])
    message = channel.messages.find(params[:message_id])
    emoji = params.require(:emoji)

    request.delete? ? channel.unreact(message, emoji) : channel.react(message, emoji)

    render json: message.reactions.reload.includes(:contact, :message).as_json(methods: [ :from_me, :emoji ])
  end

  def replies
    message = Message.find(params[:message_id])

    replies = message.replies.includes(:contact, :file_uploads, reactions: :contact, quoted_message: [ :contact, :file_uploads ]).order(created_at: :asc)

    # Merge message itself with its replies
    replies = [ message ] + replies

    render json: replies.as_json(include: MESSAGE_INCLUDES, methods: [ :from_me, :platform ])
  end

  private

  # A failed read receipt must not stop the chat from loading.
  def mark_as_read(channel)
    channel.marked_as_read
  rescue Whatsapp::Bridge::Error => error
    Rails.logger.warn("marking #{channel.id} as read failed: #{error.message}")
  end
end
