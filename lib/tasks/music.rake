namespace :music do
  desc "Re-key songs from ISRC to YouTube video id (idempotent; run once after KeySongsByYoutubeId)"
  task remap_to_youtube: :environment do
    Music::YoutubeRemap.new.run
  end
end
