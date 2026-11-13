class Email < ApplicationRecord
  belongs_to :sender, optional: true

  delegate :image_url, to: :sender, prefix: true, allow_nil: true

  # Emails belonging to the mailbox group identified by `path`.
  # Unknown path -> all emails.
  def self.in_group(path)
    path = path || "home"

    group = MailboxConfig.find(path)

    if group.nil?
      group = MailboxConfig.find(MailboxConfig::DEFAULT_GROUP)
    end

    rules = group[:rules]

    scope =
      if rules[:exclude_from]
        # e.g. "home" = everything that doesn't match work/github/pathe
        rules[:exclude_from].reduce(all) do |relation, other_path|
          other = MailboxConfig.find(other_path)
          other ? relation.where.not(id: matching(other[:rules]).select(:id)) : relation
        end
      else
        matching(rules)
      end

    # Filter out ignored subjects, which are usually spam or bounce messages.
    scope.where.not(MailboxConfig::IGNORED_EMAIL_SUBJECTS.map { |s| "subject LIKE ?" }.join(" OR "), *MailboxConfig::IGNORED_EMAIL_SUBJECTS.map { |s| "%#{s}%" })
  end

  # Mailbox group path for each of the given emails, keyed by email id.
  # Specific groups are checked before catch-all groups (those using
  # exclude_from), since the latter match anything the others don't.
  # Emails in no group (e.g. ignored subjects) are left out.
  def self.group_paths(emails)
    ids = emails.map(&:id)
    groups = MailboxConfig::GROUPS.sort_by { |g| g[:rules][:exclude_from] ? 1 : 0 }

    groups.each_with_object({}) do |group, paths|
      remaining = ids - paths.keys
      break paths if remaining.empty?

      in_group(group[:path]).where(id: remaining).pluck(:id).each { |id| paths[id] = group[:path] }
    end
  end

  # Emails matching a rule set. The from/to/sender_name clauses are OR-ed,
  # so an email is included if it matches any of them.
  def self.matching(rules)
    scope = all
    clauses = []
    binds = []

    if rules[:from].present?
      scope = scope.joins("LEFT JOIN senders ON senders.id = emails.sender_id")
      rules[:from].each do |pattern|
        clauses << "senders.email LIKE ?"
        binds << pattern.tr("*", "%")
      end
    end

    Array(rules[:to]).each do |pattern|
      clauses << "emails.`to` LIKE ?"
      binds << "%#{pattern.tr('*', '%')}%"
    end

    if rules[:sender_name].present?
      clauses << "emails.sender_name IN (?)"
      binds << rules[:sender_name]
    end

    return none if clauses.empty?

    scope.where(clauses.join(" OR "), *binds)
  end

  def sender_name
    db_value = read_attribute(:sender_name)

    if db_value.present?
      db_value
    elsif sender.present?
      sender.name
    else
      "must be the wind"
    end
  end

  def internal?
    sender&.email.in?(MailboxConfig::INTERNAL_EMAILS)
  end

  def date
    day = created_at.to_date

    if day == Date.current
      "Today"
    elsif day == Date.current - 1
      "Yesterday"
    else
      day.strftime("%B %-d, %Y")
    end
  end
end
