# The unread notifications of one source (a chat, an email, a transaction),
# shown as a single card. A busy Slack channel raises dozens of notifications
# that are all dismissed together, so the home screen lists stacks, not rows.
class Notification::Stack
  PREVIEWS = 3

  attr_reader :source, :count, :latest_at, :senders, :previews
  attr_accessor :title

  def initialize(source:, count:, latest_at:, senders:, previews:)
    @source = source
    @count = count
    @latest_at = latest_at
    @senders = senders
    @previews = previews
    @title = previews.first&.title
  end

  # The newest `limit` stacks, newest first, in four queries however many
  # notifications are unread: the groups, their newest few rows, their senders
  # and the channels they belong to.
  def self.unread(limit: 50, previews: PREVIEWS)
    groups = Notification.unread.group(:source)
      .order(Arel.sql("MAX(created_at) DESC"))
      .limit(limit)
      .pluck(:source, Arel.sql("COUNT(*)"), Arel.sql("MAX(created_at)"))
    return [] if groups.empty?

    sources = groups.map(&:first)
    rows = newest_rows(sources, previews).group_by(&:source)
    # Only a chat's titles are people (an email's is its subject); latest speaker first.
    senders = Notification.unread.where(source: sources).where("source LIKE ?", "messages.%")
      .group(:source, :title).order(Arel.sql("MAX(created_at) DESC")).pluck(:source, :title)
      .each_with_object(Hash.new { |hash, key| hash[key] = [] }) { |(source, title), all| all[source] << title if title.present? }

    stacks = groups.map do |source, count, latest_at|
      new(source: source, count: count, latest_at: latest_at, senders: senders[source], previews: rows[source] || [])
    end
    name_after_channels(stacks)
  end

  # Each source's newest `limit` rows, numbered per source by a window function.
  def self.newest_rows(sources, limit)
    ranked = Notification.unread.where(source: sources)
      .select("notifications.*, ROW_NUMBER() OVER (PARTITION BY source ORDER BY created_at DESC, id DESC) AS position")
    Notification.from(ranked, :notifications).where("position <= ?", limit).order(created_at: :desc, id: :desc).to_a
  end

  # A chat's notifications are titled with the sender; the card is titled
  # with the chat. "messages.<kind>.<id>": WhatsApp ids contain dots, so only
  # the first two separate parts.
  def self.name_after_channels(stacks)
    chats = stacks.select(&:chat?)
    channels = Channel.where(id: chats.map(&:channel_id)).includes(:contact).to_a
    Whatsapp::Channel.preload_resolved_contacts(channels.grep(Whatsapp::Channel))
    channels = channels.index_by(&:id)

    chats.each do |stack|
      channel = channels[stack.channel_id]
      next unless channel

      stack.title = channel.is_a?(Slack::Channel) && !channel.is_dm && !channel.is_group_chat ? "##{channel.name}" : channel.display_name
    end
    stacks
  end

  def kind
    source.to_s.split(".", 3).first
  end

  def chat?
    kind == "messages"
  end

  def channel_id
    source.to_s.split(".", 3).third if chat?
  end

  def as_json(*)
    {
      source: source,
      kind: kind,
      title: title,
      count: count,
      latest_at: latest_at,
      senders: senders,
      previews: previews.map { |row| row.as_json(only: %i[id title body created_at]) }
    }
  end
end
