require "net/http"

module Slack
  class Api
    BASE_URL = "https://slack.com/api/"
    SECRET = ENV["SLACK_USER_TOKEN"]

    def self.send_message(channel, text, thread_ts: nil)
      post("chat.postMessage", { channel: channel, text: text, thread_ts: thread_ts })
    end

    def self.upload_file(channel, data:, filename:, comment: nil, thread_ts: nil)
      reserved = post("files.getUploadURLExternal", { filename: filename, length: data.bytesize })

      uri = URI(reserved["upload_url"])
      request = Net::HTTP::Post.new(uri)
      request.body = data
      Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |http| http.request(request) }

      completed = post("files.completeUploadExternal", { files: [ { id: reserved["file_id"], title: filename } ].to_json, channel_id: channel, initial_comment: comment, thread_ts: thread_ts }.compact)
      completed
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

    def self.download(url, limit = 3)
      uri = URI(url)
      request = Net::HTTP::Get.new(uri)
      request["Authorization"] = "Bearer #{SECRET}"
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |http| http.request(request) }
      return download(response["location"], limit - 1) if response.is_a?(Net::HTTPRedirection) && limit > 0
      response.body
    end
  end
end
