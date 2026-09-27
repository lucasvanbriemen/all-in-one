require "net/http"
require "openssl"
require "base64"

module Banking
  module Connection
    BASE_URL = "https://api.enablebanking.com".freeze
    TIMEOUT_SECONDS = 15
    JWT_TTL = 1.hour
    CONSENT_DURATION = 90.days # 90 is the default that every bank uses.

    def self.private_key
      @private_key ||= OpenSSL::PKey::RSA.new(File.read(Rails.root.join(ENV.fetch("BANKING_KEY_PATH")).to_s))
    end

    def self.aspsps(country)
      get("/aspsps", country: country).fetch("aspsps")
    end

    def self.authorize(aspsp_name:, country:, redirect_url:, state:)
      post("/auth", {
        access: { valid_until: CONSENT_DURATION.from_now.utc.iso8601 },
        aspsp: { name: aspsp_name, country: country },
        state: state,
        redirect_url: redirect_url,
        psu_type: "personal"
      })
    end

    def self.create_session(code)
      post("/sessions", { code: code })
    end

    def self.session(session_id)
      get("/sessions/#{session_id}")
    end

    def self.account_details(account_uid)
      get("/accounts/#{account_uid}/details")
    end

    def self.balances(account_uid)
      get("/accounts/#{account_uid}/balances").fetch("balances")
    end

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
      body
    end

    def self.jwt
      now = Time.now.to_i
      header = base64url(JSON.generate(typ: "JWT", alg: "RS256", kid: ENV.fetch("BANKING_APP_ID")))
      payload = base64url(JSON.generate(iss: "enablebanking.com", aud: "api.enablebanking.com", iat: now, exp: now + JWT_TTL.to_i))
      signature = private_key.sign(OpenSSL::Digest::SHA256.new, "#{header}.#{payload}")
      "#{header}.#{payload}.#{base64url(signature)}"
    end

    def self.base64url(data)
      Base64.urlsafe_encode64(data, padding: false)
    end
  end
end
