class SlackController < ApplicationController
  skip_before_action :require_login, only: [ :create ]

  def create
    token = request.headers["Authorization"]&.split(" ")&.last
    unless token.present? && ActiveSupport::SecurityUtils.secure_compare(token, ENV["SERVER_API_KEY"])
      return head :unauthorized
    end

    json = JSON.parse(request.raw_post)

    event = json.dig("payload", "event")
    if event&.dig("type") == "message" && event["subtype"].blank?
      Slack::Channel.find_or_create_by!(id: event["channel"])
      Slack::Contact.find_or_create_by!(id: event["user"])
      Slack::Message.find_or_create_by!(id: "#{event["channel"]}-#{event["ts"]}") do |message|
        message.channel_id = event["channel"]
        message.contact_id = event["user"]
        message.body = event["text"]
      end
    end

    head :ok
  end
end
