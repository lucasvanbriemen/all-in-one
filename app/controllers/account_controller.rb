class AccountController < ApplicationController
  skip_before_action :require_login, only: [:privacy]

  def show
    render json: {
      config: Config::CONFIG,
      allowed_platforms: Config::ALLOWED_PLATFORMS
    }
  end

  def privacy
    render plain: <<~TEXT
      All in one - Privacy policy
      This is a personal dashboard used by a single person. Data read from
      connected services (Google Calendar, email, bank) is stored only on the
      owner's own server to show it in the dashboard, is never shared with
      third parties, and can be removed at any time by disconnecting the
      service in the app.
    TEXT
  end
end
