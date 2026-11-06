class WhatsappController < ApplicationController
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
end
