module MoneyConfig
  GROUPS = [
    {
      path: "overview",
      name: "Overview"
    }
  ].freeze

  ALLOWED_PLATFORMS = ["web", "macOS", "iOS"].freeze

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
end
