require "test_helper"
require_relative "../support/seasonal_test_data"

class SeasonalControllerTest < ActionDispatch::IntegrationTest
  include SeasonalTestData

  TOKEN = "seasonal-test-token".freeze

  setup do
    @fetch_account = Authentication.method(:fetch_account)
    Authentication.define_singleton_method(:fetch_account) { |token| token == TOKEN ? { "id" => 1 } : nil }
    @state_dir = Dir.mktmpdir
    @state_path = Seasonal::State.path
    Seasonal::State.path = File.join(@state_dir, "seasonal_state.json")
  end

  teardown do
    Authentication.define_singleton_method(:fetch_account, @fetch_account)
    Seasonal::State.path = @state_path
    FileUtils.rm_rf(@state_dir)
  end

  def get_json(path, **params)
    get path, params: params, headers: { "Authorization" => "Bearer #{TOKEN}" }
    assert_response :success
    response.parsed_body
  end

  test "requires login" do
    %w[advent tree naughty_nice greetings christmas_songs gifts state].each do |action|
      get "/seasonal/#{action}"
      assert_response :redirect
      assert_match Authentication::LOGIN_URL, response.location
    end
    post "/seasonal/state", params: { key: "a", value: 1 }, as: :json
    assert_response :redirect
  end

  test "advent" do
    seed_seasonal_data
    body = get_json("/seasonal/advent", date: "2026-12-02")

    assert_equal 2026, body["year"]
    assert_equal 2, body["unlocked"]
    assert_equal [ 1, 2 ], body["doors"].map { |d| d["day"] }
    assert_equal %w[body day emoji title], body["doors"].first.keys.sort
    assert_equal 0, get_json("/seasonal/advent", date: "2026-11-15")["unlocked"]
  end

  test "rejects a malformed date" do
    get "/seasonal/advent", params: { date: "soon" }, headers: { "Authorization" => "Bearer #{TOKEN}" }
    assert_response :bad_request
  end

  test "tree" do
    seed_seasonal_data
    assert_equal({ "ornaments" => 1, "lights" => 5, "star" => true }, get_json("/seasonal/tree", date: "2026-12-10"))
    assert_equal({ "ornaments" => 0, "lights" => 0, "star" => true }, get_json("/seasonal/tree", date: "2026-11-10"))

    Notification.create!(title: "Mail", source: "email.home.2", read: false)
    assert_equal false, get_json("/seasonal/tree", date: "2026-12-10")["star"]
  end

  test "naughty and nice" do
    seed_seasonal_data
    body = get_json("/seasonal/naughty_nice", date: "2026-12-10")

    assert_equal [ { "name" => "Bol.com", "email" => "deals@bol.com", "count" => 3 } ], body["naughty"]
    assert_equal [ { "name" => "Mam", "channel_id" => MAM, "count" => 12 } ], body["nice"]
  end

  test "greetings" do
    seed_seasonal_data
    before = get_json("/seasonal/greetings", date: "2026-12-20")["contacts"]
    after = get_json("/seasonal/greetings", date: "2026-12-26")["contacts"]

    assert_equal [ { "channel_id" => MAM, "name" => "Mam", "avatar_url" => "https://aio.ltvb.nl/whatsapp/avatars/#{MAM}", "greeted" => false } ], before
    assert_equal true, after.first["greeted"]
  end

  test "christmas songs from titles" do
    seed_seasonal_data
    body = get_json("/seasonal/christmas_songs")

    assert_equal [ "Last Christmas" ], body.map { |s| s["title"] }
    assert_equal Music::Song.find("dQw4w9WgXcQ").as_json.keys.sort, body.first.keys.sort
  end

  test "christmas songs from a playlist" do
    seed_seasonal_data
    playlist = Music::Playlist.create!(name: "Kerst 🎄")
    Music::PlaylistSong.create!(playlist: playlist, song_id: "abc")

    assert_equal [ "Mr. Brightside" ], get_json("/seasonal/christmas_songs").map { |s| s["title"] }
  end

  test "gifts" do
    seed_seasonal_data
    body = get_json("/seasonal/gifts", date: "2026-12-10")

    assert_equal 300, body["budget"]
    assert_equal 60.0, body["spent"]
    assert_equal [ { "counterparty_name" => "Bol.com", "amount" => -60.0, "booking_date" => "2026-12-03" } ], body["transactions"].map { |t| t.except("id") }
  end

  test "state round trip" do
    assert_equal({}, get_json("/seasonal/state"))

    post "/seasonal/state", params: { key: "advent.opened", value: [ 1, 2 ] }, headers: { "Authorization" => "Bearer #{TOKEN}" }, as: :json
    assert_response :success
    assert_equal({ "advent.opened" => [ 1, 2 ] }, response.parsed_body)
    assert_equal({ "advent.opened" => [ 1, 2 ] }, get_json("/seasonal/state"))

    post "/seasonal/state", params: { key: "bad key", value: 1 }, headers: { "Authorization" => "Bearer #{TOKEN}" }, as: :json
    assert_response :unprocessable_entity
    post "/seasonal/state", params: { key: "advent.opened" }, headers: { "Authorization" => "Bearer #{TOKEN}" }, as: :json
    assert_response :unprocessable_entity
  end
end
