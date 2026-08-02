class Email < ApplicationRecord
  belongs_to :sender, optional: true

  INTERNAL_EMAILS = [
    "ntfy@ltvb.nl"
  ].freeze

  # Emails belonging to the mailbox group identified by `path`.
  # Unknown path -> all emails.
  def self.in_group(path)
    path = path || "home"

    group = MailboxConfig.find(path)
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

  def internal?
    sender&.email.in?(INTERNAL_EMAILS)
  end
end
