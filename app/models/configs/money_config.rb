module MoneyConfig
  GROUPS = [
    {
      path: "overview",
      name: "Overview"
    }
  ].freeze

  # Bank to connect to from the app: Enable Banking name and ISO country.
  ASPSP = { name: "ING", country: "NL" }.freeze

  SAVING_ACCOUNT_NAME = "Oranje spaarrekening".freeze
end
