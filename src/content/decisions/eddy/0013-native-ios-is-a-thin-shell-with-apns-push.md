---
project: eddy
number: 13
title: Native iOS is a thin shell; push is APNs
date: 2026-09-19
summary: The iOS app wraps the existing web app and adds only what a web page can’t do, and push notifications carry an opaque id so nothing about the kids passes through Apple.
---

The native iOS app is a shell, not a second client. A web view loads the existing web app and renders every screen — feed, player, request page, profile, search. Swift owns only what a web page can't do on iOS: a share extension, an App Intent so Shortcuts and Siri can still reach Eddy, push notifications with lock-screen action buttons, deep links, a "can't reach Eddy" fallback screen, and the user's identity held in the Keychain. There's no native feed, no native player and no second design system.

The shape is the decision. A fully native interface would double every later piece of UI work, and the web app would still exist because the iPads and the Mac use it. The shell buys the four things that were genuinely missing — a real share target, real push, a real app icon, an identity that survives — and nothing else. When the feed changes, the shell doesn't.

**APNs is the first real transport behind `notify()`.** With the old channel already removed ([decision 3](./0003-one-notification-channel)), there's nothing to migrate from and no risk of double delivery. Call sites don't change, and action buttons hit the same signed links ([decision 5](./0005-single-use-signed-tokens)).

**Push no longer waits for the guard; the guard waits for push.** With the transport log-only, ops alerts about a dark pipeline were reaching nobody. That's a live gap, so push comes next — and the guard can't go live without it, because an uncertain verdict has to reach a parent.

**Notifications that pass through Apple carry an opaque id and generic copy, and nothing else** — no title, no channel, no name, no request detail. A Notification Service Extension wakes on delivery, fetches the real content from the home server over the private network, authenticated as that device's own user, and rewrites the notification in place. If the fetch fails it shows "Something new in Eddy", and the content is only ever seen once the app is opened. This is [decision 4](./0004-kids-consumption-never-leaves-m4) applied to push: an opaque id goes out and the content is fetched back. Whether the extension can reliably reach a private-network host while the VPN is in the background was the one unproven assumption, so it was tested on a real phone before the household relied on it. It held after sixteen minutes locked on mobile data.

**Distribution is ad hoc, not TestFlight.** TestFlight requires testers to be 13 or over, which rules out one of the kids. So the app is signed for registered devices and installed over the air from the home server. The cost is a yearly cliff: the profile expires and every device has to be re-signed. A watchdog warns a month ahead.

**Links use a custom scheme only.** Universal links need Apple to fetch a file from the public internet, and Eddy's server is deliberately reachable only on the private network.

## Consequences

- The real `notify()` signature had drifted from the one in the product brief. The brief was corrected and the code marked as canonical.
- A long-unused devices table finally gets its first use, as the home for push tokens.
- The signed token needed a target id before a lock-screen action button could work — a gap that had to close before the guard went live anyway, made visible sooner.
- The shell always loads the web app from the server and never bundles it, so every request stays same-origin.
- The web share API disappears inside a web view unless the shell bridges it. The share tile already hides itself when it can't share, so the degradation is graceful.
- A yearly chore: re-signing, registering any new device, and an Apple Developer account per household.

## Considered and rejected

- **A fully native SwiftUI interface.** Doubles every later UI phase and creates a second design system to keep in sync, for screens that already work.
- **React Native, Capacitor or another cross-platform wrapper.** The household is iOS-only, so portability is worth nothing here, and each adds a toolchain to keep alive.
- **TestFlight.** Cleaner, but its age limit excludes a user. A non-starter.
- **Notifications and share extension only, with everything else in Safari.** Loses the app icon, the Keychain identity and the deep-link target.
- **Plain push payloads with real titles.** Simpler and more reliable — and it would send kids' request titles and creator names through Apple's servers. Rejected on [decision 4](./0004-kids-consumption-never-leaves-m4).
- **Universal links.** They need a publicly reachable server, and Eddy's stays private.
