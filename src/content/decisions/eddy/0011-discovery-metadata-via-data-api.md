---
project: eddy
number: 11
title: Discovery metadata moves to the YouTube Data API
date: 2026-06-04
summary: Searches and channel lookups go through the official API so scraping traffic stops triggering YouTube’s bot detection, which was also blocking downloads.
---

Eddy reads two kinds of thing from YouTube: **metadata** (search results, a channel's uploads, a video's duration, a channel's bio and avatar) and **bytes** (the video file). Until now both went through yt-dlp — every discovery run scraped search pages, walked playlists and probed durations, on top of the downloads. That metadata fan-out was most of the household's roughly 450 YouTube requests a day, and volume from one home IP is what trips YouTube's IP-wide bot detection ("Sign in to confirm you're not a bot"), which then blocks downloads too.

The YouTube Data API returns exactly the metadata discovery needs, over an authenticated, rate-budgeted channel that doesn't count against the scraping footprint. It reads public data only, with a plain API key, and the free tier is 10,000 units a day.

The decision: **discovery metadata moves to the Data API; yt-dlp is kept for downloads only.** The switch sits behind a single flag so it's reversible per deploy, and behind one seam that every discovery call goes through. The API adapter returns the same shapes as the yt-dlp one, so nothing downstream changes.

## The quota envelope

Costs are lopsided: a search costs 100 units, everything else costs 1.

- Topic search: about 3 users × 10 terms × 101 units ≈ **3,030 units**
- Back-catalogue: a few hundred units
- Duration probes and channel refreshes: low hundreds

That comes to about **3,900 of the 10,000** free units — comfortable headroom. A running local tally logs once when the day passes 80%.

## Consequences

- **When the quota runs out, discovery skips and warns. It does not fall back to scraping.** Falling back would defeat the point, which is to keep requests off the home IP.
- **Downloads stay on yt-dlp, unconditionally.** Eddy still owns its files ([decision 2](./0002-eddy-owns-video-lifecycle)).
- **The privacy boundary doesn't move.** Search terms already left the house under yt-dlp; this changes the transport, not what leaves. API calls carry a search string or an id, nothing about who's asking ([decision 4](./0004-kids-consumption-never-leaves-m4)).
- **A new secret,** required only when the flag is on: a read-only key for public data.
- **Reversible** with no code change; the yt-dlp adapter is kept, not deleted.

## Considered and rejected

- **Throttle harder and stay on yt-dlp.** Already done — it reduced the footprint but didn't fix the structural problem: metadata and downloads share one IP, so a metadata-triggered block still kills downloads.
- **Use the Data API for downloads too.** Not possible; it serves metadata, not video.
- **Fall back to scraping when the quota runs out.** Rejected: it reintroduces exactly the load this removes. With about 2.5× headroom, running out is a misconfiguration worth flagging, not a routine case to paper over.
