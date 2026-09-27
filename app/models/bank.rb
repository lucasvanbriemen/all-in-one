# Namespace for the open banking records. The tables are prefixed so they
# read as one group next to the email and music tables in the shared
# database, while the classes stay short (Bank::Account, Bank::Transaction).
module Bank
  def self.table_name_prefix
    "bank_"
  end
end
