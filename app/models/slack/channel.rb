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

  def marked_as_read
  end

  def upload(file, text: nil, thread_id: nil, **)
    Slack::Api.upload_file(id, data: file.read, filename: file.original_filename, comment: text, thread_ts: thread_ts_for(thread_id))
  end

  # Slack allows several reactions per person, so adding and removing are separate.
  # The reaction_added webhook for it finds this row and leaves it be.
  def react(message, emoji)
    name = Slack::Emoji.to_name(emoji)
    Slack::Api.add_reaction(id, message_ts(message), name)
    Slack::Contact.find_or_create_by!(id: Contact::MY_CONTACT_IDS.first)
    MessageReaction.find_or_create_by!(message_id: message.id, contact_id: Contact::MY_CONTACT_IDS.first, reaction: name)
  end

  def unreact(message, emoji)
    name = Slack::Emoji.to_name(emoji)
    Slack::Api.remove_reaction(id, message_ts(message), name)
    message.reactions.where(contact_id: Contact::MY_CONTACT_IDS, reaction: name).delete_all
  end

  private

  def message_ts(message)
    message.id.delete_prefix("#{id}-")
  end

  # Message ids are "<channel>-<ts>"; Slack wants just the ts.
  def thread_ts_for(thread_id)
    thread_id.to_s.delete_prefix("#{id}-").presence
  end
end
