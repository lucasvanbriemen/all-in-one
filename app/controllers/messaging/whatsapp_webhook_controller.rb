module Messaging
  # Receives events from the WhatsApp connector. Not a user request, so no
  # login; the shared secret is the authentication.
  class WhatsappWebhookController < ApplicationController
    skip_before_action :require_login

    before_action :verify_secret

    def create
      Whatsapp::Events.new.handle(params[:event], params[:payload]&.to_unsafe_h)
      head :ok
    rescue StandardError => e
      Rails.logger.error("[WhatsApp] webhook #{params[:event]} failed: #{e.class}: #{e.message}")
      head :unprocessable_entity
    end

    private

    def verify_secret
      secret = Whatsapp::Client.secret
      return if secret.blank? && !Rails.env.production?
      head :unauthorized unless secret.present? && ActiveSupport::SecurityUtils.secure_compare(request.headers["X-Bridge-Secret"].to_s, secret)
    end
  end
end
