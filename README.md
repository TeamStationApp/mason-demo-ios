# Mason demo iOS app

A one-screen SwiftUI app that exists to prove a Mason cluster end to end: a
Mason master reads this repository's `Masonfile.ts`, a `mac-xcode` worker
archives the app and signs it ad hoc with the certificates and profile the
master made, and the Mason host serves the IPA to testers.

The screen shows "Built by Mason" and the build number Mason assigned
(`CFBundleVersion`).

## Workflows

- `build` (the default; on push and on request): the `ios` stage archives
  `MasonDemo.xcodeproj` (scheme `MasonDemo`, Release), exports an ad hoc IPA
  and publishes it as `app.teamstation.masondemo`.
- `ping` (on request): one Linux stage that prints `uname -a`, for checking a
  cluster's workers when it has no host yet.
- `smoke` (on request): one Linux stage that saves a small `hello` artifact,
  for checking a cluster's storage without a Mac.
- `mac` (on request): one `mac-xcode` stage that builds the app for the
  simulator without signing and saves the `.app`, for checking a Mac worker
  before Apple is set up.

## Layout

- `MasonDemo/` — the app's Swift sources (iOS 17 and later, iPhone).
- `MasonDemo.xcodeproj` — the committed Xcode project. There are no
  CocoaPods, packages or project generators.
- `Masonfile.ts` — the Mason pipeline.
