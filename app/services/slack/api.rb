require "net/http"

module Slack
  class Api
    BASE_URL = "https://slack.com/api/"
    SECRET = ENV["SLACK_BOT_TOKEN"]

    def self.getUsers
      uri = URI("#{BASE_URL}users.list")
      request = Net::HTTP::Get.new(uri)
      request["Authorization"] = "Bearer #{SECRET}"
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |http| http.request(request) }
      JSON.parse(response.body)
    end
  end
end
