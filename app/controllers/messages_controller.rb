class MessagesController < ApplicationController
  def show
    channel = Channel.find(params[:id])

    page = [ params[:page].to_i, 1 ].max

    messages = channel.messages.top_level.includes(:contact, :file_uploads, :reactions, :replies).limit(50).offset((page - 1) * 50).order(created_at: :desc).reverse

    render json: messages.as_json(include: [ :contact, :reactions, { file_uploads: { methods: :filename } } ], methods: [ :from_me, :reply_count ])
  end

  def new
    channel = Channel.find(params[:id])
    thread_ts = params[:thread_id].to_s.delete_prefix("#{channel.id}-").presence
    Slack::Api.send_message(channel.id, params[:text], thread_ts: thread_ts)
    render json: { success: true }
  end

  def upload
    channel = Channel.find(params[:id])
    file = params.require(:file)
    thread_ts = params[:thread_id].to_s.delete_prefix("#{channel.id}-").presence
    Slack::Api.upload_file(channel.id, data: file.read, filename: file.original_filename, comment: params[:text].presence, thread_ts: thread_ts)
    render json: { success: true }
  end

  def replies
    message = Message.find(params[:message_id])

    replies = message.replies.includes(:contact, :file_uploads, :reactions).order(created_at: :asc)

    # Merge message itself with its replies
    replies = [ message ] + replies

    render json: replies.as_json(include: [ :contact, :reactions, { file_uploads: { methods: :filename } } ], methods: :from_me)
  end
end
