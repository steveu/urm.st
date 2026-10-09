---
project: eddy
number: 16
title: The acting user comes from a device credential; a parent vouches for each device
date: 2026-10-09
summary: The server works out who is acting from a credential held by each device, never from the request, and a device only gets one from an invite made at home.
---

Until now every request told the server who was acting, by passing a user id in the query string or the body. The web app carried it in the URL; the iOS shell kept it in the Keychain and appended it. Reaching the private network was the only access control, so anyone on it could act as anyone, and a kid's own device could become a parent's by editing one parameter: approve their own escalations, send themselves videos, read a parent's notifications. The guard's escalations are the kid-safety boundary ([“Kid follows are ungated; the guard at surfacing is the boundary”](./kid-follows-are-ungated-the-surfacing-guard-is-the-boundary)), and a boundary a kid can step over by editing a URL isn't one.

The rule: **the server decides who is acting from a per-device credential, never from the request. A device gets its credential only by redeeming an invite that a parent made.**

**The credential.** A long random secret, minted by the server when a device is set up and stored only as a hash. The browser holds it as an HttpOnly cookie that the web app's script never sees. The iOS shell keeps it in the Keychain, sends it from the share extension, the App Intent and the notification extension, and sets the same cookie on its web view, so the web app inside it behaves exactly as it does in Safari. One gate in front of every household route resolves the credential to its device and owner. No credential is refused. A request that still names a user must name the credential's owner, or it's refused too: a claim is checked, never trusted. Parent-only routes check the owner's role. The fetch box's internal calls keep their own signing, and the setup route is the one open door, because it's how a device gets a credential in the first place.

**Setup: the home server vouches for a device.** A command on the home server prints a setup link carrying a single-use signed token, valid for an hour. Opening the link in a browser, or pasting it into the shell's setup screen, redeems it, which creates the device and hands back the credential. Whoever can run a command on the home server is already the household's root of trust: they hold the database, the signing secret and the deploy. Making that the only place invites come from adds no new authority, and a kid holding a device has no way to mint one.

**Revocation is deleting the device.** The shell's Disconnect deletes its own, and a command on the home server does the same for any device. A dead push token now clears only the push details: the device stays signed in.

## Consequences

- **Every existing device has to be set up once.** Browsers and app builds from before this change have no credential and get the setup screen, and each needs an invite.
- **The old setup link stops working.** A link with a user id in it sets nothing up, and a Shortcut that posted requests with a name has no credential either, so it's refused. The share extension and App Intent replaced that path ([“Native iOS is a thin shell; push is APNs”](./native-ios-is-a-thin-shell-with-apns-push)).
- **The URL still carries a user id.** Every page reads it, and rewriting the web app's routing is out of proportion to the change. Instead the web app asks the server who the device belongs to on load and corrects the URL before anything renders. The parameter is display state, not identity.
- **One device is one person.** A shared browser can't switch household members by editing the URL any more; it needs a new invite. That's the point.
- **The single-use check had a replay hole, now fixed.** It compared the redemption time with the issue time plus one second, so a token first used more than a second after issue could be replayed for the rest of its hour. Redemption is now one conditional update that only an unredeemed token satisfies. Invites rely on it, and so will notification action buttons.
- **Media files aren't covered.** Videos and thumbnails are served by the web server directly, stay reachable by URL on the private network, and carry no identity to spoof. That's a separate decision.

## Considered and rejected

- **A parent approves from the app.** The new device shows a code and a parent taps Approve on their own phone. Friendlier, but it needs a pending state, polling, a new parent screen, and a way to set up the first parent device anyway — which would be the server command. For a household that adds a device a few times a year, the command alone is enough. An approval screen can come later, on top of the same invite.
- **Trust the network: map a VPN node to a user.** No second credential, but it ties a household member to a network login, which is a network decision rather than a family one, and it stops a self-hosting household from running Eddy behind any other network.
- **A PIN for parent routes.** It guards only the parent surface, and a PIN typed on a shared tablet is a PIN the kids know. Every other route stays impersonable.
- **Signed, expiring session tokens instead of a stored credential.** They need a refresh flow and don't make revocation easier. A random secret with a hashed row is simpler, and deleting the row revokes it at once.

## Deferred

- **Invites from the app.** A parent-only "Add a device" button would call the same invite code. Build it when running a command on the server becomes the friction.
- **Ownership checks on routes that take only a request id.** They now need a credential, but any enrolled device in the household can still act on any request. That's a smaller hole than before, with no impersonation, but it isn't closed.
