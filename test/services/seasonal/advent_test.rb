require "test_helper"
require_relative "../../support/seasonal_test_data"

class Seasonal::AdventTest < ActiveSupport::TestCase
  include SeasonalTestData

  def advent(date = "2026-12-26") = Seasonal::Advent.new(Seasonal::Season.new(Date.parse(date)))

  test "every door builds from real data without raising" do
    seed_seasonal_data

    doors = (1..24).map { |day| advent.build(day) }

    assert doors.all?, "doors without data: #{doors.each_with_index.reject { |d, _| d }.map { |_, i| i + 1 }}"
    doors.each_with_index do |door, i|
      assert_equal i + 1, door[:day]
      assert door[:emoji].present? && door[:title].present? && door[:body].present?
    end
    assert_includes doors[0][:body], "Last Christmas by Wham! 4 times"
    assert_includes doors[1][:body], "4 hours"
    assert_includes doors[12][:body], "😂"
    assert_includes doors[13][:body], "04:00 on Monday 1 June" # 02:00 UTC, in Amsterdam summer time
    assert_includes doors[14][:body], "€200" # savings left out
    assert_equal 8, doors[23][:summary].size
  end

  test "doors without data fall back to a cozy door" do
    clear_music_data
    doors = advent.doors

    assert_equal 24, doors.size
    assert_equal Seasonal::Advent::FALLBACKS.map { |f| f[:title] }.to_set, doors.first(23).map { |d| d[:title] }.to_set
    assert_equal "🎄", doors[23][:emoji] # the summary always shows
  end

  test "a failing door does not break the calendar" do
    calendar = advent("2026-12-03")
    calendar.define_singleton_method(:distinct_songs) { raise "boom" }

    doors = calendar.doors
    assert_equal 3, doors.size
    assert_equal({ day: 3, emoji: "🍪", title: "Have a kerstkransje" }, doors[2].slice(:day, :emoji, :title))
  end

  test "only unlocked doors are returned" do
    assert_empty advent("2026-11-30").doors
    assert_equal 5, advent("2026-12-05").doors.size
  end
end
