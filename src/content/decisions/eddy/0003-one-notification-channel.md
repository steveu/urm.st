---
project: eddy
number: 3
title: One notification channel
date: 2026-05-16
summary: Every notification goes through one channel and one function, and a new technology replaces the old one rather than joining it.
amended: [2026-09-19]
---

Eddy has one channel for every notification — guard escalations, override requests, "video ready", the weekly Drift summary, pipeline alerts to me. No email, no SMS, no Web Push, no per-event routing. When this was written the implementation was a self-hosted ntfy server; the principle is one channel, regardless of which technology delivers it.

The single-channel discipline is the load-bearing decision. The obvious failure mode is *"this escalation is urgent, let's also send email"* six months in — at which point notifications fragment, the signed action links have to handle several delivery shapes, kids learn that some channels can be ignored and others can't, and the household has three places to check. Forcing every event through one channel keeps the priority signal honest: the highest priority means something because nothing else competes for it.

Everything in the codebase calls a single `notify()` function, and that's the only contract. A native iOS app with direct push was always the likely successor — and when it lands, it **replaces** the current channel; it doesn't sit alongside it.

## Consequences

- If the channel has an outage, urgent notifications wait. That's the price of the principle; a fallback channel is not the answer.
- Every action button depends on the signed-link pattern surviving a channel swap. See [“Single-use signed tokens for notification actions”](./single-use-signed-tokens).
- Moving to native push means re-pointing `notify()`. The user-visible surface — events, priorities, actions — doesn't change.

## Amendment — 19 September 2026: ntfy removed, log-only until push lands

The principle is unchanged: one channel, everything calls `notify()`, replace never augment. What changed is the implementation. **ntfy came out of the codebase, and it did not wait for a successor.**

The evidence is the whole argument. Nothing in the household used ntfy after the first week, and its TLS certificate had expired ten weeks earlier — so every send had been failing for ten weeks and nobody noticed. A channel whose total outage goes unremarked for ten weeks is not delivering notifications; it is costing a container, a certificate, per-user credentials and a block of config to deliver nothing. Keeping it until push shipped would have preserved the appearance of a channel, not a channel.

**The interim transport is log-only.** `notify()` remains the single contract and every event is written to the structured log. Nothing is added to cover the gap — a stopgap second channel is precisely the fragmentation this decision exists to prevent.

Native push becomes simply the first real transport behind `notify()` ([“Native iOS is a thin shell; push is APNs”](./native-ios-is-a-thin-shell-with-apns-push)). The sequencing follows: the guard can't go live without push, because an uncertain verdict has to reach a parent.
