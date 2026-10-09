---
project: one-thought
number: 4
title: "OpenStreetMap architecture: hosted course catalogue, matching on the phone"
date: 2026-06-27
summary: A small hosted service supplies public course maps and pars, but where you tapped never leaves your phone — the matching of taps to holes happens on the device.
---

Supporting any course ([“Course coverage: any course, after the fact, degrading gracefully”](./course-coverage-any-course)) means OpenStreetMap ingest, geometry caching, par backfill, course identification and tap-to-hole matching all have to run *somewhere*. Geometry and par are public OpenStreetMap data. The player's per-tap location fixes are the only privacy-sensitive part. And because the product is meant to ship to other people, a self-hosted machine at home isn't viable production infrastructure for the catalogue.

The decision: a small, **stateless hosted course catalogue** — a Cloudflare Worker beside the existing site — serves cached OpenStreetMap hole geometry and pars, reusing the project's existing Overpass pipeline, server-side. **The per-tap fixes never leave the device**: course identification and tap-to-hole matching run on the phone, against the geometry it fetches.

## Consequences

- OpenStreetMap quality and par problems are solved once, centrally. Clients never hit Overpass directly, so there's no per-device rate-limit or terms-of-service exposure.
- The sensitive movement data stays on the phone. The catalogue only ever answers "what does course X look like?"
- Two pieces to build: the catalogue service and the on-device matcher.
- Course identification has to work from the on-device fixes plus a coarse lookup — and that lookup may use a single rough fix, not the whole set.

## Considered and rejected

- **A full hosted service that receives the fixes.** The thinnest client, and it reuses the Python pipeline almost as-is, but the player's location data leaves the device and the service then holds it. Rejected on privacy.
- **Everything on the device, with the app calling Overpass itself.** Nothing leaves the phone and there's a clean path to fully offline, but it means reimplementing the pipeline in Swift, hammering Overpass from every client, and losing central control of par quality. Rejected.
