---
project: eddy
number: 12
title: Downloads are budgeted, demand-driven and residential
date: 2026-07-20
summary: After a multi-day block, downloads only happen when a video is actually chosen, within a daily budget, and the pipeline stops rather than keeps probing when blocked.
amended: [2026-07-20, 2026-07-23]
---

After [“Discovery metadata moves to the YouTube Data API”](./discovery-metadata-via-data-api) moved metadata to the Data API, downloads were the only meaningful yt-dlp traffic leaving the house. A July incident showed the remaining machinery still lost to a determined block. The flag survived three days, a yt-dlp update, the latest anti-bot token stack and a change of home IP — while the escalating cooldown's probe loop, one probe every twelve hours, each re-tripping the block, at best delayed recovery and at worst kept the flag warm.

The database showed the real demand. About 25 downloads a day were going into a pool of around 1,000 ready videos — far more than the household could ever watch — and 65 of the 78 downloads stuck behind the block were eager fetches of uploads from followed channels that nobody had asked for.

The decision is a cluster that only makes sense together: **downloads are demand-driven and budgeted, the pipeline gives up early when blocked, and the traffic stays on the home connection.**

1. **Downloads are bound to the slate, follows included.** A followed creator's upload enters the candidate pool when it's spotted, but nothing downloads until the daily slate picks it or a kid asks for it. Eagerly fetching every upload from every followed channel was the main source of volume.
2. **A daily download budget,** in priority order: slate picks first, then follow-sourced picks. Back-catalogue seeding stops entirely — the pool was already ten times bigger than what gets watched.
3. **A circuit breaker instead of endless cooldowns.** After three blocks in a row, both download queues pause and I get one alert. Resuming is always manual and checks both download paths. Staying dark until a human looks was chosen over automatic backoff because, after a day of blocks, every automatic probe can only refresh the flag.
4. **Traffic stays on the home connection.** No VPN, no proxy, no rented server. Datacentre and VPN ranges are flagged more aggressively than home IPs, residential proxy services are ethically murky and cost money, and a block only affects Eddy — the family's own YouTube use is untouched. Revisit only if outages become weekly rather than quarterly.
5. **No account cookies, ever.** A throwaway account under bot suspicion gets banned rather than slowed down, turning a self-healing outage into a dead credential — and account cookies on the kids' download path cross the anonymity line the product draws.

## Consequences

- A kid opening a followed creator's brand-new upload before the slate picks it waits a few minutes for an on-demand fetch, instead of instant play. That's the accepted cost of an honest budget.
- The pool grows more slowly, so a new interest takes a day or two longer to fill out.
- Recovering from a block needs me. If I'm away for a week, the pipeline stays dark even if the block cleared on day two — chosen deliberately over automatic probing.
- On resume, the jobs that were parked are cleared rather than drained, so there's no backlog burst into a freshly cleared IP.

## Considered and rejected

- **VPN, proxy or rented-server egress.** It trades occasional home blocks for constant datacentre flagging, adds cost and a dependency, and protects nothing the block actually threatens.
- **Automatic exponential backoff.** Hands-off, but it keeps spending probes against a flag of unknown lifetime — and the probes are the suspected cause of it lasting.
- **Keep eager follow downloads and only budget discovery.** The autopsy showed follows *were* the volume. Budgeting around them would be fiction.

## Amendment — 20 July: anonymous visitor cookies narrow rule 5

Rule 5 was written about **account** cookies, and that reasoning stands: logged-in cookies stay forbidden on every download path.

It doesn't cover an **anonymous visitor cookie jar** — an aged identity that has never logged in, created by a single touch of one video and deletable at will. YouTube appears to score fresh anonymous sessions per IP, and an aged anonymous session passes checks that a fresh one fails. There's no account, so there's nothing to ban: if it gets flagged, delete the jar and make a new one after the block clears. It's adopted for the download path, off by default, and never committed.

## Amendment — 23 July: a per-user cap alongside the global budget

A single household-wide budget was spent first come, first served — and the discovery jobs run at staggered times through the day, with mine first. My follows alone used the whole allowance every morning, so the kids' picks were deferred every day. Their feeds went empty while the pipeline looked perfectly healthy: discovery ran, the guard cleared things, downloads succeeded — all of it for me. A single first-come pool starves whoever runs last, and that was the kids, who are the point of the system.

The budget became **two limits, and the tighter one governs each run**:

- **A household budget of 30 a day.** Its purpose is unchanged: it's the bot-detection ceiling, a property of the home IP rather than the size of the family, so it stays one fixed number.
- **A per-user budget of 10 a day.** A fairness floor, so an early, heavy-follow user can't drain the pool before others run.

With three users, each is guaranteed 10 and the household ceiling never binds first. The household cap earns its keep when the number of profiles changes: adding a fourth keeps total exposure at 30 rather than drifting to 40. On-demand requests from the share sheet still count towards both, and are still never refused.

**Rejected: per-user caps only.** Equivalent for three people and simpler — but it ties the bot-detection ceiling to headcount, the wrong thing to tie it to.
