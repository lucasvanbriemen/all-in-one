module Music
  # Every model of the music project's database hangs off this class, and the
  # connection is the only thing it adds: the tables live in another database
  # (config/database.yml's `music` entry) than everything under
  # ApplicationRecord, so they need a connection of their own.
  #
  # Two consequences worth knowing before writing a query against these:
  #
  #   * No joins across the seam. `Email.joins(:song)` cannot work — the two
  #     halves are separate connections, even though MySQL happens to serve
  #     both from the same instance. Cross-app queries have to be two queries
  #     with the ids passed between them.
  #   * No transaction across the seam either. `transaction` on one side does
  #     not cover writes on the other; wrap each side separately and expect
  #     that one can commit while the other rolls back.
  #
  # Table names stay unprefixed (Music::Song -> `songs`) because the database
  # is separate: nothing in it can collide with the email tables. If the two
  # databases are ever merged into one, this is where a `music_` prefix goes.
  class ApplicationRecord < ActiveRecord::Base
    self.abstract_class = true

    connects_to database: { writing: :music, reading: :music }
  end
end
