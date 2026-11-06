require "test_helper"

class Slack::EmojiTest < ActiveSupport::TestCase
  test "turns slack names into emoji, ignoring skin tones" do
    assert_equal "👍", Slack::Emoji.to_unicode("+1")
    assert_equal "👍", Slack::Emoji.to_unicode("thumbsup::skin-tone-3")
    assert_equal ":custom_party:", Slack::Emoji.to_unicode("custom_party")
  end

  test "turns emoji back into the name slack expects" do
    assert_equal "+1", Slack::Emoji.to_name("👍")
    assert_equal "heart", Slack::Emoji.to_name("❤️")
    assert_equal "custom_party", Slack::Emoji.to_name(":custom_party:")
  end

  test "every quick reaction in the app has a slack name" do
    %w[👍 ❤️ 😂 😮 😢 🙏].each do |emoji|
      assert Slack::Emoji::UNICODE.key?(emoji), "#{emoji} has no slack name"
    end
  end
end
