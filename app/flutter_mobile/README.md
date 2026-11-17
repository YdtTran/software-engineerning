# Smart E-Mobility Hub — Flutter mobile app

The Android user interface follows the approved mobile references. Sign-in, sign-out, Hub discovery, available vehicles, vehicle reservations, pickup, cancellation, return and rental/trip history connect to the existing demo API. Reservations retain an unfinished request and its idempotency key on the device for safe retry after interruption. Parking and charging screens also call the demo API for availability, reservations, check-in, check-out, requests and session actions. Notifications remain a preview. The map uses OpenStreetMap tiles and the four approximate demo landmarks from the local ux/ui-development branch; these coordinates are illustrative and must not be used for navigation. Hubs without known demo coordinates remain visible in the list only.

For a USB-connected Android device, start the demo server as described in `../README.md` and forward its port. The default debug endpoint is localhost port 3187:

```sh
adb reverse tcp:3187 tcp:3187
flutter run --dart-define=MOBILITY_API_ORIGIN=http://127.0.0.1:3187
```

Set `MOBILITY_API_ORIGIN` to the actual server origin; debug HTTP is limited to localhost. Release builds require an explicitly configured HTTPS origin. The demo server requires provisioned accounts and an initialized database, as documented in `../README.md`.

Run `flutter test` and `flutter analyze`. The Android package is `vn.edu.vnuhcm.smart_mobility_design`, so it installs alongside the older app instead of replacing its data. Sessions are kept only in memory and require signing in again after restart.

The device integration test creates and completes a real simulated trip; run it only against an isolated demo database. Set `DEMO_TEST_USER` and `DEMO_TEST_PASSWORD` using `--dart-define`, then run `flutter test integration_test/reservation_test.dart -d <device>`.
