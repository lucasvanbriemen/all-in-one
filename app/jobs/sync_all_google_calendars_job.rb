class SyncAllGoogleCalendarsJob < ApplicationJob
  queue_as :default

  def perform
    GoogleCalendarConnection.pluck(:id).each { |id| SyncGoogleCalendarJob.perform_later(id) }
  end
end
