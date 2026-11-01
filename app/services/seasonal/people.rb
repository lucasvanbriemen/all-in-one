module Seasonal
  # Who has been naughty (promotional mail) or nice (the people you chat with),
  # and which of them you have wished a merry Christmas.
  class People
    LIST_SIZE = 5
    GREETING_LIST_SIZE = 20
    GREETING_MIN_MESSAGES = 10

    # MariaDB REGEXP over the lowercased subject.
    PROMO_SUBJECT = "black friday|cyber monday|sale|korting|aanbieding|deal|%|kerst|gratis|actie|uitverkoop|last chance|laatste kans"
    FESTIVE = /merry christmas|happy holidays|fijne feestdagen|prettige feestdagen|vrolijk kerstfeest|fijne kerst|gezellige kerst|zalig kerstfeest|happy christmas|xmas|🎄|🎅/i

    # WhatsApp chats with people or groups; leaves out status updates, newsletters and the chat with yourself.
    def self.chats(group_chat:, my_jids:)
      Channel.whatsapp.where(is_group_chat: group_chat).where.not(id: my_jids)
        .where("channels.id LIKE ? OR channels.id LIKE ? OR channels.id LIKE ?", "%@s.whatsapp.net", "%@lid", "%@g.us")
    end

    attr_reader :season

    def initialize(season)
      @season = season
    end

    # Senders of the most promotional mail since November, one entry per sender
    # (or per name for mail without a sender record).
    def naughty
      counts = Email.where(created_at: season.since(season.november))
        .where("LOWER(emails.subject) REGEXP ?", PROMO_SUBJECT)
        .group(:sender_id, :sender_name).count
      senders = Sender.where(id: counts.keys.filter_map(&:first)).index_by(&:id)

      counts.group_by { |(sender_id, name), _| sender_id || name.to_s }.map do |_, rows|
        sender = senders[rows.first.first.first]
        name = rows.max_by(&:last).first.last.presence || sender&.name || "Mystery sender"
        { name: name, email: sender&.email, count: rows.sum(&:last) }
      end.sort_by { |entry| [ -entry[:count], entry[:name] ] }.first(LIST_SIZE)
    end

    def nice
      top_chats(limit: LIST_SIZE).map do |channel, count|
        { name: channel.display_name, channel_id: channel.id, count: count }
      end
    end

    # Your most messaged people, and whether you've sent them season's greetings since Christmas Eve.
    def greetings
      chats = top_chats(limit: GREETING_LIST_SIZE, min: GREETING_MIN_MESSAGES)
      greeted = greeted_channel_ids(chats.map { |channel, _| channel.id })

      chats.map do |channel, _|
        { channel_id: channel.id, name: channel.display_name, avatar_url: channel.avatar_url.presence, greeted: greeted.include?(channel.id) }
      end
    end

    private

    def my_jids = @my_jids ||= Whatsapp::Connection.current.my_jids

    def my_messages(range)
      Message.where(type: "Whatsapp::Message", contact_id: my_jids, created_at: range)
    end

    # One-on-one chats by how many messages you sent there this year, busiest first.
    def top_chats(limit:, min: 1)
      counts = my_messages(season.this_year).joins(:channel).merge(self.class.chats(group_chat: false, my_jids: my_jids))
        .group(:channel_id).having("COUNT(*) >= ?", min)
        .order(Arel.sql("COUNT(*) DESC")).limit(limit).count
      channels = Channel.where(id: counts.keys).includes(:contact).index_by(&:id)

      counts.filter_map { |id, count| [ channels[id], count ] if channels[id] }
    end

    # Only a few days of messages, so matching in Ruby is cheap and copes with emoji.
    def greeted_channel_ids(channel_ids)
      return Set.new if channel_ids.empty?

      my_messages(season.since(season.christmas_eve)).where(channel_id: channel_ids).where.not(body: nil)
        .pluck(:channel_id, :body).filter_map { |id, body| id if body.match?(FESTIVE) }.to_set
    end
  end
end
