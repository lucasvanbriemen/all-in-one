# A result opened from search, remembered so the same query finds it first next time.
class SearchPick < ApplicationRecord
  attribute :result, :json # MariaDB reports a json column as text
  # Older picks count for less: a pick loses half its weight every HALF_LIFE.
  HALF_LIFE = 30.days
  LOOKBACK = 180.days

  # A pick made under the same query counts fully. One made under a query that
  # extends or shortens this one ("an" vs "anouk") counts for half, so a few
  # letters are enough once you've picked something before.
  PREFIX_WEIGHT = 0.5

  # { source => score } for the picks that relate to `query`.
  def self.scores_for(query)
    needle = query.downcase
    now = Time.current

    where(created_at: LOOKBACK.ago..)
      .where("LOWER(query) = :q OR LOWER(query) LIKE :starts OR :q LIKE CONCAT(LOWER(query), '%')",
        q: needle, starts: "#{sanitize_sql_like(needle)}%")
      .pluck(:query, :source, :created_at)
      .each_with_object(Hash.new(0.0)) { |(picked_query, source, picked_at), scores|
        decay = 0.5**((now - picked_at) / HALF_LIFE)
        match = picked_query.downcase == needle ? 1.0 : PREFIX_WEIGHT
        scores[source] += decay * match
      }
  end

  # The last `limit` distinct things opened, newest first, as search results.
  def self.recent_results(limit = 8)
    order(created_at: :desc).limit(100).pluck(:source, :result)
      .uniq(&:first).first(limit).map(&:last)
  end
end
