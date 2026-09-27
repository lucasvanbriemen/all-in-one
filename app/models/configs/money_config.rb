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

  # Counterparty patterns to categories, first match wins. Matched case
  # insensitively against the counterparty name and the transaction
  # description, so both merchant names and transfer descriptions work.
  CATEGORIES = [
    { name: "savings", patterns: [ /oranje spaarrekening/i ] },
    { name: "salary", patterns: [ /webinargeek/i ] },
    { name: "tax", patterns: [ /belastingdienst/i ] },
    { name: "insurance", patterns: [ /fbto/i, /monuta/i, /verzekering/i ] },
    { name: "car", patterns: [ /tinq/i, /esso/i, /total /i, /shell/i, /wegen ?belasting/i, /parking/i, /parkbee/i ] },
    { name: "family", patterns: [ /\bouders\b/i ] },
    { name: "hosting", patterns: [ /strato/i, /transip/i ] },
    { name: "bank_fees", patterns: [ /kosten ing/i ] },
    { name: "groceries", patterns: [ /albert heijn/i, /dirk vdbroek/i, /jumbo/i, /keurslagerij/i, /lidl/i, /aldi/i ] },
    { name: "cinema", patterns: [ /pathe/i ] },
    { name: "eating_out", patterns: [ /mcdonald/i, /mcd /i, /kfc/i, /foodticket/i, /thuisbezorgd/i ] },
    { name: "shopping", patterns: [ /coolblue/i, /bol\.com/i, /karwei/i ] },
    { name: "leisure", patterns: [ /snowworld/i, /skydive/i, /boulderhal/i, /ticketmaster/i, /ticketcounter/i ] }
  ].freeze

  def self.category_for(*texts)
    haystack = texts.compact.join(" ")
    CATEGORIES.find { |category| category[:patterns].any? { |pattern| haystack.match?(pattern) } }&.dig(:name)
  end
end
