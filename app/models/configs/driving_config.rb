module DrivingConfig
  # Column in the CBS pump price table (80416ned): "BenzineEuro95_1", "Diesel_2" or "Lpg_3".
  FUEL_TYPE = "BenzineEuro95_1".freeze

  # Straight-line distance between start and end, times this, is roughly the distance by road.
  ROAD_FACTOR = 1.3

  # CarPlay drops for a moment when the phone is unplugged or the car restarts;
  # a reconnect within this window continues the same trip.
  TRIP_MERGE_GAP = 3.minutes
end
