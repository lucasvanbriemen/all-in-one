module Whatsapp
  class WebhooksController < ActionController::API
    before_action :verify_secret

    def create
      body = JSON.parse(request.raw_post)
      EventHandler.handle(body["event"], body["payload"])
      head :ok
    end

    private

    def verify_secret
      secret = ENV["WHATSAPP_BRIDGE_SECRET"]
      return if secret.present? && ActiveSupport::SecurityUtils.secure_compare(request.headers["X-Bridge-Secret"].to_s, secret)

      head :unauthorized
    end
  end
end
