module MoneyConfig
  GROUPS = [
    {
      path: "accounts",
      name: "Accounts"
    },
    {
      path: "transactions",
      name: "Transactions"
    }
  ].freeze

  # Bank to connect to from the app: Enable Banking name and ISO country.
  ASPSP = { name: "ING", country: "NL" }.freeze
end
