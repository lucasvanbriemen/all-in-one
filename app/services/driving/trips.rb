module Driving
  # Turns the CarPlay connect/disconnect events from the phone into trips.
  class Trips
    EARTH_RADIUS_KM = 6371.0

    def self.call(since: nil)
      new(since).call
    end

    def initialize(since)
      @since = since
    end

    def call
      trips = []
      open = nil

      events.each do |event|
        value = normalize(event.value)

        if value[:connected]
          # A second "connected" without a disconnect in between: the old one never closed.
          open = { started_at: event.occurred_at, from: value[:location] }
        elsif open
          trips << open.merge(ended_at: event.occurred_at, to: value[:location])
          open = nil
        end
      end

      merge_short_gaps(trips).map { |trip| finish(trip) }
    end

    private

    def events
      scope = DeviceEvent.where(device_type: "phone", attribute_name: "carplay").order(:occurred_at, :id)
      scope = scope.where(occurred_at: @since..) if @since
      scope
    end

    # Accepts value=true/false or {"connected": true, "lat": .., "lng": ..}.
    def normalize(value)
      return { connected: ActiveModel::Type::Boolean.new.cast(value), location: nil } unless value.is_a?(Hash)

      lat, lng = value["lat"], value["lng"]
      location = lat.present? && lng.present? ? { lat: lat.to_f, lng: lng.to_f } : nil
      { connected: ActiveModel::Type::Boolean.new.cast(value["connected"]), location: location }
    end

    def merge_short_gaps(trips)
      trips.each_with_object([]) do |trip, merged|
        previous = merged.last
        if previous && trip[:started_at] - previous[:ended_at] <= DrivingConfig::TRIP_MERGE_GAP
          previous[:ended_at] = trip[:ended_at]
          previous[:to] = trip[:to]
        else
          merged << trip.dup
        end
      end
    end

    def finish(trip)
      trip.merge(
        minutes: ((trip[:ended_at] - trip[:started_at]) / 60).round,
        km: estimated_km(trip[:from], trip[:to])
      )
    end

    # No routing service: the coordinates stay on our server. A round trip
    # (start and end at the same place) can't be measured this way and gives nil.
    def estimated_km(from, to)
      return nil unless from && to

      straight = haversine(from, to)
      straight < 0.5 ? nil : (straight * DrivingConfig::ROAD_FACTOR).round(1)
    end

    def haversine(from, to)
      rad = ->(deg) { deg * Math::PI / 180 }
      dlat = rad.(to[:lat] - from[:lat])
      dlng = rad.(to[:lng] - from[:lng])
      a = Math.sin(dlat / 2)**2 + Math.cos(rad.(from[:lat])) * Math.cos(rad.(to[:lat])) * Math.sin(dlng / 2)**2
      2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
    end
  end
end
