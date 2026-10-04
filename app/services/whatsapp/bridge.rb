require "net/http"

module Whatsapp
  # HTTP client for the Node connector in whatsapp-connector/.
  class Bridge
    BASE_URL = ENV.fetch("WHATSAPP_BRIDGE_URL", "http://127.0.0.1:4002")
    SECRET = ENV["WHATSAPP_BRIDGE_SECRET"]

    class Error < StandardError
      attr_reader :status, :body

      def initialize(status, body)
        @status = status
        @body = body
        super(body.is_a?(Hash) ? body["error"] : body.to_s)
      end
    end

    def self.state = get("/state")
    def self.chats = get("/chats")
    def self.contacts = get("/contacts")
    def self.groups = get("/groups")
    def self.avatar(jid) = get("/avatar", jid: jid)

    def self.pair(phone = nil) = post("/pair", phone: phone)
    def self.send_text(to:, text:, quote_id: nil, mentions: nil) = post("/send", to: to, text: text, quote_id: quote_id, mentions: mentions)
    def self.react(chat:, message_id:, emoji:, from_me: false, participant: nil) = post("/react", chat: chat, message_id: message_id, emoji: emoji, from_me: from_me, participant: participant)
    def self.mark_read(chat:, messages:) = post("/read", chat: chat, messages: messages)
    def self.typing(chat:, typing: true) = post("/typing", chat: chat, typing: typing)

    def self.get(path, params = {})
      uri = URI("#{BASE_URL}#{path}")
      uri.query = params.compact.to_query if params.compact.any?
      perform(Net::HTTP::Get.new(uri), uri)
    end

    def self.post(path, body = {})
      uri = URI("#{BASE_URL}#{path}")
      request = Net::HTTP::Post.new(uri)
      request["Content-Type"] = "application/json"
      request.body = body.compact.to_json
      perform(request, uri)
    end

    def self.perform(request, uri)
      request["X-Bridge-Secret"] = SECRET
      response = Net::HTTP.start(uri.host, uri.port, read_timeout: 30) { |http| http.request(request) }
      body = response.body.present? ? JSON.parse(response.body) : nil
      raise Error.new(response.code.to_i, body) unless response.is_a?(Net::HTTPSuccess)

      body
    end
  end
end
