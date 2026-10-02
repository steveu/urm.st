---
project: eddy
number: 1
title: Ubuntu moves bytes, M4 thinks
date: 2026-05-16
summary: One codebase split across two machines by what the hardware is good at, not by service boundaries.
---

Two physical machines were available — an M4 Mac mini on WiFi and a 2012 Mac mini on Ethernet next to the router — and the obvious shape was two HTTP services with a contract between them. Instead, Eddy is one codebase with two Node entry points sharing TypeScript modules, one SQLite file owned by the M4, and a single cross-process boundary: a BullMQ queue (Redis on the Ubuntu box) plus one HMAC-authenticated callback when a download finishes. Ubuntu never writes to SQLite directly.

The split is dictated by the hardware, not by service boundaries. Anything shifting large payloads runs on Ubuntu (Ethernet, SSD, ffmpeg). Anything reasoning or serving small responses runs on the M4 (the GPU for Gemma, the database, the web app). Video doesn't cross WiFi twice; Gemma doesn't compete with ffmpeg for memory. A two-service shape would have added contract versioning, separate deploys, and either duplicated modules or a third shared-library package — costs that don't earn their place at household scale on two boxes I own.

## Consequences

- New cross-process behaviour means a new queue job or (rarely) a new signed callback, not a new HTTP endpoint.
- The rule that modules import from each other only through their public `index.ts` is what keeps the monolith from rotting into a tangle. If module boundaries quietly dissolve, this decision's cost/benefit flips.
