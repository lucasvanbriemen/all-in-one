class DrivingController < ApplicationController
  def index
    since = (params[:since].presence && Date.parse(params[:since])) || 6.months.ago.to_date

    trips = Driving::Trips.call(since: since.beginning_of_day)
    fill_ups = Driving::FillUps.call(since: since)

    render json: { trips: trips, fill_ups: fill_ups, months: months(trips, fill_ups) }
  end

  private

  def months(trips, fill_ups)
    keys = (trips.map { |t| t[:started_at].to_date } + fill_ups.map { |f| f[:date] }).map { |d| d.strftime("%Y-%m") }.uniq.sort

    keys.map do |month|
      month_trips = trips.select { |t| t[:started_at].strftime("%Y-%m") == month }
      month_fills = fill_ups.select { |f| f[:date].strftime("%Y-%m") == month }
      km = month_trips.sum { |t| t[:km] || 0 }
      litres = month_fills.sum { |f| f[:litres] || 0 }

      {
        month: month,
        trips: month_trips.size,
        minutes_driving: month_trips.sum { |t| t[:minutes] },
        km: km.round,
        # Trips without both locations have no km, so this only counts measured trips.
        km_measured_trips: month_trips.count { |t| t[:km] },
        euros: month_fills.sum { |f| f[:euros] }.round(2),
        litres: litres.round(1),
        # Fill-ups and kilometres don't line up within one month, so read this over several months.
        litres_per_100km: km.positive? ? (litres / km * 100).round(1) : nil
      }
    end
  end
end
