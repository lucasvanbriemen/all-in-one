module MoneyConfig
  GROUPS = [
    {
      path: "overview",
      name: "Overview"
    }
  ].freeze

  ALLOWED_PLATFORMS = [ "web", "macOS", "iOS" ].freeze

  # Bank to connect to from the app: Enable Banking name and ISO country.
  ASPSP = { name: "ING", country: "NL" }.freeze

  SAVING_ACCOUNT_NAME = "Oranje spaarrekening".freeze
  SALARY_COMES_FROM = "WebinarGeek B.V.".freeze
  PAYDAY = 24 # The friday before that date if its on a weekend

  MERCHANT_GROUPS = {
    "Fuel" => %w[shell bp esso tango tinq totalenergies total texaco q8 gulf avia firezone],
    "Groceries" => %w[albert\ heijn jumbo lidl aldi plus dirk],
    "Cinema" => %w[pathe]
  }.freeze

  BUDGETS = {
    "Fuel" => 250,
    "Groceries and food" => 100,
    "Cinema" => 50,
    "Entertainment" => 75
  }.freeze

  # Categories you can assign to a transaction by hand.
  CATEGORIES = [
    "Groceries", "Eating out", "Fuel", "Cinema", "Leisure", "Shopping", "Tolls & parking",
    "Parents", "Insurance & health", "Hosting & domains", "Bank fees", "Tax",
    "Transfers", "Salary", "Savings"
  ].freeze

  # Which categories count towards a budget; a budget not listed uses the category of the same name.
  BUDGET_CATEGORIES = {
    "Groceries and food" => [ "Groceries", "Eating out" ],
    "Entertainment" => [ "Leisure" ]
  }.freeze

  SAVINGS_GOALS_IN_PERCENT = {
    "Emergency buffer" => 15,
    "House" => 25,
    "Car" => 7,
    "Holidays" => 5,
    "Yearly costs" => 3
  }.freeze
end
