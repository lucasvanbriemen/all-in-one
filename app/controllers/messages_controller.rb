# Conversations and messages across providers, served as JSON to the app.
class MessagesController < ApplicationController
  def index
    scope = Messaging::Conversation.includes(:account).recent
    scope = scope.visible unless params[:archived] == "true"
    scope = scope.where(accounts: { provider: params[:provider] }) if params[:provider].present?

    render json: scope.limit(ApplicationRecord::ITEMS_PER_PAGE).map(&:as_json)
  end

  def show
    conversation = Messaging::Conversation.find(params[:id])
    page = params[:page].to_i.clamp(1, 10_000)
    messages = conversation.messages.includes(:reactions).order(sent_at: :desc, id: :desc)
      .limit(ApplicationRecord::ITEMS_PER_PAGE).offset((page - 1) * ApplicationRecord::ITEMS_PER_PAGE)

    render json: {
      conversation: conversation.as_json(extra: { participants: conversation.participants }),
      messages: messages.reverse.map(&:as_json),
      page: page,
      has_more: messages.size == ApplicationRecord::ITEMS_PER_PAGE
    }
  end

  def create
    conversation = Messaging::Conversation.find(params[:id])
    text = params[:text].to_s.strip
    return render json: { error: "text is required" }, status: :unprocessable_entity if text.empty?

    sent = Messaging::Whatsapp::Client.send_text(to: conversation.external_id, text: text, quote_id: params[:quote_id])
    message = conversation.messages.create_with(
      sender_id: conversation.account.external_id, from_me: true, kind: "extendedTextMessage",
      body: text, quoted_external_id: params[:quote_id], status: 1, sent_at: sent["sent_at"] || Time.current, live: true
    ).find_or_create_by!(external_id: sent["id"])
    conversation.update!(last_message_at: message.sent_at)

    render json: message, status: :created
  rescue Messaging::Whatsapp::Client::Error => e
    render json: { error: e.message }, status: e.status || :bad_gateway
  end

  def react
    message = Messaging::Message.find(params[:message_id])
    conversation = message.conversation
    Messaging::Whatsapp::Client.react(
      chat: conversation.external_id, message_id: message.external_id, from_me: message.from_me,
      participant: (conversation.group? && !message.from_me ? message.sender_id : nil), emoji: params[:emoji].to_s
    )
    reaction = message.reactions.find_or_initialize_by(sender_id: conversation.account.external_id)
    params[:emoji].present? ? reaction.update!(emoji: params[:emoji], reacted_at: Time.current) : reaction.destroy
    render json: message
  rescue Messaging::Whatsapp::Client::Error => e
    render json: { error: e.message }, status: e.status || :bad_gateway
  end

  def mark_as_read
    conversation = Messaging::Conversation.find(params[:id])
    unread = conversation.messages.where(from_me: false).where("status IS NULL OR status < 4").order(sent_at: :desc).limit(50)

    if unread.any?
      Messaging::Whatsapp::Client.read(
        chat: conversation.external_id,
        messages: unread.map { |m| { id: m.external_id, participant: (conversation.group? ? m.sender_id : nil) }.compact }
      )
      unread.update_all(status: 4)
    end
    conversation.update!(unread_count: 0)
    Notification.where("source LIKE ?", "messages.whatsapp.#{conversation.id}.%").update_all(read: true)

    render json: conversation
  rescue Messaging::Whatsapp::Client::Error => e
    render json: { error: e.message }, status: e.status || :bad_gateway
  end
end
