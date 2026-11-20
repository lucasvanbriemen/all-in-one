module Slack
  # Slack names emoji (":+1:") while WhatsApp and the app use the emoji itself.
  # ALL is Slack's own list (iamcal/emoji-data, generated into lib/emoji/slack_names.json);
  # workspace emoji like :party_parrot: are images, see Slack::CustomEmoji.
  module Emoji
    ALL = JSON.parse(File.read(Rails.root.join("lib/emoji/slack_names.json"))).freeze
    SHORTCODE = /:([a-z0-9_+'\-]+):/

    # The names we'd rather send back to Slack when reacting with a given emoji.
    NAMES = {
      "+1" => "👍", "thumbsup" => "👍", "-1" => "👎", "thumbsdown" => "👎",
      "heart" => "❤️", "joy" => "😂", "open_mouth" => "😮", "cry" => "😢", "pray" => "🙏",
      "smile" => "😄", "smiley" => "😃", "grinning" => "😀", "laughing" => "😆", "sweat_smile" => "😅",
      "rolling_on_the_floor_laughing" => "🤣", "wink" => "😉", "blush" => "😊", "slightly_smiling_face" => "🙂",
      "upside_down_face" => "🙃", "heart_eyes" => "😍", "thinking_face" => "🤔", "face_with_rolling_eyes" => "🙄",
      "grimacing" => "😬", "sob" => "😭", "scream" => "😱", "sunglasses" => "😎", "eyes" => "👀",
      "tada" => "🎉", "fire" => "🔥", "rocket" => "🚀", "100" => "💯", "clap" => "👏", "raised_hands" => "🙌",
      "muscle" => "💪", "ok_hand" => "👌", "wave" => "👋", "white_check_mark" => "✅", "heavy_check_mark" => "✔️",
      "x" => "❌", "warning" => "⚠️", "star" => "⭐", "sparkles" => "✨", "bulb" => "💡", "pushpin" => "📌",
      "point_up" => "☝️", "facepalm" => "🤦", "shrug" => "🤷", "see_no_evil" => "🙈", "skull" => "💀",
      "melting_face" => "🫠", "saluting_face" => "🫡", "heart_hands" => "🫶"
    }.freeze

    UNICODE = NAMES.merge(ALL) { |_name, preferred, _| preferred }
      .each_with_object({}) { |(name, emoji), map| map[emoji] ||= name }.freeze

    # "+1::skin-tone-3" is still a thumbs up.
    def self.to_unicode(name)
      base = name.to_s.split("::").first
      NAMES[base] || ALL[base] || ":#{base}:"
    end

    # Image for a custom workspace emoji, nil for standard ones.
    def self.url(name)
      base = name.to_s.split("::").first
      CustomEmoji.urls[base] unless NAMES[base] || ALL[base]
    end

    # What each :shortcode: in a text renders as: the emoji, or a custom emoji's image URL.
    # Unknown names (and things like "10:30:00") are left out, so they stay plain text.
    def self.in_text(text)
      names = text.to_s.scan(SHORTCODE).flatten.uniq
      return {} if names.empty?

      names.each_with_object({}) do |name, map|
        value = NAMES[name] || ALL[name] || CustomEmoji.urls[name]
        map[name] = value if value
      end
    end

    def self.to_name(emoji)
      UNICODE[emoji] || UNICODE[emoji.to_s.delete("\u{FE0F}")] || emoji.to_s.delete_prefix(":").delete_suffix(":").presence
    end
  end
end
