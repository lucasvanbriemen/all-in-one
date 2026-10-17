class AccountController < ApplicationController
  skip_before_action :require_login, only: [ :privacy ]

  def show
    slack_response = Slack::Api.getConversations

    # slack_response = slack_response.map do |item|
    #   Channel.find_or_create_by(id: item["id"]) do |contact|
    #     contact.name = item["name"]
    #     contact.type = "Slack::Channel"
    #     contact.is_active = !item["is_archived"] || true
    #     contact.is_private = item["is_private"] || true
    #   end
    # end

    render json: {
      config: Config::CONFIG,
      allowed_platforms: Config::ALLOWED_PLATFORMS,
      conversations_list: Slack::Channel.all
    }
  end

  def privacy
    render plain: <<~TEXT
      All in one - Privacy policy
      This is a personal dashboard used by a single person. Data read from
      connected services (Google Calendar, email, bank) is stored only on the
      owner's own server to show it in the dashboard, is never shared with
      third parties, and can be removed at any time by disconnecting the
      service in the app.
    TEXT
  end
end
