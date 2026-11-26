# Chat formatting flattened to plain text, for places that can't render it:
# push alerts and the home screen's notification cards. The app's RichText
# component is the rendering counterpart of this.
module RichText
  SLACK_REFERENCE = /<([@#])(\w+)(?:\|([^>]+))?>/

  def self.to_plain(text, platform:)
    return text if text.blank?

    text = slack_to_plain(text) if platform == "slack"
    strip_emphasis(text)
  end

  # Slack writes <@U123>, <#C123|name>, <url|label>, :shortcodes: and escapes <>&.
  def self.slack_to_plain(text)
    ids = text.scan(SLACK_REFERENCE).map(&:second).uniq
    names = ids.empty? ? {} : Contact.where(id: ids).pluck(:id, :name).to_h.merge(Channel.where(id: ids).pluck(:id, :name).to_h)

    text
      .gsub(SLACK_REFERENCE) { "#{$1}#{names[$2].presence || $3&.delete_prefix($1) || $2}" }
      .gsub(/<!(here|channel|everyone)(?:\|[^>]*)?>/) { "@#{$1}" }
      .gsub(/<!subteam\^\w+(?:\|([^>]+))?>/) { $1 || "@team" }
      .gsub(/<((?:https?|mailto):[^|>\s]+)(?:\|([^>]+))?>/) { $2 || $1 }
      # Custom workspace emoji are images, so they stay :named:.
      .gsub(Slack::Emoji::SHORTCODE) { Slack::Emoji.to_unicode($1) }
      .gsub(/^(?:&gt;|>) ?/, "")
      .gsub("&lt;", "<").gsub("&gt;", ">").gsub("&amp;", "&")
  end

  # *bold*, **bold**, _italic_, ~strike~ and `code`, shared by Slack and WhatsApp.
  # Markers only count at word edges, so snake_case and "5*3*2" stay as they are.
  def self.strip_emphasis(text)
    text
      .gsub(/```\n?/, "")
      .gsub(/`([^`\n]+)`/, '\1')
      .gsub(/(?<![\w*])\*\*?(\S(?:[^*\n]*?\S)?)\*\*?(?![\w*])/, '\1')
      .gsub(/(?<![\w_])_(\S(?:[^_\n]*?\S)?)_(?![\w_])/, '\1')
      .gsub(/(?<![\w~])~~?(\S(?:[^~\n]*?\S)?)~~?(?![\w~])/, '\1')
  end
end
