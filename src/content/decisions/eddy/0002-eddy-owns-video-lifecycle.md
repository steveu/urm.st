---
project: eddy
number: 2
title: Eddy owns the video lifecycle; Plex and nginx only read
date: 2026-05-16
summary: Eddy downloads, names and deletes its own files, so its own rules (like saved videos never being recycled) can’t be overridden by another tool.
---

The obvious shape for "self-host YouTube into a Plex library" is Tube Archivist — it owns the queue, the storage layout, the retry behaviour and the metadata. Eddy instead calls yt-dlp directly from the Ubuntu worker, writes files under its own naming scheme, and treats Plex and nginx as read-only consumers of that directory. The database row is the source of truth for whether a video is **Live**, **Recycled** or **Gone**; the filesystem follows.

Owning the lifecycle is the load-bearing part. The **Recycler** needs to delete files on its own schedule, immune to anything Plex or a download tool thinks. **Saved** videos being immune to recycling is enforced at the storage layer because Eddy controls deletion — a third-party tool would either fight that or need working around. Adding a new consumer later (a native iOS app, a TV interface) is a read-only directory mount; nothing in the lifecycle changes.

## Consequences

- Eddy reimplements queueing, retries and channel-watching that Tube Archivist would have provided. That's real cost, paid at build time.
- Plex must never be the surface that triggers re-downloads or deletes. If it ever needs to, this decision has been violated.
- Changes in yt-dlp behaviour (extractor breakage, format flags) land in Eddy directly, so the invocation stays thin and pinned, and Eddy owns the upgrade path.
