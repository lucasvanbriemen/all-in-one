module Seasonal
  # The 24 advent calendar doors, each a small stat from this year's data.
  # A door that has no data or fails to build shows a cozy fallback instead,
  # so one broken stat never takes the calendar down.
  class Advent
    CACHE_TTL = 6.hours
    LOCAL_ZONE = "Europe/Amsterdam"
    # A message sent before this hour still counts as the previous night.
    NIGHT_ENDS_AT = 5.hours

    # An emoji with its skin tone / presentation modifiers and ZWJ sequences (👍🏽, ❤️, 👨‍👩‍👧).
    EMOJI = /\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|\u{FE0F})*(?:\u{200D}\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|\u{FE0F})*)*/

    DOORS = {
      1 => :top_song, 2 => :listening_time, 3 => :distinct_songs, 4 => :top_artist,
      5 => :busiest_listening_day, 6 => :emails_received, 7 => :top_sender, 8 => :busiest_email_day,
      9 => :distinct_senders, 10 => :messages_sent, 11 => :top_dm, 12 => :top_group,
      13 => :favorite_emoji, 14 => :night_owl, 15 => :total_spent, 16 => :albert_heijn,
      17 => :biggest_purchase, 18 => :top_merchant, 19 => :fuel, 20 => :cinema,
      21 => :reminders_done, 22 => :notifications, 23 => :liked_songs, 24 => :year_summary
    }.freeze

    FALLBACKS = [
      { emoji: "🍪", title: "Have a kerstkransje", body: "No stats behind this door, just a cookie and a moment to put your feet up." },
      { emoji: "☕", title: "Hot chocolate break", body: "Nothing to count today. Grab a warm mug, extra whipped cream allowed." },
      { emoji: "🕯️", title: "Light a candle", body: "This door is all cozy vibes: dim the lights and enjoy the quiet." }
    ].freeze

    attr_reader :season

    def initialize(season)
      @season = season
    end

    def doors
      (1..season.unlocked_doors).map { |day| door(day) }
    end

    # The door to show for a day: built (and cached for a few hours) or a fallback.
    def door(day)
      cached = Rails.cache.fetch([ "seasonal/advent", season.year, day ], expires_in: CACHE_TTL, skip_nil: true) { build(day) }
      cached || fallback(day)
    rescue StandardError => e
      Rails.logger.warn("[seasonal] advent door #{day} failed: #{e.class}: #{e.message}")
      fallback(day)
    end

    # Builds a door without the safety net; nil when there is nothing to show.
    def build(day)
      content = send(DOORS.fetch(day))
      content && { day: day, **content }
    end

    private

    def fallback(day)
      { day: day, **FALLBACKS[day % FALLBACKS.size] }
    end

    # -- Music

    def top_song
      song_id, count = top(plays, :song_id)
      song = Music::Song.find_by(id: song_id) if song_id
      return unless song

      content "🎵", "Your song of the year", "You played #{song.title} by #{song.artist} #{times(count)} this year. On repeat, no regrets."
    end

    def listening_time
      seconds = plays.sum(:seconds_played)
      return if seconds.zero?

      content "🎧", "Hours of music", "You listened to #{number(seconds / 3600)} hours of music this year, that's #{TimeConversion.seconds_to_human_readable(seconds)} of nonstop tunes."
    end

    def distinct_songs
      count = plays.distinct.count(:song_id)
      return if count.zero?

      content "💿", "Quite the jukebox", "#{number(count)} different songs kept you company this year."
    end

    def top_artist
      artist, count = top(plays.joins(:song), "songs.artist")
      return unless artist

      content "🎤", "Artist of the year", "#{artist} was your most played artist with #{number(count)} plays. Front-row seats all year."
    end

    def busiest_listening_day
      date, count = busiest_day(plays, "plays.created_at")
      return unless date

      content "🕺", "Your loudest day", "On #{long_date(date)} you played #{number(count)} songs. Must have been a good day!"
    end

    # -- Email

    def emails_received
      count = emails.count
      return if count.zero?

      content "📬", "Santa's mailroom", "#{number(count)} emails landed in your inbox this year. The elves are impressed."
    end

    def top_sender
      sender_id, count = top(emails.where.not(sender_id: nil), :sender_id)
      sender = Sender.find_by(id: sender_id) if sender_id
      return unless sender

      content "💌", "Your biggest pen pal", "#{sender.name} sent you #{number(count)} emails this year. Someone really wants your attention."
    end

    def busiest_email_day
      date, count = busiest_day(emails, "emails.created_at")
      return unless date

      content "📨", "Inbox avalanche", "#{long_date(date)} brought #{number(count)} emails in a single day. Hope there was coffee."
    end

    def distinct_senders
      count = emails.distinct.count(:sender_id)
      return if count.zero?

      content "✉️", "So popular", "#{number(count)} different senders wrote to you this year."
    end

    # -- WhatsApp

    def messages_sent
      count = my_messages.count
      return if count.zero?

      content "💬", "Busy thumbs", "You sent #{number(count)} WhatsApp messages this year. Your thumbs deserve a holiday too."
    end

    def top_dm
      channel, count = top_channel(group_chat: false)
      return unless channel

      content "👯", "Chat buddy of the year", "You and #{channel.display_name} exchanged #{number(count)} messages this year. Besties!"
    end

    def top_group
      channel, count = top_channel(group_chat: true)
      return unless channel

      content "🎉", "Loudest group chat", "#{channel.display_name} was your busiest group with #{number(count)} messages. Mute button? Never heard of it."
    end

    def favorite_emoji
      counts = Hash.new(0)
      my_messages.where.not(body: [ nil, "" ]).pluck(:body).each do |body|
        body.scan(EMOJI) { |emoji| counts[emoji.delete("\u{FE0F}")] += 1 }
      end
      MessageReaction.where(contact_id: my_jids, created_at: season.this_year).where.not(reaction: [ nil, "" ])
        .group(:reaction).count.each { |emoji, count| counts[emoji.delete("\u{FE0F}")] += count }
      emoji, count = counts.max_by(&:last)
      return unless emoji

      content emoji, "Your favourite emoji", "You used #{emoji} #{times(count)} this year. Very expressive of you."
    end

    def night_owl
      latest = my_messages.pluck(:created_at)
        .map { |time| time.in_time_zone(LOCAL_ZONE) }
        .max_by { |time| (time.seconds_since_midnight - NIGHT_ENDS_AT) % 1.day }
      return unless latest

      content "🦉", "Night owl", "Your latest late-night message went out at #{latest.strftime('%H:%M')} on #{long_date(latest)}. Go to bed!"
    end

    # -- Money

    def total_spent
      total = -expenses.sum(:amount)
      return if total.zero?

      content "💸", "Money well spent", "You spent #{euro(total)} this year. It's almost Christmas, so no judgement."
    end

    def albert_heijn
      scope = expenses.where("counterparty_name LIKE ? OR counterparty_name LIKE ?", "%albert heijn%", "AH %")
      count = scope.count
      return if count.zero?

      content "🛒", "Hello, Appie", "#{euro(-scope.sum(:amount))} went to Albert Heijn over #{times(count, word: 'visit')}. That's a lot of stroopwafels."
    end

    def biggest_purchase
      name, amount, date = expenses.order(:amount).pick(:counterparty_name, :amount, :booking_date)
      return unless amount

      content "🎁", "Big spender", "Your biggest single purchase was #{euro(-amount)} at #{name.presence || 'somewhere mysterious'} on #{long_date(date)}."
    end

    def top_merchant
      name, count = top(expenses.where.not(counterparty_name: [ nil, "" ]), :counterparty_name)
      return unless name

      content "🏪", "Regular customer", "You paid #{name} #{times(count)} this year. They should name a parking spot after you."
    end

    def fuel
      total = -expenses.where(category: "Fuel").sum(:amount)
      return if total.zero?

      content "⛽", "Fuelling the sleigh", "#{euro(total)} went on fuel this year. Reindeer would have been cheaper."
    end

    def cinema
      count = expenses.where("counterparty_name LIKE ?", "%pathe%").count
      return if count.zero?

      content "🍿", "Movie magic", "#{times(count, word: 'trip')} to Pathé this year. Popcorn count: unknown, probably high."
    end

    # -- Everything else

    def reminders_done
      count = Reminder.where(completed: true, updated_at: season.this_year).count
      return if count.zero?

      content "✅", "Productivity elf", "You ticked off #{number(count)} reminders this year. Gold star for you."
    end

    def notifications
      count = Notification.where(created_at: season.this_year).count
      return if count.zero?

      content "🔔", "Jingle bells", "Your phone jingled #{number(count)} times with notifications this year."
    end

    def liked_songs
      count = Music::Song.liked_songs.where(created_at: season.this_year).count
      return if count.zero?

      content "❤️", "New favourites", "You added #{number(count)} songs to your liked list this year. Your taste keeps growing."
    end

    def year_summary
      content("🎄", "Your year", "#{season.year} in a nutshell. Thanks for a wonderful year, and merry Christmas!").merge(
        summary: [
          { label: "Songs played", value: number(plays.count) },
          { label: "Hours of music", value: number(plays.sum(:seconds_played) / 3600) },
          { label: "Emails received", value: number(emails.count) },
          { label: "WhatsApps sent", value: number(my_messages.count) },
          { label: "Money spent", value: euro(-expenses.sum(:amount)) },
          { label: "Reminders done", value: number(Reminder.where(completed: true, updated_at: season.this_year).count) },
          { label: "Songs liked", value: number(Music::Song.liked_songs.where(created_at: season.this_year).count) },
          { label: "Notifications", value: number(Notification.where(created_at: season.this_year).count) }
        ]
      )
    end

    # -- Scopes

    def plays = Music::Play.where(created_at: season.this_year)
    def emails = Email.where(created_at: season.this_year)
    def expenses = Bank::Transaction.expense.excluding_savings.where(booking_date: season.this_year_dates)
    def my_jids = @my_jids ||= Whatsapp::Connection.current.my_jids
    def whatsapp_messages = Message.where(type: "Whatsapp::Message", created_at: season.this_year)
    def my_messages = whatsapp_messages.where(contact_id: my_jids)

    # Counts every message in the chat, yours and theirs.
    def top_channel(group_chat:)
      chats = People.chats(group_chat: group_chat, my_jids: my_jids)
      channel_id, count = top(whatsapp_messages.joins(:channel).merge(chats), :channel_id)
      [ Channel.find_by(id: channel_id), count ] if channel_id
    end

    # -- Helpers

    # The most common value of `column` in `scope` and how often it occurs.
    def top(scope, column)
      scope.group(column).order(Arel.sql("COUNT(*) DESC")).limit(1).count.first
    end

    def busiest_day(scope, column)
      date, count = top(scope, Arel.sql("DATE(#{column})"))
      [ date.to_date, count ] if date
    end

    def content(emoji, title, body)
      { emoji: emoji, title: title, body: body }
    end

    def number(value)
      ActiveSupport::NumberHelper.number_to_delimited(value.to_i)
    end

    # Whole euros, e.g. "€1,234": stats read better without cents.
    def euro(amount)
      "€#{number(amount.round)}"
    end

    def times(count, word: nil)
      return "#{number(count)} #{word.pluralize(count)}" if word

      count == 1 ? "once" : "#{number(count)} times"
    end

    def long_date(date)
      date.strftime("%A %-d %B")
    end
  end
end
