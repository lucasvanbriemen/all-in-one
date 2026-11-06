require "test_helper"

class MessagesControllerTest < ActionDispatch::IntegrationTest
  TOKEN = "reactions-test-token".freeze
  ME_JID = "31600000001@s.whatsapp.net".freeze
  FRIEND_JID = "31600000002@s.whatsapp.net".freeze
  SLACK_ME = Contact::MY_CONTACT_IDS.first

  setup do
    @fetch_account = Authentication.method(:fetch_account)
    Authentication.define_singleton_method(:fetch_account) { |token| token == TOKEN ? { "id" => 1 } : nil }

    @bridge_calls = calls = []
    @slack_calls = slack_calls = []
    @bridge_react = Whatsapp::Bridge.method(:react)
    @bridge_send_text = Whatsapp::Bridge.method(:send_text)
    @bridge_read = Whatsapp::Bridge.method(:read)
    Whatsapp::Bridge.define_singleton_method(:send_text) { |**args| calls << [ :send_text, args ] }
    Whatsapp::Bridge.define_singleton_method(:read) { |**| nil }
    @slack_post = Slack::Api.method(:post)
    Whatsapp::Bridge.define_singleton_method(:react) { |**args| calls << args }
    Slack::Api.define_singleton_method(:post) { |path, params = {}| slack_calls << [ path, params ]; { "ok" => true } }

    Whatsapp::Connection.current.update!(me_jid: ME_JID)
    Whatsapp::Contact.find_or_create_by!(id: FRIEND_JID)
    @chat = Whatsapp::Channel.find_or_create_by!(id: FRIEND_JID) { |c| c.is_dm = true }
    @wa_message = Whatsapp::Message.create!(id: "TESTREACT#{SecureRandom.hex(4)}", channel: @chat, contact_id: FRIEND_JID, body: "hi")

    Slack::Contact.find_or_create_by!(id: SLACK_ME)
    @slack_channel = Slack::Channel.find_or_create_by!(id: "CTESTREACT")
    @slack_message = Slack::Message.create!(id: "CTESTREACT-1700000000.#{rand(100000..999999)}", channel: @slack_channel, contact_id: SLACK_ME, body: "yo")
  end

  teardown do
    Authentication.define_singleton_method(:fetch_account, @fetch_account)
    Whatsapp::Bridge.define_singleton_method(:react, @bridge_react)
    Whatsapp::Bridge.define_singleton_method(:send_text, @bridge_send_text)
    Whatsapp::Bridge.define_singleton_method(:read, @bridge_read)
    @reply&.delete
    Slack::Api.define_singleton_method(:post, @slack_post)
    [ @wa_message, @slack_message ].each { |m| m.reactions.delete_all; m.delete }
  end

  def react(message, emoji, method: :post)
    send(method, "/channels/#{CGI.escape(message.channel_id)}/messages/#{message.id}/reactions",
      params: { emoji: emoji }, headers: { "Authorization" => "Bearer #{TOKEN}" })
    assert_response :success
    response.parsed_body
  end

  test "whatsapp: reacting sends it through the bridge and replaces my earlier reaction" do
    react(@wa_message, "👍")
    body = react(@wa_message, "❤️")

    assert_equal [ "❤️" ], body.map { |r| r["emoji"] }
    assert body.first["from_me"]
    assert_equal({ chat: FRIEND_JID, id: @wa_message.id, from_me: false, participant: nil, emoji: "❤️" }, @bridge_calls.last)
  end

  test "whatsapp: removing sends an empty reaction" do
    react(@wa_message, "👍")
    body = react(@wa_message, "👍", method: :delete)

    assert_empty body
    assert_nil @bridge_calls.last[:emoji]
  end

  test "slack: reactions go out by name and come back as emoji" do
    body = react(@slack_message, "👍")

    assert_equal [ "👍" ], body.map { |r| r["emoji"] }
    assert_equal [ "reactions.add", { channel: "CTESTREACT", timestamp: @slack_message.id.delete_prefix("CTESTREACT-"), name: "+1" } ], @slack_calls.last

    assert_empty react(@slack_message, "👍", method: :delete)
    assert_equal "reactions.remove", @slack_calls.last.first
  end

  test "whatsapp: a reply quotes the original message" do
    post "/channels/#{CGI.escape(@chat.id)}/messages", params: { text: "same", quote_id: @wa_message.id },
      headers: { "Authorization" => "Bearer #{TOKEN}" }
    assert_response :success

    assert_equal [ :send_text, { to: FRIEND_JID, text: "same", quote: { id: @wa_message.id, from_me: false, participant: nil, body: "hi" } } ], @bridge_calls.last
  end

  test "chat history carries the quoted message and who wrote it" do
    Whatsapp::Contact.find_or_create_by!(id: ME_JID)
    @reply = Whatsapp::Message.create!(id: "TESTREPLY#{SecureRandom.hex(4)}", channel: @chat, contact_id: ME_JID, body: "same", quoted_message_id: @wa_message.id)

    get "/channels/#{CGI.escape(@chat.id)}/messages", headers: { "Authorization" => "Bearer #{TOKEN}" }
    assert_response :success

    reply = response.parsed_body.find { |m| m["id"] == @reply.id }
    assert_equal "whatsapp", reply["platform"], "the app decides between quoting and threads on this"
    quoted = reply["quoted_message"]
    assert_equal "hi", quoted["body"]
    assert_equal false, quoted["from_me"]
    assert_equal [], quoted["file_uploads"]
  end
end
