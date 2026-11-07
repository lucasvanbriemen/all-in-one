module Slack
  # Slack names reactions (":+1:") while WhatsApp and the app use the emoji itself.
  # Covers the reactions people actually use; anything else shows as its :name:.
  module Emoji
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

    UNICODE = NAMES.each_with_object({}) { |(name, emoji), map| map[emoji] ||= name }.freeze

    # "+1::skin-tone-3" is still a thumbs up.
    def self.to_unicode(name)
      base = name.to_s.split("::").first
      NAMES[base] || ":#{base}:"
    end

    def self.to_name(emoji)
      UNICODE[emoji] || UNICODE[emoji.to_s.delete("\u{FE0F}")] || emoji.to_s.delete_prefix(":").delete_suffix(":").presence
    end
  end
end
