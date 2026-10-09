class WhatsappController < ApplicationController
  skip_before_action :require_login, only: [ :avatar, :media ]

  rescue_from Whatsapp::Bridge::Error do |error|
    render json: { error: error.message }, status: error.status
  end

  def status
    connection = Whatsapp::Connection.current
    render json: connection.as_json(only: [ :status, :me_jid, :me_name, :pairing_code, :last_error, :connected_at ])
  end

  def pair
    phone = ENV["PHONE_NUMBER"]
    render json: Whatsapp::Bridge.pair(phone)
  end

  def index
    chats = Whatsapp::Chat.visible.recent.includes(:contact).limit(200)
    render json: chats.map { |chat| chat_json(chat) }
  end

  def show
    chat = Whatsapp::Chat.find_by!(jid: params[:jid])
    page = params[:page].to_i.clamp(1, 10_000)
    messages = chat.messages.newest_first.includes(:sender, :reactions).limit(Whatsapp::Message::PER_PAGE).offset((page - 1) * Whatsapp::Message::PER_PAGE)
    mark_read

    render json: {
      chat: chat_json(chat),
      messages: messages.map { |message| message_json(message) },
      page: page,
      has_more: messages.size == Whatsapp::Message::PER_PAGE
    }
  end

  def avatar
    chat = Whatsapp::Chat.find_by!(jid: params[:jid])
    path = chat.avatar_file
    return head :not_found unless path

    expires_in 1.hour, public: false
    send_file path, type: "image/jpeg", disposition: "inline"
  end

  def media
    message = Whatsapp::Message.find_by!(chat_jid: params[:jid], wa_id: params[:id])
    return head :not_found unless message.downloadable_media?

    mimetype, bytes = message.media_file
    expires_in 1.year, public: false
    response.headers["Accept-Ranges"] = "bytes"

    # WebKit only plays audio/video from servers that honour byte ranges.
    ranges = Rack::Utils.get_byte_ranges(request.headers["Range"], bytes.bytesize)
    if ranges&.one?
      range = ranges.first
      response.headers["Content-Range"] = "bytes #{range.begin}-#{range.end}/#{bytes.bytesize}"
      send_data bytes.byteslice(range), type: mimetype, disposition: "inline", status: :partial_content
    else
      send_data bytes, type: mimetype, disposition: "inline", filename: message.media["filename"].presence
    end
  end

  def send_message
    sent = Whatsapp::Bridge.send_text(to: params[:jid], text: params[:text], quote_id: params[:quote_id], mentions: params[:mentions])
    render json: sent
  end

  def react
    Whatsapp::Bridge.react(chat: params[:jid], message_id: params[:message_id], emoji: params[:emoji].to_s, from_me: params[:from_me] == true || params[:from_me] == "true", participant: params[:participant])
    head :ok
  end

  def mark_read
    chat = Whatsapp::Chat.find_by!(jid: params[:jid])
    messages = chat.messages.active.where(from_me: false).newest_first.limit(20)
    Whatsapp::Bridge.mark_read(chat: chat.jid, messages: messages.map { |m| { id: m.wa_id, participant: (m.sender_jid if chat.is_group) }.compact }) if messages.any?
    chat.update!(unread_count: 0)
  end

  def typing
    Whatsapp::Bridge.typing(chat: params[:jid], typing: params[:typing] != false && params[:typing] != "false")
    head :ok
  end

  private

  def me_jid
    @me_jid ||= Whatsapp::Connection.current.me_jid
  end

  def chat_json(chat)
    last = chat.last_message
    {
      jid: chat.jid,
      name: chat.display_name(me_jid: me_jid),
      avatar_url: whatsapp_avatar_path(chat.jid),
      is_group: chat.is_group,
      unread_count: chat.unread_count,
      pinned: chat.pinned,
      muted_until: chat.muted_until,
      last_message_at: chat.last_message_at,
      last_message: last && { body: last.body, kind: last.kind, from_me: last.from_me, sender_name: last.display_sender_name, deleted: last.deleted? }
    }
  end

  def message_json(message)
    {
      id: message.wa_id,
      chat_jid: message.chat_jid,
      sender_jid: message.sender_jid,
      sender_name: message.display_sender_name,
      from_me: message.from_me,
      kind: message.kind,
      body: message.deleted? ? nil : message.body,
      media: message.public_media,
      media_url: (whatsapp_media_path(message.chat_jid, message.wa_id) if message.downloadable_media?),
      quoted_id: message.quoted_id,
      mentions: message.mentions,
      status: message.status,
      sent_at: message.sent_at,
      edited_at: message.edited_at,
      deleted: message.deleted?,
      reactions: message.reactions.map { |r| { emoji: r.emoji, sender_jid: r.sender_jid } }
    }
  end
end
