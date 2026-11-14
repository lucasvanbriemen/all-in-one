class WhatsappController < ApplicationController
  # Image tags can't send the API's bearer token, and a profile picture is all this exposes.
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
    owner = Whatsapp::Contact.find_by(id: params[:jid]) || Whatsapp::Channel.find_by(id: params[:jid])
    path = owner&.avatar_file
    return head :not_found unless path

    expires_in 1.hour, public: false
    send_file path, type: "image/jpeg", disposition: "inline"
  end
end
