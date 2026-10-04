require "net/http"

module Whatsapp
  class Bridge
    BASE_URL = ENV.fetch("WHATSAPP_BRIDGE_URL", "http://127.0.0.1:4002")
    SECRET = ENV["WHATSAPP_BRIDGE_SECRET"]

    # Raised when the connector answers with an error or is unreachable.
    class Error < StandardError
      attr_reader :status

      def initialize(status, message)
        @status = status
        super(message)
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

    def self.decrypt_edit(**args) = post("/decrypt-edit", **args)

    # Returns [mimetype, bytes] for a message's media, fetched and decrypted by the connector.
    def self.download_media(kind:, media:)
      uri = URI("#{BASE_URL}/media")
      request = Net::HTTP::Post.new(uri)
      request["Content-Type"] = "application/json"
      request.body = { kind: kind, media: media }.to_json
      response = perform(request, uri, raw: true)
      [ response["Content-Type"], response.body ]
    end

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

    def self.perform(request, uri, raw: false)
      request["X-Bridge-Secret"] = SECRET
      response = Net::HTTP.start(uri.host, uri.port, read_timeout: 120) { |http| http.request(request) }
      unless response.is_a?(Net::HTTPSuccess)
        error = JSON.parse(response.body)["error"] rescue nil
        raise Error.new(response.code.to_i, error || response.message)
      end
      return response if raw

      response.body.present? ? JSON.parse(response.body) : nil
    rescue Errno::ECONNREFUSED, Net::OpenTimeout
      raise Error.new(503, "whatsapp connector is not running")
    end
  end
end
