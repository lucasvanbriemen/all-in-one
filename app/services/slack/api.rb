require "net/http"

module Slack
  class Api
    BASE_URL = "https://slack.com/api/"
    SECRET = ENV["SLACK_USER_TOKEN"]

    def send_message(channel, text)
      return post("chat.postMessage", { channel: channel, text: text })
    end

    def self.get(path, params = {})
      uri = URI("#{BASE_URL}#{path}")
      uri.query = params.compact.to_query if params.compact.any?
      request = Net::HTTP::Get.new(uri)
      request["Authorization"] = "Bearer #{SECRET}"
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |http| http.request(request) }
      JSON.parse(response.body)
    end

    def self.post(path, params = {})
      uri = URI("#{BASE_URL}#{path}")
      request = Net::HTTP::Post.new(uri)
      request["Authorization"] = "Bearer #{SECRET}"
      request.set_form_data(params) if params.any?
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |http| http.request(request) }
      JSON.parse(response.body)
    end
  end
end
