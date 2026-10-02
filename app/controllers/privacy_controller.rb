# Public page required by Google's OAuth consent screen. Not behind login.
class PrivacyController < ApplicationController
  skip_before_action :require_login

  def show
    render plain: <<~TEXT
      All in one — Privacy policy

      This is a personal dashboard used by a single person. Data read from
      connected services (Google Calendar, email, bank) is stored only on the
      owner's own server to show it in the dashboard, is never shared with
      third parties, and can be removed at any time by disconnecting the
      service in the app.
    TEXT
  end
end
