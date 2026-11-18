module Slack
  class CustomEmoji < ApplicationRecord
    self.table_name = "slack_emojis"
    self.primary_key = "name"

    # Every message and reaction looks these up, so keep the whole (small) set in memory.
    def self.urls
      # Until the migration has run there's simply nothing custom to show.
      return {} unless table_exists?

      Rails.cache.fetch("slack/custom_emoji_urls", expires_in: 10.minutes) { pluck(:name, :url).to_h }
    end

    # emoji.list returns aliases as "alias:<other name>"; store them pointing at the real image.
    def self.sync!
      response = Slack::Api.get("emoji.list")
      raise "emoji.list failed: #{response["error"]}" unless response["ok"]

      list = response["emoji"]
      rows = list.filter_map do |name, value|
        value = list[value.delete_prefix("alias:")] while value.to_s.start_with?("alias:")
        { name: name, url: value } if value.to_s.start_with?("http")
      end

      transaction do
        upsert_all(rows, record_timestamps: true) if rows.any?
        where.not(name: rows.map { |row| row[:name] }).delete_all
      end
      Rails.cache.delete("slack/custom_emoji_urls")
      rows.size
    end
  end
end
