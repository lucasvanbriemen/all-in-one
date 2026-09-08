module Music
  # A generated spoken radio segment (news bulletin, DJ intro or weather/time
  # check). The id doubles as the audio filename in the music project's
  # storage/audio, so it must satisfy that app's get-mp3 endpoint gate of
  # /\A[a-zA-Z0-9-]+\z/; the "talk-" prefix keeps it disjoint from ISRCs
  # (which are 12 alphanumerics).
  #
  # The original also had #audio_path and #ready?, both of which resolve the
  # id against SongCache. That service is not ported yet — the audio files
  # still live under the music project's storage — so the two methods are left
  # out rather than pointed at a directory this app does not have.
  class TalkSegment < ApplicationRecord
    ID_PATTERN = /\Atalk-[a-z0-9-]+\z/
    KINDS = %w[news intro weather].freeze
    LANGUAGES = %w[nl en].freeze

    # MariaDB backs json columns with longtext + a json_valid CHECK, which the
    # adapter reports as text — declare the type so hashes round-trip as JSON.
    attribute :meta, :json

    validates :id, presence: true, format: { with: ID_PATTERN }
    validates :kind, inclusion: { in: KINDS }
    validates :language, inclusion: { in: LANGUAGES }

    scope :ready, -> { where(status: "ready") }

    def self.talk_id?(id)
      id.to_s.start_with?("talk-")
    end
  end
end
