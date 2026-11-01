require "test_helper"

class Seasonal::SeasonTest < ActiveSupport::TestCase
  def season(date) = Seasonal::Season.new(Date.parse(date))

  test "season year runs from November through Epiphany" do
    assert_equal 2026, season("2026-11-01").year
    assert_equal 2026, season("2026-12-31").year
    assert_equal 2026, season("2027-01-06").year
    assert_equal 2027, season("2027-01-07").year
    assert_equal 2026, season("2026-07-15").year
  end

  test "advent doors unlock one per day in December" do
    assert_equal 0, season("2026-11-30").unlocked_doors
    assert_equal 1, season("2026-12-01").unlocked_doors
    assert_equal 13, season("2026-12-13").unlocked_doors
    assert_equal 24, season("2026-12-24").unlocked_doors
    assert_equal 24, season("2026-12-31").unlocked_doors
    assert_equal 24, season("2027-01-06").unlocked_doors
    assert_equal 0, season("2027-01-07").unlocked_doors
  end

  test "this year starts on Jan 1 of the season year" do
    range = season("2027-01-03").this_year
    assert_equal Time.zone.local(2026, 1, 1), range.begin
    assert_equal Date.new(2027, 1, 3).end_of_day, range.end
  end

  test "december range is capped at today" do
    assert_equal Date.new(2026, 12, 10).end_of_day, season("2026-12-10").this_december.end
    assert_equal Date.new(2026, 12, 31).end_of_day, season("2027-01-02").this_december.end
  end

  test "parses the date param" do
    assert_equal Date.current, Seasonal::Season.from_param(nil).today
    assert_equal Date.new(2026, 12, 5), Seasonal::Season.from_param("2026-12-05").today
    assert_raises(Date::Error) { Seasonal::Season.from_param("tomorrow") }
  end
end
