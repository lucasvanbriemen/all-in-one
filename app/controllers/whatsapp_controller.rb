class WhatsappController < ApplicationController
  skip_before_action :require_login, only: [ :avatar ]

  rescue_from Whatsapp::Bridge::Error do |error|
    render json: { error: error.message }, status: error.status
  end

  def status
    render json: Whatsapp::Connection.current
  end

  def pair
    phone = ENV["PHONE_NUMBER"]
    render json: Whatsapp::Bridge.pair(phone)
  end

  def avatar
    channel = Whatsapp::Channel.find(params[:jid])
    path = channel.avatar_file
    return head :not_found unless path

    expires_in 1.hour, public: false
    send_file path, type: "image/jpeg", disposition: "inline"
  end

  def react
    message = Whatsapp::Message.find_by!(channel_id: params[:jid], id: params[:message_id])
    message.react!(params[:emoji].to_s)
    head :ok
  end

  def mark_read
    Whatsapp::Channel.find(params[:jid]).mark_read!
    head :ok
  end

  def typing
    Whatsapp::Bridge.typing(chat: params[:jid], typing: params[:typing] != false && params[:typing] != "false")
    head :ok
  end
end
