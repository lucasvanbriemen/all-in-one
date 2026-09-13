module Music
  class YtDlp
    # Tried in order; the first that produces a file wins. "default" means
    # "pass no --extractor-args at all".
    DEFAULT_PLAYER_CLIENTS = %w[ web_embedded tv_simply default ].freeze

    # yt-dlp needs a JavaScript engine to solve YouTube's media-URL challenge
    DEFAULT_JS_RUNTIMES = "node".freeze

    def media_options
      runtimes = DEFAULT_JS_RUNTIMES
      runtimes.present? ? [ "--js-runtimes", runtimes ] : []
    end

    def download_attempts
      DEFAULT_PLAYER_CLIENTS.map do |client|
        client == "default" ? [] : [ "--extractor-args", "youtube:player_client=#{client}" ]
      end
    end
  end
end
