class SearchController < ApplicationController
  def index
    @query = params[:query].to_s.strip
    return render json: [] if @query.empty?

    @liked_songs = Music::LikedSongMatcher.new.match(@query)
    @channels = matching_channels(@query)
    @emails = matching_emails(@query)

    @results = []

    @liked_songs.each { |song|
      @results << {
        type: "liked_song",
        source: "music.songs.#{song.id}",
        title: song.title,
        subtitle: song.artist,
        full_object: song
      }
    }

    @channels.each { |channel|
      @results << {
        type: "channel",
        source: "messages.#{channel.channel_type}.#{channel.id}",
        title: channel.display_name,
        subtitle: channel.channel_type,
        full_object: channel.as_json(methods: [ :display_name, :last_message, :last_message_preview ])
      }
    }

    group_paths = Email.group_paths(@emails)
    @emails.each { |email|
      @results << {
        type: "email",
        source: "email.#{group_paths[email.id] || MailboxConfig::DEFAULT_GROUP}.#{email.id}",
        title: email.subject,
        subtitle: email.sender_name,
        full_object: email
      }
    }

    render json: @results
  end

  private

  # Matching runs on the subject index alone, the 20 newest ids are picked, and
  # only then are their rows read. Reading rows any earlier pulls in the big
  # bodies of every candidate: 2-5 s per search. Bodies aren't sent at all (they
  # were ~1 MB per search); the preview fetches the focused email's on its own.
  def matching_emails(query)
    matches = Email.from("emails FORCE INDEX (emails_subject_index)")
      .select(:id)
      .where("subject LIKE ?", "%#{Email.sanitize_sql_like(query)}%")
    newest = Email.joins("INNER JOIN (#{matches.to_sql}) matches ON matches.id = emails.id")
      .select(:id)
      .order(created_at: :desc)
      .limit(20)

    Email.joins("INNER JOIN (#{newest.to_sql}) newest ON newest.id = emails.id")
      .select(:id, :subject, :sender_name, :sender_id)
      .order(created_at: :desc)
  end

  # A DM usually has no name of its own; it shows its contact's name, linked by
  # contact_id or (for chats under a privacy id) by the contact's lid.
  def matching_channels(query)
    pattern = "%#{Channel.sanitize_sql_like(query.to_s)}%"

    channels = Channel
      .joins("LEFT JOIN contacts ON contacts.id = channels.contact_id OR contacts.lid = channels.id")
      .where("channels.name LIKE :pattern OR contacts.name LIKE :pattern", pattern: pattern)
      .distinct
      .includes(:contact)
      .order(updated_at: :desc)
      .to_a

    Channel.preload_for_listing(channels)
  end
end
