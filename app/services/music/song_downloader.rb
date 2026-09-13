# Downloads song MP3s, one file per ISRC, the way the music app's SongCache
# does — minus its GPU-box offload: everything runs on this host.
#
# The audio directory defaults to storage/audio but can be pointed elsewhere
# with MUSIC_AUDIO_DIR (for example at the music app's own storage/audio when
# both apps share a server, so a song downloaded by either is cached for both).
module Music
  class SongDownloader
    AUDIO_DIR = Pathname.new(ENV.fetch("MUSIC_AUDIO_DIR") { Rails.root.join("storage/audio").to_s })
    WORK_ROOT = Rails.root.join("tmp/music-download")
    DOWNLOAD_TIMEOUT_SECONDS = 180
    DOWNLOAD_NAME = "download".freeze
    # YouTube carries single edits, radio edits and live takes under the same
    # title; prefer a result whose length matches what Deezer reports.
    DURATION_TOLERANCE = 0.07

    class << self
      def path(isrc)
        AUDIO_DIR.join("#{isrc}.mp3")
      end

      def downloaded?(isrc)
        path(isrc).file?
      end

      # Makes sure the MP3 for the ISRC is on disk and its Song row exists.
      # A per-ISRC file lock makes simultaneous callers wait on one download
      # instead of spawning duplicate yt-dlp processes.
      def ensure_downloaded(isrc)
        return true if downloaded?(isrc)

        with_lock(isrc) do
          next true if downloaded?(isrc)

          details = DeezerClient.track_details(isrc)
          download(isrc, details)
          # Nothing on YouTube matched the expected length. Better a
          # possibly-mismatched recording than no song at all.
          download(isrc, details, match_duration: false) unless downloaded?(isrc)
          next false unless downloaded?(isrc)

          create_song(isrc, details)
          true
        end
      end

      private

      def with_lock(isrc)
        FileUtils.mkdir_p(AUDIO_DIR)
        File.open(AUDIO_DIR.join("#{isrc}.lock"), File::RDWR | File::CREAT) do |lock|
          lock.flock(File::LOCK_EX)
          yield
        end
      end

      def create_song(isrc, details)
        return if Song.exists?(isrc: isrc)

        Song.create!(
          isrc: isrc,
          title: details["title"],
          artist: details.dig("artist", "name"),
          image_url: details.dig("album", "cover_medium") || Song::PLACEHOLDER_IMAGE,
          album: details.dig("album", "title"),
          duration: details["duration"],
          genre: genre_for(details.dig("album", "id")),
          enriched_at: Time.current,
          bpm: positive_or_nil(details["bpm"])&.to_f,
          release_year: year_from(details["release_date"]),
          deezer_rank: positive_or_nil(details["rank"])&.to_i
        )
      end

      def download(isrc, details, match_duration: true)
        work_dir = WORK_ROOT.join(SecureRandom.hex(8))
        FileUtils.mkdir_p(work_dir)
        produced = work_dir.join("#{DOWNLOAD_NAME}.mp3")

        options = [
          tool("yt-dlp"),
          *YtDlp.media_options,
          "--no-playlist",
          "--format", "bestaudio/best",
          "--concurrent-fragments", "4",
          "--extract-audio",
          "--audio-format", "mp3",
          "--audio-quality", "0",
          "--restrict-filenames",
          "--no-progress",
          # yt-dlp walks the search results in order and --max-downloads stops
          # at the first that passes the filter.
          "--match-filter", match_filter(match_duration ? details["duration"] : nil),
          "--max-downloads", "1",
          "--ffmpeg-location", Rails.root.join("bin").to_s,
          "--output", work_dir.join(DOWNLOAD_NAME).to_s
        ]
        search = "ytsearch5: #{details.dig("artist", "name")} #{details["title"]} audio"
        env = { "TMP" => work_dir.to_s, "TEMP" => work_dir.to_s, "TMPDIR" => work_dir.to_s }

        # Once per player client, stopping at the first that produces the file.
        # The exit status is ignored: yt-dlp exits non-zero when --max-downloads
        # stops it, having produced exactly the file that was asked for.
        YtDlp.download_attempts.each do |client_options|
          log = work_dir.join("yt-dlp.log").to_s
          client = client_options.last || "default"

          output = File.read(log)
          Rails.logger.warn("[music] #{isrc} attempt failed (#{client}): #{output.lines.last(3).join.strip}")
          # Walking the player clients only helps against download errors
          # (403s, withheld formats). When every result was simply rejected by
          # the duration window, the other clients see the same results, so
          # skip them and let the caller's unfiltered retry run right away.
          # Observed: ~15s of identical failing searches per song otherwise.
          break if filter_rejected_everything?(output)
        end

        return unless produced.file?

        # Copied then renamed so a half-written file never reads as cached.
        partial = "#{path(isrc)}.part"
        FileUtils.cp(produced, partial)
        FileUtils.mv(partial, path(isrc))
      ensure
        FileUtils.rm_rf(work_dir) if work_dir
      end

      def filter_rejected_everything?(output)
        output.include?("does not pass filter") && !output.include?("ERROR:")
      end

      def tool(name)
        Rails.root.join("bin", name).to_s
      end

      def match_filter(expected_duration)
        seconds = expected_duration.to_f
        return "age_limit<18" unless seconds.positive?

        window = seconds * DURATION_TOLERANCE
        "age_limit<18 & duration>#{(seconds - window).round} & duration<#{(seconds + window).round}"
      end

      def genre_for(album_id)
        return nil if album_id.blank?

        name = DeezerClient.album_details(album_id).dig("genres", "data", 0, "name")
        name.presence unless name == "All"
      rescue DeezerClient::Error
        nil
      end

      def positive_or_nil(value)
        value.to_f.positive? ? value : nil
      end

      def year_from(release_date)
        year = release_date.to_s[0, 4].to_i
        year.positive? ? year : nil
      end
    end
  end
end
