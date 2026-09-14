require "test_helper"

class PushNotificationJobTest < ActiveJob::TestCase
  # Stand-in for Apnotic::Connection that records pushes and answers with a
  # canned response per token.
  class FakeConnection
    Response = Struct.new(:status, :body) do
      def ok? = status == "200"
    end

    attr_reader :pushed

    def initialize(responses)
      @responses = responses
      @pushed = []
    end

    def push(notification)
      @pushed << notification
      @responses.fetch(notification.token)
    end

    def close; end
  end

  setup do
    @live = DeviceToken.create!(token: "a" * 64, platform: "ios")
    @dead = DeviceToken.create!(token: "b" * 64, platform: "macos")
    @notification = Notification.new(title: "Hi", body: "Body", source: "email.x.1")
    @notification.save!(validate: false)
    ENV["APNS_KEY_PATH"] ||= "unused"
    ENV["APNS_KEY_ID"] ||= "unused"
    ENV["APNS_TEAM_ID"] ||= "unused"
  end

  # Swap the APNs connection factory for the duration of the block.
  def with_connection(connection)
    original = Push::Apns.method(:connection)
    Push::Apns.define_singleton_method(:connection) { connection }
    yield
  ensure
    Push::Apns.define_singleton_method(:connection, original)
  end

  test "creating a notification enqueues a push" do
    assert_enqueued_with(job: PushNotificationJob) do
      Notification.create!(title: "t", body: "b", source: "s")
    end
  end

  test "pushes to every device and drops tokens APNs rejects" do
    connection = FakeConnection.new(
      @live.token => FakeConnection::Response.new("200", {}),
      @dead.token => FakeConnection::Response.new("410", { "reason" => "Unregistered" })
    )
    with_connection(connection) { PushNotificationJob.perform_now(@notification.id) }

    assert_equal 2, connection.pushed.size
    alert = JSON.parse(connection.pushed.first.body).dig("aps", "alert")
    assert_equal({ "title" => "Hi", "body" => "Body" }, alert)
    assert_equal Push::Apns::TOPIC, connection.pushed.first.topic
    assert DeviceToken.exists?(@live.id)
    assert_not DeviceToken.exists?(@dead.id)
  end
end
