module Music
  class SongSearch
    def search(term, use_liked_songs: false)
      return LikedSongMatcher.new.match(term) if use_liked_songs

      results = YoutubeMusic.new.search(term)
      liked = Song.liked_songs.where(id: results.map { |song| song[:id] }).pluck(:id).to_set
      results.map { |song| song.merge(is_liked: liked.include?(song[:id])) }
    end
  end
end
