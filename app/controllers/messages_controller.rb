class MessagesController < ApplicationController
  MESSAGE_INCLUDES = [
    { contact: { methods: :display_name } },
    { reactions: { methods: [ :from_me, :emoji, :emoji_url ] } },
    { file_uploads: { methods: :filename } },
    { quoted_message: { include: { contact: { methods: :display_name }, file_uploads: { methods: :filename } }, methods: :from_me } }
  ].freeze

  rescue_from Whatsapp::Bridge::Error do |error|
    render json: { error: error.message }, status: error.status
  end

  def show
    channel = Channel.find(params[:id])

    page = [ params[:page].to_i, 1 ].max

    messages = channel.messages.top_level.includes(:contact, :file_uploads, :replies, reactions: :contact, quoted_message: [ :contact, :file_uploads ]).limit(50).offset((page - 1) * 50).order(created_at: :desc).reverse

    mark_as_read(channel) if page == 1

    render json: with_emoji(with_mentions(messages.as_json(include: MESSAGE_INCLUDES, methods: [ :from_me, :reply_count, :platform ])))
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

    render json: message.reactions.reload.includes(:contact, :message).as_json(methods: [ :from_me, :emoji, :emoji_url ])
  end

  def replies
    message = Message.find(params[:message_id])

    replies = message.replies.includes(:contact, :file_uploads, reactions: :contact, quoted_message: [ :contact, :file_uploads ]).order(created_at: :asc)

    # Merge message itself with its replies
    replies = [ message ] + replies

    render json: with_emoji(with_mentions(replies.as_json(include: MESSAGE_INCLUDES, methods: [ :from_me, :platform ])))
  end

  private

  # Slack :shortcodes: in the body, as emoji or (custom ones) image URLs.
  def with_emoji(json)
    json.each do |message|
      next unless message["platform"] == "slack"

      emoji = Slack::Emoji.in_text(message["body"])
      message["emoji"] = emoji if emoji.any?
    end
  end

  MENTION = /<[@#](\w+)/

  # Slack writes mentions as <@U123> / <#C123>; give each message the names it needs,
  # looked up in one query for the whole page. Mine are flagged so the app can highlight them.
  def with_mentions(json)
    ids = json.flat_map { |message| message["body"].to_s.scan(MENTION).flatten }.uniq
    return json if ids.empty?

    names = Contact.where(id: ids).pluck(:id, :name).to_h { |id, name| [ id, { name: name, me: Contact::MY_CONTACT_IDS.include?(id) } ] }
      .merge(Channel.where(id: ids).pluck(:id, :name).to_h { |id, name| [ id, { name: name, me: false } ] })
    json.each do |message|
      mentioned = message["body"].to_s.scan(MENTION).flatten
      message["mentions"] = names.slice(*mentioned) if mentioned.any?
    end
  end

  # A failed read receipt must not stop the chat from loading.
  def mark_as_read(channel)
    channel.mark_read!
  rescue Whatsapp::Bridge::Error => error
    Rails.logger.warn("marking #{channel.id} as read failed: #{error.message}")
  end
end
