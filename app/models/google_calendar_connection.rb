# One Google account whose calendars are mirrored into calendar_events.
# Connect through /calendar/google/connect; tokens refresh themselves.
class GoogleCalendarConnection < ApplicationRecord
  # MariaDB stores JSON as text and the trilogy adapter hands it back raw.
  attribute :sync_tokens, :json, default: -> { {} }

  validates :email, :access_token, :refresh_token, :token_expires_at, presence: true

  def self.from_tokens!(tokens, email:)
    connection = find_or_initialize_by(email: email)
    connection.assign_attributes(
      access_token: tokens.fetch("access_token"),
      token_expires_at: tokens.fetch("expires_in").to_i.seconds.from_now,
      last_sync_error: nil
    )
    # Google only hands out the refresh token on the first consent.
    connection.refresh_token = tokens["refresh_token"] if tokens["refresh_token"].present?
    connection.save!
    connection
  end

  def token_expired?
    token_expires_at <= 1.minute.from_now
  end

  def fresh_access_token
    refresh_access_token! if token_expired?
    access_token
  end

  def refresh_access_token!
    tokens = GoogleCalendar::Client.refresh(refresh_token)
    update!(access_token: tokens.fetch("access_token"), token_expires_at: tokens.fetch("expires_in").to_i.seconds.from_now)
  end

  # The calendar new events are written to.
  def primary_calendar
    @primary_calendar ||= GoogleCalendar::Client.calendar_list(fresh_access_token).find { |c| c["primary"] } ||
      raise(GoogleCalendar::Client::Error.new("No primary calendar on #{email}"))
  end

  def sync_token_for(calendar_id)
    sync_tokens[calendar_id]
  end

  def store_sync_token(calendar_id, token)
    self.sync_tokens = sync_tokens.merge(calendar_id => token)
  end
end
