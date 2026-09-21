module Music
  # One-off: songs that still carry an ISRC key get the id of the matching
  # YouTube Music song. A match must share the title (loosely) or be within
  # a few seconds of the known duration; anything else is left alone and
  # listed at the end so it can be fixed by hand.
  class YoutubeRemap
    MAX_DURATION_DIFFERENCE_SECONDS = 10
    THREADS = 6
    CHILD_TABLES = %w[plays playlist_songs karaoke_scores].freeze

    def run
      songs = Song.where.not("id REGEXP ?", "^[A-Za-z0-9_-]{11}$").to_a
      puts "#{songs.size} songs still keyed by ISRC"

      # Searches run in parallel; the database work stays on this thread so
      # the connection pool is never contended.
      matches = songs.each_slice(THREADS).flat_map do |slice|
        slice.map { |song| Thread.new { find_match(song) } }.map(&:value)
      end

      unmatched = []
      songs.zip(matches).each do |song, match|
        match ? rekey(song, match) : unmatched << song
      end

      puts "Remapped #{songs.size - unmatched.size} songs"
      unmatched.each { |song| puts "  no match: #{song.id} | #{song.artist} - #{song.title}" }
    end

    private

    def find_match(song)
      candidates = YoutubeMusic.new.search("#{song.artist} #{song.title}")
      same_title = candidates.select { |c| normalize(c[:title]) == normalize(song.title) }
      pool = same_title.presence || candidates
      closest = pool.min_by { |c| (c[:duration] - song.duration).abs }
      return nil unless closest
      return closest if same_title.any? || (closest[:duration] - song.duration).abs <= MAX_DURATION_DIFFERENCE_SECONDS

      nil
    end

    def normalize(title)
      title.to_s.downcase.gsub(/\s*[(\[].*?[)\]]/, "").gsub(/[^a-z0-9]/, "")
    end

    # Children point at the parent by foreign key, so the new row is inserted
    # first, the children moved, and the old row deleted last.
    def rekey(song, match)
      old_id, new_id = song.id, match[:id]
      Song.transaction do
        if Song.exists?(id: new_id)
          # Two ISRC editions of the same recording collapse onto one video.
          Song.where(id: new_id).update_all(is_liked: true) if song.is_liked
        else
          Song.create!(song.attributes.merge("id" => new_id, "image_url" => match[:image_url], "duration" => match[:duration]))
        end
        CHILD_TABLES.each do |table|
          Song.connection.execute("UPDATE #{table} SET song_id = #{quote(new_id)} WHERE song_id = #{quote(old_id)}")
        end
        Song.where(id: old_id).delete_all
      end
      move_audio(old_id, new_id)
      puts "#{old_id} -> #{new_id}  #{song.artist} - #{song.title}"
    end

    def move_audio(old_id, new_id)
      old_path = SongDownloader.path(old_id)
      return unless old_path.file?

      FileUtils.mv(old_path, SongDownloader.path(new_id)) unless SongDownloader.downloaded?(new_id)
      FileUtils.rm_f([ old_path, SongDownloader::AUDIO_DIR.join("#{old_id}.lock") ])
    end

    def quote(value)
      Song.connection.quote(value)
    end
  end
end
