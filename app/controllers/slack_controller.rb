class SlackController < ApplicationController
  skip_before_action :require_login, only: [ :create ]

  # Every emoji the composer can autocomplete: standard ones as the emoji itself, custom ones as image URLs.
  def emoji
    render json: Slack::Emoji::ALL.merge(Slack::Emoji::NAMES).merge(Slack::CustomEmoji.urls) { |_name, standard, _custom| standard }
  end

  # The people the composer can @mention.
  def contacts
    render json: Slack::Contact.where(is_active: true).where.not(name: [ nil, "" ]).order(:name).as_json(only: %i[id name avatar_url])
  end

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
        message.body = Slack::Message.body_from(event)
        message.thread_id = "#{event["channel"]}-#{event["thread_ts"]}" if event["thread_ts"].present? && event["thread_ts"] != event["ts"]
      end
      files = Slack::Message.files_from(event)
      DownloadSlackFilesJob.perform_later(message.id, files) if files.any?
    end

    if event&.dig("type") == "message" && event["subtype"] == "message_changed"
      Slack::Message.find_by(id: "#{event["channel"]}-#{event["message"]["ts"]}")&.update!(body: Slack::Message.body_from(event["message"]))
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

    notify(event, message) if new_message?(event)

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

  def notify(event, message)
    contact = Slack::Contact.find_by(id: event["user"])
    return if contact.nil? || contact.is_me
    channel = Slack::Channel.joined.find_by(id: event["channel"])
    return unless channel

    pinged = pings_me?(event["text"])

    # Thread replies only matter when they ping me or the thread is one I started or replied in.
    if event["thread_ts"].present? && event["thread_ts"] != event["ts"]
      thread_id = "#{event["channel"]}-#{event["thread_ts"]}"
      in_thread = Slack::Message.where(id: thread_id).or(Slack::Message.where(thread_id: thread_id))
      return unless pinged || in_thread.where(contact_id: Contact::MY_CONTACT_IDS).exists?
    end

    Channel.reappear(channel.id)
    Notification.create!(
      title: contact.name,
      body: RichText.to_plain(message.body, platform: "slack"),
      source: "messages.slack.#{event["channel"]}",
      silent: channel.muted && !pinged
    )
  end

  def pings_me?(text)
    Contact::MY_CONTACT_IDS.any? { |id| text.to_s.include?("<@#{id}>") }
  end
end
