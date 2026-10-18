class Slack::Channel < Channel
  def self.sync(id)
    response = Slack::Api.get("conversations.info", channel: id)
    return find_or_create_by!(id: id) unless response["ok"]

    sync_from(response["channel"])
  end

  def self.sync_from(conversation)
    channel = find_or_initialize_by(id: conversation["id"])
    channel.update!(
      name: name_for(conversation),
      is_active: !conversation["is_archived"],
      is_private: conversation["is_private"] || conversation["is_im"] || conversation["is_mpim"] || false,
      is_dm: conversation["is_im"] || false,
      is_group_chat: conversation["is_mpim"] || false
    )
    channel
  end

  def self.name_for(conversation)
    if conversation["is_im"]
      Slack::Contact.find_by(id: conversation["user"])&.name
    elsif conversation["is_mpim"]
      conversation["name"].to_s.delete_prefix("mpdm-").sub(/-\d+\z/, "").split("--").join(", ")
    else
      conversation["name"]
    end
  end
end
