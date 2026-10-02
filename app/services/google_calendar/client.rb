require "net/http"

module GoogleCalendar
  # Thin wrapper over Google OAuth and the Calendar v3 REST API. Needs
  # GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET from a "Web application" OAuth
  # client in Google Cloud, with the callback URL registered as a redirect URI.
  module Client
    extend self

    AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth".freeze
    TOKEN_URL = "https://oauth2.googleapis.com/token".freeze
    USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo".freeze
    API_URL = "https://www.googleapis.com/calendar/v3".freeze
    SCOPES = %w[https://www.googleapis.com/auth/calendar email].freeze
    TIMEOUT_SECONDS = 15

    class Error < StandardError
      attr_reader :status
      def initialize(message, status: nil)
        super(message)
        @status = status
      end
    end

    class SyncTokenExpired < Error; end

    def client_id = ENV.fetch("GOOGLE_CLIENT_ID")
    def client_secret = ENV.fetch("GOOGLE_CLIENT_SECRET")

    def authorize_url(redirect_uri:, state:)
      "#{AUTH_URL}?" + URI.encode_www_form(
        client_id: client_id,
        redirect_uri: redirect_uri,
        response_type: "code",
        scope: SCOPES.join(" "),
        access_type: "offline",
        prompt: "consent", # forces a refresh token even on re-consent
        include_granted_scopes: "true",
        state: state
      )
    end

    def exchange_code(code, redirect_uri:)
      post_form(TOKEN_URL, code: code, client_id: client_id, client_secret: client_secret, redirect_uri: redirect_uri, grant_type: "authorization_code")
    end

    def refresh(refresh_token)
      post_form(TOKEN_URL, refresh_token: refresh_token, client_id: client_id, client_secret: client_secret, grant_type: "refresh_token")
    end

    def userinfo(access_token)
      get(USERINFO_URL, access_token)
    end

    def calendar_list(access_token)
      paginate("#{API_URL}/users/me/calendarList", access_token, { minAccessRole: "reader" })
    end

    # Yields every page of events. With a sync token Google returns only the
    # changes since the last pull; otherwise `params` sets the time window.
    def events(access_token, calendar_id, params)
      url = "#{API_URL}/calendars/#{CGI.escape(calendar_id)}/events"
      next_sync_token = nil
      items = paginate(url, access_token, params) { |page| next_sync_token = page["nextSyncToken"] if page["nextSyncToken"] }
      [items, next_sync_token]
    end

    def create_event(access_token, calendar_id, body)
      json(:post, "#{API_URL}/calendars/#{CGI.escape(calendar_id)}/events", access_token, body)
    end

    def update_event(access_token, calendar_id, event_id, body)
      json(:patch, "#{API_URL}/calendars/#{CGI.escape(calendar_id)}/events/#{CGI.escape(event_id)}", access_token, body)
    end

    def delete_event(access_token, calendar_id, event_id)
      json(:delete, "#{API_URL}/calendars/#{CGI.escape(calendar_id)}/events/#{CGI.escape(event_id)}", access_token)
    rescue Error => e
      raise unless e.status == 410 || e.status == 404 # already gone in Google
    end

    private

    def json(method, url, access_token, body = nil)
      uri = URI(url)
      request = { post: Net::HTTP::Post, patch: Net::HTTP::Patch, delete: Net::HTTP::Delete }.fetch(method).new(uri)
      request["Authorization"] = "Bearer #{access_token}"
      if body
        request["Content-Type"] = "application/json"
        request.body = JSON.generate(body)
      end
      handle(perform(uri, request))
    end

    def paginate(url, access_token, params)
      items = []
      page_token = nil
      loop do
        query = params.merge(maxResults: 2500)
        query[:pageToken] = page_token if page_token
        page = get("#{url}?#{URI.encode_www_form(query)}", access_token)
        items.concat(page.fetch("items", []))
        yield page if block_given?
        page_token = page["nextPageToken"]
        break if page_token.blank?
      end
      items
    end

    def get(url, access_token)
      uri = URI(url)
      request = Net::HTTP::Get.new(uri)
      request["Authorization"] = "Bearer #{access_token}"
      handle(perform(uri, request))
    end

    def post_form(url, params)
      uri = URI(url)
      request = Net::HTTP::Post.new(uri)
      request.set_form_data(params)
      handle(perform(uri, request))
    end

    def perform(uri, request)
      Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: TIMEOUT_SECONDS, read_timeout: TIMEOUT_SECONDS) do |http|
        http.request(request)
      end
    end

    def handle(response)
      body = response.body.present? ? JSON.parse(response.body) : {}
      return body if response.is_a?(Net::HTTPSuccess)

      message = body.dig("error", "message") || body["error_description"] || body["error"] || response.message
      raise SyncTokenExpired.new(message, status: 410) if response.code.to_i == 410
      raise Error.new("Google responded with #{response.code}: #{message}", status: response.code.to_i)
    end
  end
end
