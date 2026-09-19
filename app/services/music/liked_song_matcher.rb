require "did_you_mean"

module Music
  # Matches a spoken or typed query against the liked songs, ranked best first.
  #
  # Built for Siri ("play another day in paradise"), so it has to survive the
  # ways a spoken title differs from the stored one: edition suffixes like
  # "(2018 Remaster)" or "- Live", the artist tacked on or left off, and
  # transcription slips ("paradice"). Titles and queries are reduced to word
  # lists and compared word by word; a word counts as matched when it is
  # identical or close enough by Jaro-Winkler to be a mishearing.
  class LikedSongMatcher
    # Strip anything in brackets and dash-separated edition suffixes:
    # "Title (2018 Remaster)", "Title [Live]", "Title - Single Version".
    EDITION_SUFFIX = /\s*[(\[].*?[)\]]|\s+-\s+.*$/
    FILLER_WORDS = %w[the a an feat ft featuring].freeze
    WORD_SIMILARITY_THRESHOLD = 0.9
    MIN_SCORE = 0.6

    def match(term, songs = Music::Song.liked_songs)
      query = words(term)
      return [] if query.empty?

      songs
        .map { |song| [song, score(query, song)] }
        .select { |_, score| score >= MIN_SCORE }
        .sort_by { |song, score| [-score, song.title] }
        .map(&:first)
    end

    private

    # Fraction of query words found in the song's title, or in title+artist
    # when the query says more than the title alone. A title that is matched
    # in full and nothing else gets a bonus so "Paradise" outranks
    # "Another Day In Paradise" for the query "paradise".
    def score(query, song)
      title = words(song.title)
      title_and_artist = title + words(song.artist)

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
        .sub(EDITION_SUFFIX, "")
        .downcase
        .gsub(/[^\p{Alnum}\s]/, " ")
        .split
        .reject { |word| FILLER_WORDS.include?(word) }
    end
  end
end
