---
project: one-thought
number: 3
title: "Course coverage: any course, after the fact, degrading gracefully"
date: 2026-06-27
summary: The app works on any golf course by recording a location with each tap and working out the holes later from OpenStreetMap, and a course with thin map data still gets a read rather than losing the round.
---

With map Moments in the first version ([“The round-end Record: the full three-page read, map Moments included”](./record-full-three-page)), every round needs hole geometry for the course played. At the time only two courses had prepared geometry — my home course and one other — and OpenStreetMap's golf coverage and quality vary widely from course to course. The prototype framed history as "home course plus a few others", which suggests a bundled set. But the product is meant to ship broadly.

The decision: **support any course, after the fact.** During the round, each tap gets a GPS **fix** attached — the phone never needs OpenStreetMap on the course. Then, when the read is opened back on signal, the app identifies the course, fetches its geometry and matches taps to holes. The hole drawings **degrade by coverage tier** — full feature polygons, then just centrelines and greens, then a bare field — so **no round is ever lost to thin geometry**.

## Consequences

- No offline map tiles and no mid-round network are needed in the first version: the taps' fixes are recorded locally and matched later.
- The residual risks are bounded and named: identifying the course from the fixes, OpenStreetMap geometry quality, and par reliability. When a course can't be mapped, that round falls back to the maps-free read (Cover and Sealed) and offers to help map it later.
- Missing pars are inferred by default from the length of each hole's centreline, ranking lengths within the course.

## Considered and rejected

- **Home course first, with a small bundled set.** Ships against known-good geometry with the smallest reliability surface, but limits the product to prepared courses. Rejected; revisit only if any-course proves a sink.
- **Bundled now, plus an add-a-course path.** A growth path without full automation. Folded into the fallback ("offer to help map it") rather than chosen as the main model.
