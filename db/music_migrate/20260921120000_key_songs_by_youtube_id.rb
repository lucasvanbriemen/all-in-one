# Songs used to be keyed by ISRC, looked up through iTunes and Deezer. They
# are now keyed by the YouTube video id that is searched and downloaded, so
# the columns are renamed to say what they hold. Existing rows are remapped
# by `bin/rails music:remap_to_youtube`.
class KeySongsByYoutubeId < ActiveRecord::Migration[8.0]
  def change
    rename_column :songs, :isrc, :id
    rename_column :plays, :song_isrc, :song_id
    rename_column :playlist_songs, :song_isrc, :song_id
    rename_column :karaoke_scores, :song_isrc, :song_id
  end
end
