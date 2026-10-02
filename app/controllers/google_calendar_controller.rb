class GoogleCalendarController < ApplicationController
  def connect
    state = SecureRandom.hex(16)
    session[:google_calendar_state] = state

    redirect_to GoogleCalendar::Client.authorize_url(redirect_uri: google_calendar_callback_url, state: state), allow_other_host: true
  end

  def callback
    if params[:state].blank? || params[:state] != session.delete(:google_calendar_state)
      return render json: { error: "state mismatch" }, status: :unprocessable_entity
    end
    return render json: { error: params[:error] }, status: :unprocessable_entity if params[:code].blank?

    tokens = GoogleCalendar::Client.exchange_code(params[:code], redirect_uri: google_calendar_callback_url)
    email = GoogleCalendar::Client.userinfo(tokens.fetch("access_token")).fetch("email")
    connection = GoogleCalendarConnection.from_tokens!(tokens, email: email)
    SyncGoogleCalendarJob.perform_later(connection.id)

    render plain: "Google Calendar connected for #{email}. Syncing in the background."
  end

  def disconnect
    connection = GoogleCalendarConnection.find(params[:id])
    connection.destroy
    CalendarEvent.where(source: "google").delete_all if GoogleCalendarConnection.none?
    head :no_content
  end
end
