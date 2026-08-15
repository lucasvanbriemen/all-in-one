require "digest"
require "net/http"

module Authentication
  extend ActiveSupport::Concern

  LOGIN_URL = "https://login.ltvb.nl"

  # Matches Token::TOKEN_DURATION in the login app.
  AUTH_COOKIE_DURATION = 1.week

  # How long a validated token is trusted before the login app is asked again.
  # Without this every single request blocks on a cross-host round trip. The
  # price is that a revoked token keeps working for at most this long.
  SESSION_CACHE_DURATION = 5.minutes

  included do
    before_action :require_login
    helper_method :current_account
  end

  private

  attr_reader :current_account

  def require_login
    token = auth_token
    @current_account = fetch_account(token) if token.present?

    if @current_account.nil?
      # Native clients can't act on a redirect to an HTML login form — they
      # need a status they can branch on to show their own login screen.
      return render(json: { error: "unauthorized" }, status: :unauthorized) if request.format.json?

      return redirect_to "#{LOGIN_URL}?redirect=#{CGI.escape(request.original_url)}", allow_other_host: true
    end

    # Token arrived via the URL (login redirect); persist it as a cookie and clean the URL.
    if params[:auth_token].present?
      store_auth_cookie(token)
      redirect_to clean_url
    end
  end

  def auth_token
    cookies[:auth_token].presence || params[:auth_token].presence || request.headers["Authorization"].to_s[/\ABearer (.+)\z/, 1]
  end

  def fetch_account(token)
    Rails.cache.fetch(session_cache_key(token), expires_in: SESSION_CACHE_DURATION, skip_nil: true) do
      response = request_session(token)
      next nil unless response.is_a?(Net::HTTPOK)

      account = JSON.parse(response.body)

      # The login app answers 200 for *every* token: an unknown or expired one
      # comes back as `isloggedin: false` carrying the anonymous permission
      # tree, so consumers can offer a logged-out view. That makes the flag,
      # not the status code, the thing that decides whether we are signed in.
      account if account["isloggedin"]
    end
  end

  # Tokens are bearer credentials, so they are hashed rather than embedded in a
  # cache key that ends up stored in the Solid Cache table.
  def session_cache_key(token)
    "authentication/account/#{Digest::SHA256.hexdigest(token)}"
  end

  # Timeouts are explicit because this call sits in front of every request: if
  # the login app hangs, the default 60s would hang this app along with it.
  # A failed lookup means "not signed in" — never a 500 on an unrelated page.
  def request_session(token)
    uri = URI("#{LOGIN_URL}/session/#{CGI.escape(token)}")

    Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https", open_timeout: 2, read_timeout: 5) do |http|
      http.request(Net::HTTP::Get.new(uri))
    end
  rescue StandardError => error
    Rails.logger.warn("Session lookup failed: #{error.class}: #{error.message}")
    nil
  end

  def store_auth_cookie(token)
    cookies[:auth_token] = {
      value: token,
      expires: AUTH_COOKIE_DURATION.from_now,
      httponly: true,
      secure: Rails.env.production?,
      domain: :all
    }
  end

  def clean_url
    remaining = request.query_parameters.except("auth_token")
    remaining.empty? ? request.path : "#{request.path}?#{remaining.to_query}"
  end
end
