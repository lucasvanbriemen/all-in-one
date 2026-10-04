module Whatsapp
  class Message < ApplicationRecord
    self.table_name = "whatsapp_messages"

    # MariaDB exposes json columns as longtext, so Rails would otherwise store Ruby inspect output.
    attribute :media, :json
    attribute :mentions, :json

    PER_PAGE = 50
    # Download credentials stay server-side; clients get a media URL instead.
    # Never expose the per-message secret; it unlocks edits, poll votes and reactions on this message.
    MEDIA_SECRET_KEYS = %w[url direct_path media_key file_sha256 file_enc_sha256].freeze
    MEDIA_DIR = Rails.root.join("storage", "whatsapp", "media")

    belongs_to :chat, class_name: "Whatsapp::Chat", primary_key: :jid, foreign_key: :chat_jid, optional: true
    belongs_to :sender, class_name: "Whatsapp::Contact", primary_key: :jid, foreign_key: :sender_jid, optional: true
    has_many :reactions, ->(message) { where(chat_jid: message.chat_jid) },
             class_name: "Whatsapp::Reaction", primary_key: :wa_id, foreign_key: :message_wa_id

    scope :active, -> { where(deleted_at: nil) }
    scope :newest_first, -> { order(sent_at: :desc, id: :desc) }

    def deleted?
      deleted_at.present?
    end

    def downloadable_media?
      media.is_a?(Hash) && media["media_key"].present?
    end

    def public_media
      media.is_a?(Hash) ? media.except(*MEDIA_SECRET_KEYS) : media
    end

    def media_cache_path
      MEDIA_DIR.join(chat_jid.parameterize, "#{wa_id.parameterize}#{media_extension}")
    end

    # Returns [mimetype, bytes], fetching through the connector on first access and caching on disk afterwards.
    def media_file
      path = media_cache_path
      return [ media["mimetype"], File.binread(path) ] if path.exist?

      mimetype, bytes = Bridge.download_media(kind: kind, media: media)
      FileUtils.mkdir_p(path.dirname)
      File.binwrite(path, bytes)
      [ mimetype.presence || media["mimetype"], bytes ]
    end

    def display_sender_name
      return "You" if from_me
      sender&.display_name || sender_name.presence || sender_jid.to_s.split("@").first
    end

    private

    def media_extension
      ext = Rack::Mime::MIME_TYPES.key(media["mimetype"].to_s.split(";").first)
      ext || File.extname(media["filename"].to_s)
    end
  end
end
