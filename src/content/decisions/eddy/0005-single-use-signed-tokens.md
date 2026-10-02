---
project: eddy
number: 5
title: Single-use signed tokens for notification actions
date: 2026-05-16
summary: Every action button in a notification carries a short-lived signed token that works exactly once, so a second tap, a screenshot or a stolen phone can’t replay it.
---

Every action button in a notification — Approve, Deny, 30 minutes, 1 hour, Ask a grown-up — calls back into Eddy through a URL carrying a token. The token is a short-lived HMAC-SHA256 signature (one-hour lifetime) over the user, the action and the target. On a hit, Eddy checks the signature and expiry, looks the token up in a `used_tokens` table, runs the handler if it's unused, marks it used, and returns a confirmation page or a deep link into the app.

Single-use enforcement — the table, not just the expiry — is the load-bearing part. A standard signed-token-with-expiry pattern protects against tampering but not replay: within the hour, anyone who saw the URL can fire it again. Replay matters here in a way it usually doesn't, because the actions have real-world consequences: approving an escalation, granting a kid an hour of unblocked YouTube, deciding an appeal. A stolen phone, a notification that leaks into a screenshot, a parent who taps twice — all need to resolve the same way: the second hit is rejected.

The second reason for this shape is that it doesn't care about the channel. The action endpoint is the same whatever renders the button; the channel delivers the URL and the endpoint validates the token. That makes a future move to native push ([“One notification channel”](./one-notification-channel)) a channel swap, not an endpoint rewrite.

## Consequences

- Every new action uses the same `/action/{handler}` shape. No bespoke auth, no session check, no per-endpoint signing.
- The used-token table grows forever unless pruned, so rows older than 24 hours are cleared on a schedule — the margin covers clock skew and late taps.
- A parent who genuinely needs to approve the same item twice (rare) gets a fresh notification, not a reusable link.
