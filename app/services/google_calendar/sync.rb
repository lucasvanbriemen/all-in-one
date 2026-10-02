module GoogleCalendar
  # Mirrors the account's calendars into calendar_events. Recurring events are
  # expanded server-side (singleEvents) so each occurrence is a row, which
  # keeps the month grid and sync tokens simple. The first pull takes a fixed
  # window; after that Google only sends changes.
  #
  # Only calendars the account owns are synced (plus any ids listed in
  # GOOGLE_CALENDAR_IDS), so colleagues' shared calendars don't flood the
  # agenda.
  class Sync
    PAST = 1.month
    FUTURE = 6.months

    def initialize(connection)
      @connection = connection
    end

    def run
      token = @connection.fresh_access_token
      calendars = Client.calendar_list(token).select { |calendar| wanted?(calendar) }
      active_ids = calendars.map { |c| c["id"] }

      calendars.each { |calendar| sync_calendar(token, calendar) }

      # Calendars that were dropped or unsubscribed since the last run.
      CalendarEvent.where(source: "google").where.not(calendar_id: active_ids).delete_all

      @connection.update!(last_synced_at: Time.current, last_sync_error: nil)
    rescue StandardError => e
      @connection.update_columns(last_sync_error: "#{e.class}: #{e.message}")
      raise
    end

    # Writes one Google event (as returned by the API) into calendar_events.
    def self.mirror!(item, calendar)
      row = new(nil).send(:row_for, item, calendar)
      return if row.nil?

      event = CalendarEvent.find_or_initialize_by(calendar_id: row[:calendar_id], external_id: row[:external_id])
      event.update!(row)
      event
    end

    def self.extra_calendar_ids
      ENV.fetch("GOOGLE_CALENDAR_IDS", "").split(",").map(&:strip).reject(&:blank?)
    end

    private

    def wanted?(calendar)
      calendar["primary"] || calendar["accessRole"] == "owner" || self.class.extra_calendar_ids.include?(calendar["id"])
    end

    def sync_calendar(token, calendar)
      calendar_id = calendar.fetch("id")
      sync_token = @connection.sync_token_for(calendar_id)

      begin
        items, next_token = Client.events(token, calendar_id, sync_token ? { syncToken: sync_token } : full_window_params)
      rescue Client::SyncTokenExpired
        items, next_token = Client.events(token, calendar_id, full_window_params)
        CalendarEvent.where(source: "google", calendar_id: calendar_id).delete_all
      end

      apply(items, calendar)
      @connection.store_sync_token(calendar_id, next_token) if next_token
      @connection.save!
    end

    def full_window_params
      {
        singleEvents: true,
        showDeleted: true,
        timeMin: PAST.ago.utc.iso8601,
        timeMax: FUTURE.from_now.utc.iso8601
      }
    end

    # One delete and one upsert per calendar instead of a round trip per event.
    def apply(items, calendar)
      calendar_id = calendar.fetch("id")
      cancelled, live = items.partition { |item| item["status"] == "cancelled" }

      rows = live.filter_map { |item| row_for(item, calendar) }
      now = Time.current
      rows.each { |row| row[:created_at] = now; row[:updated_at] = now }

      CalendarEvent.where(calendar_id: calendar_id, external_id: cancelled.map { |i| i["id"] }).delete_all if cancelled.any?
      CalendarEvent.upsert_all(rows, update_only: rows.first.keys - [ :created_at ]) if rows.any?
    end

    def row_for(item, calendar)
      starts_at, ends_at, all_day = times(item)
      return if starts_at.nil?

      {
        source: "google",
        calendar_id: calendar.fetch("id"),
        external_id: item.fetch("id"),
        calendar_name: calendar["summaryOverride"].presence || calendar["summary"],
        color: calendar["backgroundColor"],
        title: item["summary"].presence || "(No title)",
        description: plain_text(item["description"]),
        location: item["location"],
        starts_at: starts_at,
        ends_at: ends_at,
        all_day: all_day,
        html_link: item["htmlLink"]
      }
    end

    # Google sends all-day events as dates with an exclusive end date, timed
    # events as dateTimes. Normalise to our inclusive end-of-day convention.
    # Out-of-office and similar blocks arrive as midnight-to-midnight
    # dateTimes; those read better as all-day too.
    def times(item)
      start = item["start"] || {}
      finish = item["end"] || {}

      if start["date"]
        starts_at = Time.zone.parse(start["date"]).beginning_of_day
        ends_at = (Time.zone.parse(finish["date"] || start["date"]) - 1.day).end_of_day
        [starts_at, [ends_at, starts_at].max, true]
      elsif start["dateTime"]
        starts_at = Time.zone.parse(start["dateTime"])
        ends_at = Time.zone.parse(finish["dateTime"] || start["dateTime"])
        if starts_at == starts_at.beginning_of_day && ends_at == ends_at.beginning_of_day && ends_at > starts_at
          [starts_at, (ends_at - 1.day).end_of_day, true]
        else
          [starts_at, ends_at, false]
        end
      end
    end

    # Descriptions come as HTML fragments (<br>, <u>, entities).
    def plain_text(html)
      return nil if html.blank?

      text = html.gsub(/<br\s*\/?>/i, "\n").gsub(/<\/?(p|div|li)>/i, "\n")
      text = ActionController::Base.helpers.strip_tags(text)
      CGI.unescapeHTML(text).gsub(/\n{3,}/, "\n\n").strip
    end
  end
end
