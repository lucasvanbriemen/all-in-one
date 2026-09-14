# README

This README would normally document whatever steps are necessary to get the
application up and running.

Things you may want to cover:

* Ruby version

* System dependencies

* Configuration

* Database creation

* Database initialization

* How to run the test suite

* Services (job queues, cache servers, search engines, etc.)

* Deployment instructions

## Push notifications (APNs)

Every `Notification` row is pushed to all registered iOS and macOS devices by
`PushNotificationJob` through `Push::Apns`. Devices register on launch via
`POST /device_tokens`; tokens APNs reports as dead are deleted automatically.

Required in `.env` (the job is a logged no-op when these are missing):

```
APNS_KEY_PATH=/path/to/AuthKey_XXXXXXXXXX.p8   # token auth key from developer.apple.com
APNS_KEY_ID=XXXXXXXXXX
APNS_TEAM_ID=DGTBJZL464
APNS_ENV=development   # or production; must match the app's aps-environment entitlement
APNS_TOPIC=nl.ltvb.aio # optional, defaults to the bundle id
```

Xcode debug builds register with the development APNs environment; TestFlight,
App Store and Developer ID builds use production. A token from one environment
is rejected by the other, so run the server with the matching `APNS_ENV`.
