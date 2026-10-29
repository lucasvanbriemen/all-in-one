class MessagesController < ApplicationController
  MESSAGE_INCLUDES = [
    { contact: { methods: :display_name } },
    { reactions: { methods: :from_me } },
    { file_uploads: { methods: :filename } },
    { quoted_message: { include: { contact: { methods: :display_name } }, methods: :from_me } }
  ].freeze

  rescue_from Whatsapp::Bridge::Error do |error|
    render json: { error: error.message }, status: error.status
  end

  def show
    channel = Channel.find(params[:id])

    page = [ params[:page].to_i, 1 ].max

    messages = channel.messages.top_level.includes(:contact, :file_uploads, :replies, reactions: :contact, quoted_message: :contact).limit(50).offset((page - 1) * 50).order(created_at: :desc).reverse

    render json: messages.as_json(include: MESSAGE_INCLUDES, methods: [ :from_me, :reply_count ])
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

  def replies
    message = Message.find(params[:message_id])

    replies = message.replies.includes(:contact, :file_uploads, reactions: :contact).order(created_at: :asc)

    # Merge message itself with its replies
    replies = [ message ] + replies

    render json: replies.as_json(include: MESSAGE_INCLUDES, methods: :from_me)
  end
end
