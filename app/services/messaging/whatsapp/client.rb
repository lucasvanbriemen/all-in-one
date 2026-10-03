require "net/http"

module Messaging
  module Whatsapp
    # HTTP client for the WhatsApp connector (whatsapp-connector/). The
    # connector is a modem: it holds the session and does what it is told.
    module Client
      TIMEOUT_SECONDS = 20

      def self.base_url
        ENV.fetch("WHATSAPP_BRIDGE_URL", "http://127.0.0.1:4002")
      end

      def self.secret
        ENV.fetch("WHATSAPP_BRIDGE_SECRET", "")
      end

      def self.state = get("/state")
      def self.chats = get("/chats")
      def self.contacts = get("/contacts")
      def self.groups = get("/groups")
      def self.avatar(jid) = get("/avatar", jid: jid)

      def self.pair(phone: nil) = post("/pair", { phone: phone }.compact)
      def self.send_text(to:, text:, quote_id: nil, mentions: nil) = post("/send", { to: to, text: text, quote_id: quote_id, mentions: mentions }.compact)
      def self.react(chat:, message_id:, from_me:, participant: nil, emoji:) = post("/react", { chat: chat, message_id: message_id, from_me: from_me, participant: participant, emoji: emoji }.compact)
      def self.read(chat:, messages:) = post("/read", { chat: chat, messages: messages })
      def self.typing(chat:, typing: true) = post("/typing", { chat: chat, typing: typing })
      def self.logout = post("/logout", {})

      class Error < StandardError
        attr_reader :status

        def initialize(message, status: nil)
          super(message)
          @status = status
        end
      end

      def self.get(path, params = {})
        uri = URI("#{base_url}#{path}")
        uri.query = params.to_query if params.any?
        request(Net::HTTP::Get.new(uri), uri)
      end

      def self.post(path, body)
        uri = URI("#{base_url}#{path}")
        req = Net::HTTP::Post.new(uri)
        req["Content-Type"] = "application/json"
        req.body = body.to_json
        request(req, uri)
      end

      def self.request(req, uri)
        req["X-Bridge-Secret"] = secret if secret.present?
        response = Net::HTTP.start(uri.host, uri.port, read_timeout: TIMEOUT_SECONDS, open_timeout: 5) { |http| http.request(req) }
        json = JSON.parse(response.body) rescue {}
        raise Error.new(json["error"] || "connector responded #{response.code}", status: response.code.to_i) unless response.is_a?(Net::HTTPSuccess)
        json
      rescue Errno::ECONNREFUSED, Net::OpenTimeout => e
        raise Error.new("connector unreachable: #{e.message}", status: 503)
      end

      private_class_method :get, :post, :request
    end
  end
end
