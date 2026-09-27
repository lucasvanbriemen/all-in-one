require "net/http"
require "openssl"
require "base64"

module Banking
  # Client for the Enable Banking API (https://enablebanking.com/docs/api).
  #
  # Every request is authenticated with a short-lived RS256 JWT signed by the
  # application's private key; the key id is the application id. Bank data is
  # then addressed by the session and account uids returned when the user
  # authorises access, so nothing here holds state between calls.
  #
  # Errors from the API are raised as Banking::Connection::Error so callers
  # can record them on the connection and move on, the way the IMAP importer
  # does with its credentials.
  module Connection
    BASE_URL = "https://api.enablebanking.com".freeze
    TIMEOUT_SECONDS = 15
    JWT_TTL = 1.hour
    # How long a fresh consent is asked for. ING allows up to 180 days but
    # 90 is the PSD2 default that every bank accepts.
    CONSENT_DURATION = 90.days
    # ING returns at most this many days of history on a new session.
    HISTORY_LIMIT = 90.days

    Error = Class.new(StandardError)

    def self.app_id
      ENV.fetch("BANKING_APP_ID")
    end

    def self.key_path
      Rails.root.join(ENV.fetch("BANKING_KEY_PATH")).to_s
    end

    def self.private_key
      @private_key ||= OpenSSL::PKey::RSA.new(File.read(key_path))
    end

    # -- API -----------------------------------------------------------------

    # Details of the registered application: environment, redirect urls and
    # allowed countries. Handy as a connectivity check.
    def self.application
      get("/application")
    end

    # Banks available in a country, e.g. aspsps("NL").
    def self.aspsps(country)
      get("/aspsps", country: country).fetch("aspsps")
    end

    # Starts the consent flow. Returns the url the user has to open at their
    # bank; the bank redirects back to +redirect_url+ with a +code+ parameter
    # that create_session exchanges for a session.
    def self.authorize(aspsp_name:, country:, redirect_url:, state:)
      post("/auth", {
        access: { valid_until: CONSENT_DURATION.from_now.utc.iso8601 },
        aspsp: { name: aspsp_name, country: country },
        state: state,
        redirect_url: redirect_url,
        psu_type: "personal"
      })
    end

    # Exchanges the code from the callback for a session with its accounts.
    def self.create_session(code)
      post("/sessions", { code: code })
    end

    # Looks up an existing session, including its accounts and validity.
    def self.session(session_id)
      get("/sessions/#{session_id}")
    end

    def self.balances(account_uid)
      get("/accounts/#{account_uid}/balances").fetch("balances")
    end

    # All transactions booked since +date_from+, following the continuation
    # key until the bank has nothing more.
    def self.transactions(account_uid, date_from:)
      transactions = []
      continuation_key = nil

      loop do
        params = { date_from: date_from.to_date.iso8601 }
        params[:continuation_key] = continuation_key if continuation_key
        page = get("/accounts/#{account_uid}/transactions", params)
        transactions.concat(page.fetch("transactions"))
        continuation_key = page["continuation_key"]
        break if continuation_key.blank?
      end

      transactions
    end

    # -- HTTP ----------------------------------------------------------------

    def self.get(path, params = {})
      uri = URI("#{BASE_URL}#{path}")
      uri.query = URI.encode_www_form(params) if params.any?
      perform(Net::HTTP::Get.new(uri), uri)
    end

    def self.post(path, payload)
      uri = URI("#{BASE_URL}#{path}")
      request = Net::HTTP::Post.new(uri)
      request.body = JSON.generate(payload)
      perform(request, uri)
    end

    def self.perform(request, uri)
      request["Authorization"] = "Bearer #{jwt}"
      request["Content-Type"] = "application/json"
      request["Accept"] = "application/json"

      response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: TIMEOUT_SECONDS, read_timeout: TIMEOUT_SECONDS) do |http|
        http.request(request)
      end

      body = JSON.parse(response.body.presence || "{}")
      return body if response.is_a?(Net::HTTPSuccess)

      raise Error, "#{request.method} #{uri.path} failed (#{response.code}): #{body["message"] || body["error"] || response.body.to_s.truncate(200)}"
    rescue JSON::ParserError => e
      raise Error, "#{request.method} #{uri.path} returned invalid JSON: #{e.message}"
    rescue Net::OpenTimeout, Net::ReadTimeout, SocketError, Errno::ECONNRESET, OpenSSL::SSL::SSLError => e
      raise Error, "#{request.method} #{uri.path} failed: #{e.class}: #{e.message}"
    end

    def self.jwt
      now = Time.now.to_i
      header = base64url(JSON.generate(typ: "JWT", alg: "RS256", kid: app_id))
      payload = base64url(JSON.generate(iss: "enablebanking.com", aud: "api.enablebanking.com", iat: now, exp: now + JWT_TTL.to_i))
      signature = private_key.sign(OpenSSL::Digest::SHA256.new, "#{header}.#{payload}")
      "#{header}.#{payload}.#{base64url(signature)}"
    end

    def self.base64url(data)
      Base64.urlsafe_encode64(data, padding: false)
    end

    private_class_method :get, :post, :perform, :jwt, :base64url
  end
end
