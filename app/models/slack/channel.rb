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
      is_group_chat: conversation["is_mpim"] || false,
      is_member: conversation["is_member"] || conversation["is_im"] || conversation["is_mpim"] || false,
      contact_id: conversation["is_im"] ? conversation["user"] : nil
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

  def send_message(text, thread_id: nil, **)
    Slack::Api.send_message(id, text, thread_ts: thread_ts_for(thread_id))
  end

  def upload(file, text: nil, thread_id: nil, **)
    Slack::Api.upload_file(id, data: file.read, filename: file.original_filename, comment: text, thread_ts: thread_ts_for(thread_id))
  end

  private

  # Message ids are "<channel>-<ts>"; Slack wants just the ts.
  def thread_ts_for(thread_id)
    thread_id.to_s.delete_prefix("#{id}-").presence
  end
end
