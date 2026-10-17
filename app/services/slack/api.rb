require "net/http"

module Slack
  class Api
    BASE_URL = "https://slack.com/api/"
    SECRET = ENV["SLACK_USER_TOKEN"]

    def self.getUsers
      get("users.list")
    end

    def self.getConversations
      results = []
      cursor = nil

      loop do
        response = get("conversations.list", types: "im,mpim,private_channel,public_channel", limit: 1000, cursor: cursor)
        return response unless response["ok"]

        results.concat(response["channels"])
        cursor = response.dig("response_metadata", "next_cursor")
        break if cursor.blank?
      end

      results
    end

    def self.get(path, params = {})
      uri = URI("#{BASE_URL}#{path}")
      uri.query = params.compact.to_query if params.compact.any?
      request = Net::HTTP::Get.new(uri)
      request["Authorization"] = "Bearer #{SECRET}"
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |http| http.request(request) }
      JSON.parse(response.body)
    end
  end
end
