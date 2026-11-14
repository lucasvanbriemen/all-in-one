require "did_you_mean"

module Music
  # Gets the closest matching liked songs for a given query.
  class LikedSongMatcher
    # Bracketed edition notes: "Title (2018 Remaster)", "Title [Live]".
    BRACKETED = /\s*[(\[].*?[)\]]/
    # " - " separates either "Title - Single Version" or, on YouTube,
    # "Artist - Title", so either side may be the actual title.
    DASH = /\s+-\s+/
    FILLER_WORDS = %w[the a an feat ft featuring].freeze
    WORD_SIMILARITY_THRESHOLD = 0.9
    MIN_SCORE = 0.6

    def match(term, songs = Music::Song.liked_songs)
      query = words(term)
      return [] if query.empty?

      songs
        .map { |song| [ song, score(query, song) ] }
        .select { |_, score| score >= MIN_SCORE }
        .sort_by { |song, score| [ -score, song.title ] }
        .map(&:first)
    end

    private

    def score(query, song)
      segments = song.title.to_s.gsub(BRACKETED, "").split(DASH).map { |segment| words(segment) }.reject(&:empty?)
      segments = [ [] ] if segments.empty?
      artist = words(song.artist)

      segments.each_with_index.map { |title, index|
        others = segments.reject.with_index { |_, i| i == index }.flatten
        score_as_title(query, title, title + others + artist)
      }.max
    end

    def score_as_title(query, title, title_and_artist)
      title_hits = matched_count(query, title)
      full_hits = matched_count(query, title_and_artist)

      coverage = full_hits.to_f / query.size
      title_fully_spoken = title_hits == title.size && title.size == query.size
      coverage + (title_fully_spoken ? 0.5 : 0)
    end

    def matched_count(query, candidate_words)
      remaining = candidate_words.dup
      query.count do |word|
        index = remaining.index { |candidate| similar?(word, candidate) }
        index && remaining.delete_at(index)
      end
    end

    def similar?(a, b)
      return true if a == b
      return false if a.length < 3 || b.length < 3
      DidYouMean::JaroWinkler.distance(a, b) >= WORD_SIMILARITY_THRESHOLD
    end

    def words(text)
      text.to_s
        .gsub(BRACKETED, "")
        .downcase
        .delete("'’")
        .gsub(/[^\p{Alnum}\s]/, " ")
        .split
        .reject { |word| FILLER_WORDS.include?(word) }
    end
  end
end
