require "test_helper"

class NotificationControllerTest < ActionDispatch::IntegrationTest
  TOKEN = "notification-test-token".freeze

  setup do
    @fetch_account = Authentication.method(:fetch_account)
    Authentication.define_singleton_method(:fetch_account) { |token| token == TOKEN ? { "id" => 1 } : nil }
    Notification.delete_all
  end

  teardown do
    Authentication.define_singleton_method(:fetch_account, @fetch_account)
  end

  def headers = { "Authorization" => "Bearer #{TOKEN}" }

  def notify(source, title, at, read: false)
    Notification.insert!({ source: source, title: title, body: "#{title} at #{at.to_i}", read: read, created_at: at, updated_at: at })
  end

  test "stacks unread notifications per source, newest stack first" do
    Slack::Channel.create!(id: "C1", name: "backend", is_member: true)
    Slack::Channel.create!(id: "D1", name: "Anouk", is_dm: true, is_member: true)
    now = Time.zone.local(2026, 11, 13, 12)

    5.times { |i| notify("messages.slack.C1", i.even? ? "Thijs" : "Remy", now - 10.minutes + i.minutes) }
    notify("messages.slack.C1", "Old", now - 1.day, read: true)
    notify("messages.slack.D1", "Anouk", now - 30.minutes)
    notify("email.inbox.7", "Invoice", now)

    get "/notifications/stacks", headers: headers
    assert_response :success
    stacks = response.parsed_body

    assert_equal [ "email.inbox.7", "messages.slack.C1", "messages.slack.D1" ], stacks.map { _1["source"] }

    email, channel, dm = stacks
    assert_equal({ "kind" => "email", "title" => "Invoice", "count" => 1, "senders" => [] }, email.slice("kind", "title", "count", "senders"))

    assert_equal "#backend", channel["title"]
    assert_equal 5, channel["count"]
    assert_equal [ "Thijs", "Remy" ], channel["senders"]
    assert_equal 3, channel["previews"].size
    assert_equal [ now - 6.minutes, now - 7.minutes, now - 8.minutes ].map(&:to_i),
      channel["previews"].map { Time.zone.parse(_1["created_at"]).to_i }

    assert_equal "Anouk", dm["title"]
  end

  test "limits the number of stacks" do
    3.times { |i| notify("email.inbox.#{i}", "Mail #{i}", Time.current - i.minutes) }

    get "/notifications/stacks", params: { limit: 2 }, headers: headers
    assert_equal [ "email.inbox.0", "email.inbox.1" ], response.parsed_body.map { _1["source"] }
  end

  test "dismisses a whole source" do
    2.times { notify("email.inbox.1", "Mail", Time.current) }
    notify("email.inbox.2", "Other", Time.current)

    post "/notifications/mark_as_read", params: { source: "email.inbox.1" }, headers: headers
    assert_response :success
    assert_equal [ "email.inbox.2" ], Notification.unread.pluck(:source)

    post "/notifications/mark_as_read", headers: headers
    assert_response :bad_request
  end
end
