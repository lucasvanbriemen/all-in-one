module Seasonal
  # The Christmas season runs from Nov 1 up to Epiphany (Jan 6), so the first
  # days of January still belong to the previous year's season. Outside the
  # season everything points at the upcoming one, where no door is open yet.
  class Season
    LAST_JANUARY_DAY = 6
    ADVENT_DAYS = 24

    attr_reader :today, :year

    # `value` is the optional `date` param (YYYY-MM-DD) that stands in for today.
    def self.from_param(value)
      value.present? ? new(Date.strptime(value.to_s, "%Y-%m-%d")) : new
    end

    def initialize(today = Date.current)
      @today = today
      @year = today.month == 1 && today.day <= LAST_JANUARY_DAY ? today.year - 1 : today.year
    end

    def now = today.end_of_day

    def november = Date.new(year, 11, 1)
    def december = Date.new(year, 12, 1)
    def christmas_eve = Date.new(year, 12, ADVENT_DAYS)

    # Jan 1 of the season year up to now: what "this year" means for stats.
    def year_start = Date.new(year, 1, 1)
    def this_year = year_start.beginning_of_day..now
    def this_year_dates = year_start..today

    # From the start of `date` up to now; empty when `date` is still to come.
    def since(date) = date.beginning_of_day..now

    def this_december = december.beginning_of_day..[ now, december.end_of_month.end_of_day ].min

    def unlocked_doors
      return 0 if today < december
      return ADVENT_DAYS if today > christmas_eve

      today.day
    end
  end
end
