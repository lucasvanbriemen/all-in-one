# Shared yt-dlp invocation details, ported from the music app
# (app/services/yt_dlp.rb there).
#
# YouTube answers the extractor's default player client with a blanket
# "HTTP Error 403: Forbidden" on some networks, so a download walks a list of
# player clients rather than trusting one. The list is overridable through
# YTDLP_PLAYER_CLIENTS so the server can be re-pointed without a deploy.
module Music
  module YtDlp
    # Tried in order; the first that produces a file wins. "default" means
    # "pass no --extractor-args at all".
    DEFAULT_PLAYER_CLIENTS = %w[ web_embedded tv_simply default ].freeze

    # yt-dlp needs a JavaScript engine to solve YouTube's media-URL challenge
    # and only enables deno by default; without one every audio format is
    # withheld ("Only images are available for download"). Overridable through
    # YTDLP_JS_RUNTIMES.
    DEFAULT_JS_RUNTIMES = "node".freeze

    class << self
      def media_options
        runtimes = js_runtimes
        runtimes.present? ? [ "--js-runtimes", runtimes ] : []
      end

      def js_runtimes
        ENV.fetch("YTDLP_JS_RUNTIMES", DEFAULT_JS_RUNTIMES).to_s.strip
      end

      # One entry per attempt: the extra arguments selecting that attempt's
      # player client.
      def download_attempts
        player_clients.map do |client|
          client == "default" ? [] : [ "--extractor-args", "youtube:player_client=#{client}" ]
        end
      end

      def player_clients
        configured = ENV["YTDLP_PLAYER_CLIENTS"].to_s.split(",").map(&:strip).reject(&:empty?)
        configured.presence || DEFAULT_PLAYER_CLIENTS
      end
    end
  end
end
