module Music
  class SongDownloader
    AUDIO_DIR = Pathname.new(ENV.fetch("MUSIC_AUDIO_DIR") { Rails.root.join("storage/audio").to_s })
    WORK_ROOT = Rails.root.join("tmp/music-download")
    DOWNLOAD_TIMEOUT_SECONDS = 180
    DOWNLOAD_NAME = "download".freeze
    # yt-dlp prints these, one per line, next to the audio so a song that is
    # not in the database yet can be created without another request.
    METADATA_FIELDS = %w[ %(track,title)s %(artists.0,artist,uploader)s %(album|)s %(thumbnail)s %(duration)s ].freeze
    VIDEO_ID = /\A[A-Za-z0-9_-]{11}\z/

    class << self
      def path(id)
        AUDIO_DIR.join("#{id}.mp3")
      end

      def downloaded?(id)
        path(id).file?
      end

      def ensure_downloaded(id)
        return false unless id.match?(VIDEO_ID)
        return true if downloaded?(id)

        with_lock(id) do
          next true if downloaded?(id)

          metadata = download(id)
          next false unless downloaded?(id)

          create_song(id, metadata)
          true
        end
      end

      private

      def with_lock(id)
        FileUtils.mkdir_p(AUDIO_DIR)
        File.open(AUDIO_DIR.join("#{id}.lock"), File::RDWR | File::CREAT) do |lock|
          lock.flock(File::LOCK_EX)
          yield
        end
      end

      def create_song(id, metadata)
        return if metadata.nil? || Song.exists?(id: id)

        title, artist, album, thumbnail, duration = metadata
        Song.create!(
          id: id,
          title: title,
          artist: artist,
          album: album.presence || title,
          image_url: thumbnail.presence || Song::PLACEHOLDER_IMAGE,
          duration: duration.to_i
        )
      end

      # Returns the metadata lines when the download produced a file.
      def download(id)
        work_dir = WORK_ROOT.join(SecureRandom.hex(8))
        FileUtils.mkdir_p(work_dir)
        produced = work_dir.join("#{DOWNLOAD_NAME}.mp3")
        metadata_file = work_dir.join("metadata.txt")

        options = [
          tool("yt-dlp"),
          *YtDlp.new.media_options,
          "--no-playlist",
          "--format", "bestaudio/best",
          "--concurrent-fragments", "4",
          "--extract-audio",
          "--audio-format", "mp3",
          "--audio-quality", "0",
          "--restrict-filenames",
          "--no-progress",
          "--print-to-file", METADATA_FIELDS.join("\n"), metadata_file.to_s,
          "--ffmpeg-location", Rails.root.join("bin").to_s,
          "--output", work_dir.join(DOWNLOAD_NAME).to_s
        ]
        url = "https://music.youtube.com/watch?v=#{id}"
        env = { "TMP" => work_dir.to_s, "TEMP" => work_dir.to_s, "TMPDIR" => work_dir.to_s }

        # Once per player client, stopping at the first that produces the file.
        YtDlp.new.download_attempts.each do |client_options|
          log = work_dir.join("yt-dlp.log").to_s
          client = client_options.last || "default"
          TimedProcess.run(*options, *client_options, url,
            env: env, chdir: work_dir.to_s, out: log, err: log,
            timeout_seconds: DOWNLOAD_TIMEOUT_SECONDS)
          break if produced.file?

          Rails.logger.warn("[music] #{id} attempt failed (#{client}): #{File.read(log).lines.last(3).join.strip}")
        end

        return nil unless produced.file?

        # Copied then renamed so a half-written file never reads as cached.
        partial = "#{path(id)}.part"
        FileUtils.cp(produced, partial)
        FileUtils.mv(partial, path(id))
        metadata_file.file? ? File.read(metadata_file).lines.map(&:strip) : nil
      ensure
        FileUtils.rm_rf(work_dir) if work_dir
      end

      def tool(name)
        Rails.root.join("bin", name).to_s
      end
    end
  end
end
