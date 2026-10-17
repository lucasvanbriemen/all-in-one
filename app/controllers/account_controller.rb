class AccountController < ApplicationController
  skip_before_action :require_login, only: [ :privacy ]

  def show
    slack_response = Slack::Api.getConversations

    # allSlackUsers = allSlackUsers["members"].map do |user|
    #   Contact.find_or_create_by(id: user["id"]) do |contact|
    #     display_name = user["profile"]["display_name"]
    #     real_name = user["profile"]["real_name"]

    #     preferd_name = display_name.presence || real_name.presence || user["name"]

    #     contact.name = preferd_name
    #     contact.avatar_url = user["profile"]["image_72"]
    #     contact.type = "Slack::Contact"
    #     contact.is_active = !user["deleted"]
    #   end
    # end

    render json: {
      config: Config::CONFIG,
      allowed_platforms: Config::ALLOWED_PLATFORMS,
      conversations_list: slack_response
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
