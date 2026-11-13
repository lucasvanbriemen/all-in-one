class SearchController < ApplicationController
  def index
    @query = params[:query]

    @liked_songs = Music::LikedSongMatcher.new.match(@query)
    @channels = matching_channels(@query)

    @results = []

    @liked_songs.each { |song|
      @results << {
        type: "liked_song",
        source: "music.songs.#{song.id}",
        title: song.title,
        subtitle: song.artist
      }
    }

    @channels.each { |channel|
      @results << {
        type: "channel",
        source: "channels.#{channel.id}",
        title: channel.display_name,
        subtitle: channel.channel_type
      }
    }

    render json: {
      "results" => @results
    }
  end

  private

  # A DM usually has no name of its own; it shows its contact's name, linked by
  # contact_id or (for chats under a privacy id) by the contact's lid.
  def matching_channels(query)
    pattern = "%#{Channel.sanitize_sql_like(query.to_s)}%"

    channels = Channel
      .joins("LEFT JOIN contacts ON contacts.id = channels.contact_id OR contacts.lid = channels.id")
      .where("channels.name LIKE :pattern OR contacts.name LIKE :pattern", pattern: pattern)
      .distinct
      .to_a

    Whatsapp::Channel.preload_resolved_contacts(channels.grep(Whatsapp::Channel))
    channels
  end
end
