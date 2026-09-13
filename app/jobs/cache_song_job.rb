# Warms the MP3 cache for one song so pressing play on it is instant, instead
# of waiting the 10-15s a first download takes (see Music::SongCache).
class CacheSongJob < ApplicationJob
  queue_as :default

  def perform(isrc)
    Music::SongCache.ensure_cached(isrc)
  rescue Music::DeezerClient::Error => error
    Rails.logger.warn("[music] not caching #{isrc}: #{error.message}")
  end
end
