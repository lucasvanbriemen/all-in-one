class CalendarEventsController < ApplicationController
  # GET /calendar/events?from=ISO&to=ISO — defaults to the current month.
  def index
    from = params[:from].present? ? Time.zone.parse(params[:from]) : Time.current.beginning_of_month
    to = params[:to].present? ? Time.zone.parse(params[:to]) : from.end_of_month

    render json: CalendarEvent.between(from, to).order(:starts_at)
  end

  def upcoming
    render json: CalendarEvent.upcoming(params.fetch(:limit, 5).to_i)
  end

  # With a Google connection every write goes to Google first and the local
  # row mirrors what Google returned. Without one, events are local only.
  def create
    if google
      calendar = google.primary_calendar
      item = GoogleCalendar::Client.create_event(google.fresh_access_token, calendar["id"], google_payload)
      render json: GoogleCalendar::Sync.mirror!(item, calendar), status: :created
    else
      event = CalendarEvent.new(event_params)
      if event.save
        render json: event, status: :created
      else
        render json: { errors: event.errors.full_messages }, status: :unprocessable_entity
      end
    end
  rescue GoogleCalendar::Client::Error => e
    render json: { errors: [ e.message ] }, status: :bad_gateway
  end

  def update
    event = CalendarEvent.find(params[:id])

    if event.google?
      calendar = { "id" => event.calendar_id, "summary" => event.calendar_name, "backgroundColor" => event.color }
      item = GoogleCalendar::Client.update_event(google.fresh_access_token, event.calendar_id, event.external_id, google_payload)
      render json: GoogleCalendar::Sync.mirror!(item, calendar)
    elsif event.update(event_params)
      render json: event
    else
      render json: { errors: event.errors.full_messages }, status: :unprocessable_entity
    end
  rescue GoogleCalendar::Client::Error => e
    render json: { errors: [ e.message ] }, status: :bad_gateway
  end

  def destroy
    event = CalendarEvent.find(params[:id])
    GoogleCalendar::Client.delete_event(google.fresh_access_token, event.calendar_id, event.external_id) if event.google?
    event.destroy
    head :no_content
  rescue GoogleCalendar::Client::Error => e
    render json: { errors: [ e.message ] }, status: :bad_gateway
  end

  private

  def google
    @google ||= GoogleCalendarConnection.first
  end

  def event_params
    params.permit(:title, :description, :location, :starts_at, :ends_at, :all_day)
  end

  # Only the fields that were sent, so a PATCH with just a title leaves the
  # times alone. All-day events use dates with Google's exclusive end date.
  def google_payload
    attrs = event_params.to_h.symbolize_keys
    body = {}
    body[:summary] = attrs[:title] if attrs.key?(:title)
    body[:description] = attrs[:description] if attrs.key?(:description)
    body[:location] = attrs[:location] if attrs.key?(:location)

    if attrs.key?(:starts_at) || attrs.key?(:ends_at)
      starts_at = Time.zone.parse(attrs[:starts_at].to_s)
      ends_at = attrs[:ends_at].present? ? Time.zone.parse(attrs[:ends_at].to_s) : starts_at
      if ActiveModel::Type::Boolean.new.cast(attrs[:all_day])
        body[:start] = { date: starts_at.to_date.iso8601 }
        body[:end] = { date: (ends_at.to_date + 1).iso8601 }
      else
        body[:start] = { dateTime: starts_at.iso8601, timeZone: Time.zone.name }
        body[:end] = { dateTime: ends_at.iso8601, timeZone: Time.zone.name }
      end
    end
    body
  end
end
