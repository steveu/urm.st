---
project: eddy
number: 1
title: 'One codebase, two boxes: one moves bytes, one thinks'
date: 2026-04-13
written: 2026-05-16
summary: One codebase split across two machines by what each is good at, not by service boundaries.
amended: [2026-10-09]
---

Two machines were available — a newer one with a capable GPU, and an older wired one with fast disk — and the obvious shape was two HTTP services with a contract between them. Instead, Eddy is one codebase with two Node entry points sharing TypeScript modules, one SQLite file owned by the inference box, and a single kind of boundary between the boxes: a job queue plus a signed internal channel. The fetch box never touches the database.

The split is dictated by workload, not by service boundaries. Anything shifting large payloads runs on the **fetch box** (wired, fast disk, ffmpeg); it owns the file bytes and reports back over signed internal calls. Anything reasoning or serving small responses runs on the **inference box** (the GPU for the local model, the database, the web app and the queue). Large files move once, on the box built for it, and inference never competes with transcoding for memory. A two-service shape would have added contract versioning, separate deploys, and either duplicated modules or a third shared-library package — costs that don't earn their place at household scale on two boxes I own.

## Consequences

- New behaviour between the boxes is a queue job or a signed internal call, never a shared database or a public endpoint.
- The rule that modules import from each other only through their public `index.ts` is what keeps the monolith from rotting into a tangle. If module boundaries quietly dissolve, this decision's cost/benefit flips.

## Amendment — 9 October 2026: the boundary has grown

Two facts in the original had aged. The queue runs on the inference box, not the fetch box; it had moved there before this record was written. And the boundary is no longer one callback: the internal channel now carries more than a dozen signed routes — download outcomes, channel checks, guard scoring, thumbnail checks, the notification relay and others. Neither changes the decision. Every call the fetch box makes is signed, so the rule holds as stated.
