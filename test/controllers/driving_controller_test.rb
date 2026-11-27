require "test_helper"

# Posts the same payloads the iOS Shortcuts send and reads them back through /driving.
class DrivingControllerTest < ActionDispatch::IntegrationTest
  TOKEN = "driving-test-token".freeze
  AVERAGE_PRICE = 2.10

  setup do
    @fetch_account = Authentication.method(:fetch_account)
    Authentication.define_singleton_method(:fetch_account) { |token| token == TOKEN ? { "id" => 1 } : nil }

    # Don't call CBS from tests: one flat average price for every day.
    @fuel_prices = Driving::FuelPrices.method(:since)
    Driving::FuelPrices.define_singleton_method(:since) { |date| (date..Date.current).index_with { AVERAGE_PRICE } }

    DeviceEvent.delete_all
    Bank::Transaction.delete_all
    Bank::Account.delete_all
    Bank::Connection.delete_all
  end

  teardown do
    Authentication.define_singleton_method(:fetch_account, @fetch_account)
    Driving::FuelPrices.define_singleton_method(:since, @fuel_prices)
  end

  def headers = { "Authorization" => "Bearer #{TOKEN}" }

  def send_event(event, value, at)
    travel_to(at) { post "/phone/events", params: { event: event, value: value }, headers: headers, as: :json }
    assert_response :ok
  end

  def fuel_transaction(amount, booked_on)
    account = Bank::Account.first || create_account
    Bank::Transaction.create!(
      account: account, entry_reference: SecureRandom.hex(8), booking_date: booked_on,
      amount: -amount, currency: "EUR", status: "BOOK", category: "Fuel", counterparty_name: "Tinq Hoogvliet"
    )
  end

  def create_account
    connection = Bank::Connection.create!(session_id: "test", aspsp_name: "ING", aspsp_country: "NL", valid_until: 1.year.from_now)
    Bank::Account.create!(connection: connection, uid: "acc", iban: "NL00TEST0000000000", currency: "EUR")
  end

  def driving
    get "/driving", params: { since: "2026-11-01" }, headers: headers
    assert_response :ok
    response.parsed_body
  end

  test "carplay events become one trip with km, across a short reconnect" do
    morning = Time.zone.local(2026, 11, 30, 7)
    send_event "carplay", { connected: true, lat: 50.998, lng: 5.866 }, morning
    send_event "carplay", { connected: false, lat: 51.47, lng: 5.47 }, morning + 50.minutes
    send_event "carplay", { connected: true, lat: 51.47, lng: 5.47 }, morning + 52.minutes
    send_event "carplay", { connected: false, lat: 51.92, lng: 4.48 }, morning + 2.hours

    trips = driving["trips"]
    assert_equal 1, trips.size
    assert_equal 120, trips.first["minutes"]
    assert_in_delta 183, trips.first["km"], 5
  end

  test "carplay without a location still makes a trip, just without km" do
    send_event "carplay", { connected: true }, Time.zone.local(2026, 11, 30, 17)
    send_event "carplay", { connected: false }, Time.zone.local(2026, 11, 30, 17, 25)

    trip = driving["trips"].sole
    assert_equal 25, trip["minutes"]
    assert_nil trip["km"]
  end

  test "litres from the pump match the bank transaction and set the discount for the others" do
    fuel_transaction(57.46, Date.new(2026, 11, 12))
    fuel_transaction(60.00, Date.new(2026, 11, 20))
    send_event "fuel", { litres: "29,0", amount: "€ 57,46" }, Time.zone.local(2026, 11, 11, 6, 20)

    entered, estimated = driving["fill_ups"]

    assert_equal "entered", entered["litres_source"]
    assert_in_delta 29.0, entered["litres"]
    assert_in_delta 1.981, entered["price_per_litre"], 0.001

    # Same discount as the entered fill-up (1.981 / 2.10), not the plain average.
    assert_equal "estimated", estimated["litres_source"]
    assert_in_delta 60.00 / 1.981, estimated["litres"], 0.1
  end

  test "home_wifi's plain true/false still works" do
    send_event "home_wifi", true, Time.zone.local(2026, 11, 30, 18)
    assert_equal true, DeviceEvent.last.value
  end
end
