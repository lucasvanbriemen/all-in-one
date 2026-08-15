class Email < ApplicationRecord
  belongs_to :sender, optional: true

  delegate :image_url, to: :sender, prefix: true, allow_nil: true

  INTERNAL_EMAILS = [
    "ntfy@ltvb.nl"
  ].freeze

  IGNORED_EMAIL_SUBJECTS = [
    "***SPAM***",
    "Failure Notice",
    "Returned to Sender",
    "Undeliverable:"
  ].freeze

  # Emails belonging to the mailbox group identified by `path`.
  # Unknown path -> all emails.
  def self.in_group(path)
    path = path || "home"

    group = MailboxConfig.find(path)

    if group.nil?
      group = MailboxConfig.find(MailboxConfig::DEFAULT_GROUP)
    end

    rules = group[:rules]

    if rules[:exclude_from]
      # e.g. "home" = everything that doesn't match work/github/pathe
      rules[:exclude_from].reduce(all) do |scope, other_path|
        other = MailboxConfig.find(other_path)
        other ? scope.where.not(id: matching(other[:rules]).select(:id)) : scope
      end
    else
      matching(rules)
    end

    # Filter out ignored subjects, which are usually spam or bounce messages.
    .where.not(IGNORED_EMAIL_SUBJECTS.map { |s| "subject LIKE ?" }.join(" OR "), *IGNORED_EMAIL_SUBJECTS.map { |s| "%#{s}%" })
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
    sender&.email.in?(INTERNAL_EMAILS)
  end
end
