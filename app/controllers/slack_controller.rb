class SlackController < ApplicationController
  skip_before_action :require_login, only: [ :create ]

  def create
    json = JSON.parse(request.raw_post)

    # Create message if event is a message
    if json["event"]["type"] == "message"
      Slack::Message.find_or_create(json["event"]["message"]["ts"]) do |message|
        message.type = "Slack::Message"
        message.channel_id = json["event"]["channel"]
        message.contact_id = json["event"]["user"]
        message.body = json["event"]["message"]["text"]
      end
    end

    head :ok
  end
end
