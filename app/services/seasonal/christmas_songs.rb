module Seasonal
  # A Christmas playlist when there is one, otherwise songs whose title sounds festive.
  class ChristmasSongs
    LIMIT = 200
    PLAYLIST_NAME = /christmas|kerst|xmas/i
    KEYWORDS = [
      "christmas", "xmas", "santa", "jingle", "sleigh", "snow", "mistletoe", "reindeer", "rudolph", "noel",
      "navidad", "kerst", "holiday", "winter wonderland", "silent night", "feliz", "let it snow", "last christmas",
      "all i want for christmas", "frosty", "white christmas", "little drummer", "o holy", "deck the halls"
    ].freeze

    def self.call
      from_playlist.presence || from_titles
    end

    def self.from_playlist
      playlist = Music::Playlist.select(:id, :name).to_a.find { |p| p.name.match?(PLAYLIST_NAME) && p.songs.exists? }
      return [] unless playlist

      playlist.songs.order("playlist_songs.created_at").limit(LIMIT).to_a.uniq
    end

    def self.from_titles
      Music::Song.where(KEYWORDS.map { "LOWER(songs.title) LIKE ?" }.join(" OR "), *KEYWORDS.map { |k| "%#{k}%" })
        .order(is_liked: :desc, title: :asc).limit(LIMIT).to_a
    end
  end
end
