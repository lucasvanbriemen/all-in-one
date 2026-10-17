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

    if event&.dig("type") == "message" && event["subtype"] == "message_changed"
      Slack::Message.find_by(id: "#{event["channel"]}-#{event["message"]["ts"]}")&.update!(body: event["message"]["text"])
    end

    if event&.dig("type") == "message" && event["subtype"] == "message_deleted"
      Slack::Message.find_by(id: "#{event["channel"]}-#{event["deleted_ts"]}")&.destroy
    end

    if [ "channel_created", "channel_rename", "group_rename" ].include?(event&.dig("type"))
      Slack::Channel.find_or_initialize_by(id: event["channel"]["id"]).update!(name: event["channel"]["name"])
    end

    if [ "channel_archive", "group_archive" ].include?(event&.dig("type"))
      Slack::Channel.find_by(id: event["channel"])&.update(is_active: false)
    end

    if [ "channel_unarchive", "group_unarchive" ].include?(event&.dig("type"))
      Slack::Channel.find_by(id: event["channel"])&.update(is_active: true)
    end

    if [ "team_join", "user_change" ].include?(event&.dig("type"))
      user = event["user"]
      Slack::Contact.find_or_initialize_by(id: user["id"]).update!(
        name: user.dig("profile", "display_name").presence || user["real_name"],
        avatar_url: user.dig("profile", "image_72"),
        is_active: !user["deleted"]
      )
    end

    head :ok
  end
end
