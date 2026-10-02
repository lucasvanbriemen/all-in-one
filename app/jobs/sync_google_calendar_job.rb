class SyncGoogleCalendarJob < ApplicationJob
  queue_as :default

  limits_concurrency to: 1, key: ->(connection_id) { "google_calendar_sync_#{connection_id}" }, duration: 10.minutes

  discard_on ActiveRecord::RecordNotFound

  def perform(connection_id)
    GoogleCalendar::Sync.new(GoogleCalendarConnection.find(connection_id)).run
  end
end
