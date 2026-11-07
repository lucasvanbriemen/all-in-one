class SlackController < ApplicationController
  skip_before_action :require_login, only: [ :create ]

  def create
    token = request.headers["Authorization"]&.split(" ")&.last
    unless token.present? && ActiveSupport::SecurityUtils.secure_compare(token, ENV["SERVER_API_KEY"])
      return head :unauthorized
    end

    json = JSON.parse(request.raw_post)

    event = json.dig("payload", "event")
    if event&.dig("type") == "message" && (event["subtype"].blank? || event["subtype"] == "file_share")
      Slack::Channel.sync(event["channel"]) unless Slack::Channel.where(id: event["channel"]).where.not(name: nil).exists?
      Slack::Contact.find_or_create_by!(id: event["user"])
      message = Slack::Message.find_or_create_by!(id: "#{event["channel"]}-#{event["ts"]}") do |message|
        message.channel_id = event["channel"]
        message.contact_id = event["user"]
        message.body = event["text"]
        message.thread_id = "#{event["channel"]}-#{event["thread_ts"]}" if event["thread_ts"].present? && event["thread_ts"] != event["ts"]
      end
      DownloadSlackFilesJob.perform_later(message.id, event["files"]) if event["files"].present?
    end

    if event&.dig("type") == "message" && event["subtype"] == "message_changed"
      Slack::Message.find_by(id: "#{event["channel"]}-#{event["message"]["ts"]}")&.update!(body: event["message"]["text"])
    end

    if event&.dig("type") == "message" && event["subtype"] == "message_deleted"
      Slack::Message.find_by(id: "#{event["channel"]}-#{event["deleted_ts"]}")&.destroy
    end

    if [ "reaction_added", "reaction_removed" ].include?(event&.dig("type")) && event.dig("item", "type") == "message"
      message_id = "#{event["item"]["channel"]}-#{event["item"]["ts"]}"
      if Slack::Message.exists?(id: message_id)
        Slack::Contact.find_or_create_by!(id: event["user"])
        attrs = { message_id: message_id, contact_id: event["user"], reaction: event["reaction"] }
        if event["type"] == "reaction_added"
          MessageReaction.find_or_create_by!(attrs)
        else
          MessageReaction.where(attrs).delete_all
        end
      end
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

    if [ "member_joined_channel", "member_left_channel" ].include?(event&.dig("type"))
      Slack::Channel.sync(event["channel"])
    end

    if [ "channel_left", "group_left" ].include?(event&.dig("type"))
      Slack::Channel.find_by(id: event["channel"])&.update(is_member: false)
    end

    if [ "team_join", "user_change" ].include?(event&.dig("type"))
      user = event["user"]
      Slack::Contact.find_or_initialize_by(id: user["id"]).update!(
        name: user.dig("profile", "display_name").presence || user["real_name"],
        avatar_url: user.dig("profile", "image_72"),
        is_active: !user["deleted"]
      )
    end

    notify(event) if new_message?(event)

    channel_id = changed_channel_id(event)
    MessagesChannel.chat_changed(channel_id, platform: "slack") if channel_id.present?

    head :ok
  end

  private

  def changed_channel_id(event)
    case event&.dig("type")
    when "message", "channel_archive", "group_archive", "channel_unarchive", "group_unarchive",
         "member_joined_channel", "member_left_channel", "channel_left", "group_left"
      event["channel"]
    when "reaction_added", "reaction_removed" then event.dig("item", "channel")
    when "channel_created", "channel_rename", "group_rename" then event.dig("channel", "id")
    end
  end

  def new_message?(event)
    event&.dig("type") == "message" && (event["subtype"].blank? || event["subtype"] == "file_share")
  end

  def notify(event)
    contact = Slack::Contact.find_by(id: event["user"])
    return if contact.nil? || contact.is_me
    return unless Slack::Channel.joined.exists?(id: event["channel"])

    if event["thread_ts"].present? && event["thread_ts"] != event["ts"]
      thread_id = "#{event["channel"]}-#{event["thread_ts"]}"
      in_thread = Slack::Message.where(id: thread_id).or(Slack::Message.where(thread_id: thread_id))
      return unless in_thread.where(contact_id: Contact::MY_CONTACT_IDS).exists?
    end

    Notification.create!(
      title: contact.name,
      body: event["text"],
      source: "messages.slack.#{event["channel"]}"
    )
  end
end
