---
project: eddy
number: 12
title: Downloads are budgeted, demand-driven and stop when blocked
date: 2026-07-20
summary: After a multi-day block, downloads only happen when a video is actually chosen, within a daily budget, and the pipeline stops rather than keeps probing when blocked.
amended: [2026-07-20, 2026-07-23, 2026-10-09]
---

After [“Discovery metadata moves to the YouTube Data API”](./discovery-metadata-via-data-api) moved metadata to the Data API, downloads were the only meaningful yt-dlp traffic leaving the house. A July incident showed the remaining machinery still lost to a determined block. The block lasted three days whatever changed, while the escalating cooldown's probe loop — one probe every twelve hours, each re-tripping the block — at best delayed recovery and at worst kept the block alive.

The database showed the real demand. Downloads were outpacing viewing roughly ten to one, and most of the downloads stuck behind the block were eager fetches of uploads from followed channels that nobody had asked to watch.

The decision is a cluster that only makes sense together: **downloads are demand-driven and budgeted, the pipeline gives up early when blocked, and the answer to a block is less traffic, not different traffic.**

1. **Downloads are bound to the slate, follows included.** A followed creator's upload enters the candidate pool when it's spotted, but nothing downloads until the daily slate picks it or a kid asks for it. Eagerly fetching every upload from every followed channel was the main source of volume.
2. **A daily download budget,** in priority order: slate picks first, then follow-sourced picks. Back-catalogue seeding stops entirely — the pool was already far bigger than what gets watched.
3. **A circuit breaker instead of endless cooldowns.** After three blocks in a row, both download queues pause and I get one alert. Resuming is always manual and checks both download paths. Staying dark until a human looks was chosen over automatic backoff because, after a day of blocks, every automatic probe can only refresh the block.
4. **No VPN, proxy or rented server.** The right response to a block is less traffic, not different traffic. A block only affects Eddy — the family's own YouTube use is untouched — so there's nothing to route around. Revisit only if outages become weekly rather than quarterly.
5. **No account cookies, ever.** A throwaway account under bot suspicion gets banned rather than slowed down, turning a self-healing outage into a dead credential — and account cookies on the kids' download path cross the anonymity line the product draws.

## Consequences

- A kid opening a followed creator's brand-new upload before the slate picks it waits a few minutes for an on-demand fetch, instead of instant play. That's the accepted cost of an honest budget.
- The pool grows more slowly, so a new interest takes a day or two longer to fill out.
- Recovering from a block needs me. If I'm away for a week, the pipeline stays dark even if the block cleared on day two — chosen deliberately over automatic probing.
- On resume, the jobs that were parked are cleared rather than drained, so there's no backlog burst the moment a block clears.

## Considered and rejected

- **VPN, proxy or rented-server egress.** It adds cost and a dependency, changes the shape of the traffic rather than the amount, and protects nothing the block actually threatens.
- **Automatic exponential backoff.** Hands-off, but it keeps spending probes against a block of unknown length — and the probes are the suspected cause of it lasting.
- **Keep eager follow downloads and only budget discovery.** The autopsy showed follows *were* the volume. Budgeting around them would be fiction.

## Amendment — 20 July 2026: rule 5 narrowed to logged-in cookies

A logged-out session that can be deleted at will is allowed on the download path; logged-in credentials still aren't. The reasoning behind rule 5 — a banned account and a crossed anonymity line — applies to accounts, and a session with no account has nothing to ban.

## Amendment — 23 July 2026: a per-user cap alongside the household budget

A single household-wide budget was spent first come, first served, and the discovery jobs run at staggered times through the day. One heavy-follow user's run could use the whole allowance before anyone else's ran, so the others' picks were deferred every day. Their feeds went empty while the pipeline looked perfectly healthy: discovery ran, the guard cleared things, downloads succeeded — all of it for one person. A single first-come pool starves whoever runs last, and in a household that can be a kid, who is the point of the system.

The budget became **two limits, and the tighter one governs each run**:

- **A household budget of 30 a day.** Its purpose is unchanged: it's the volume ceiling for the household's address, a property of the address rather than the size of the family, so it stays one fixed number.
- **A per-user budget of 10 a day.** A fairness floor, so an early, heavy-follow user can't drain the pool before others run.

The household cap earns its keep when the number of profiles changes: adding one keeps total exposure pinned rather than drifting up. On-demand requests from the share sheet still count towards both, and are still never refused.

**Rejected: per-user caps only.** Equivalent for a fixed household and simpler — but it ties the volume ceiling to headcount, the wrong thing to tie it to.

## Amendment — 9 October 2026: reframed for publication

This record was reframed around restraint: rule 4 now gives the reason (less traffic, not different traffic) rather than a comparison of network ranges, and household volumes and schedule details were removed. The rules themselves are unchanged. One addition since July: a failure-streak alert that doesn't depend on recognising the block, so a block that looks different from the known ones still reaches a human. It alerts only; pausing stays the circuit breaker's call.
