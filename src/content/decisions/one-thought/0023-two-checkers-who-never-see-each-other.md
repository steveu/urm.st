---
project: one-thought
number: 23
title: Research claims are checked by two readers who never see each other
date: 2026-09-18
summary: True findings were being stretched, so each claim is now graded by how close its study is to golf, by two readers who never see each other.
retroactive: true
---

Every thought on the menu ships with a researched dossier ([“The menu seeds only documented thoughts”](./documented-thoughts-only)), and that research has already removed one thought and reshaped others. So the dossiers have to be right.

Two checks were always done: does the source exist and say this, and does it support the claim as worded? A third was not — **how far is the study from a golfer carrying this thought on a course?** That is where the dossiers went wrong, in two ways:

- **A true claim, stretched in the prose.** A meta-analysis on external focus of attention — attending to the effect of a movement rather than your body — was recorded accurately, then used to support "watching your own visible behaviour is safe". Monitoring your own muttering is not what the study tested.
- **A different population, stated flat.** A review of self-monitoring in school-age children's classroom behaviour was used for golfers' lapses on the course, with no hedge — and under the wrong authors. The first checker had flagged both; neither reached the prose.

Both are one lesson: **the record and the prose drift apart unless something ties them.**

So I rebuilt the method:

- **Every claim has an id** in one merged collection: 156 sources, 178 claims, 78 quotes, and 9 dropped claims kept with their reasons.
- **Two independent checkers per claim** — a neutral reader and a sceptic — each seeing only the claim and source text fetched that session, never the researcher's reasoning, the earlier checking or each other. The sceptic, when torn, picks the less direct level, but must name the specific difference. Where they disagree, the more cautious value is stored and the claim comes to me; disagreements are never averaged.
- **The supporting passage is verbatim**, at most 45 words, and machine-checked as a substring of the source. A passage that can't be found isn't a passage.
- **Directness decides how the prose may speak.** *Direct* (golfers, or a closely matching self-paced aiming sport, doing essentially this act) may be stated plainly. *Analogous* (same mechanism, different population or setting) must say where it comes from — "in lab putting", "in students". *Extrapolated* (a link to golf the authors didn't make) may only appear as our inference, named as one.
- **A prose check runs at the end of every dossier build**, reporting links with no record, wrong attributions and prose that claims more than its source.

The first full re-check found that only **five** of the 178 claims are direct; the rest are analogous or extrapolated. Both checkers found the prose claiming more than its source in eight places, and 43 records carried wrong or descriptive author strings.

## Consequences

- **The corrections changed the prose, not the product.** Five dossiers, then two more, were corrected against their sources. No coaching line, tap rule, tap direction or verdict changed.
- **Fixes get a second pair of eyes.** The first correction pass cleared every error and still got things wrong. Now an independent, read-only reviewer reads the diff against the sources after any batch of fixes, and is told not to trust the fixer's report. It catches a large overreach swapped for a smaller one, half-updated records, credit given to the paper that reports a finding rather than the one that found it, and invented details in corrections.
- **A design decision resting on extrapolation says so where it's made**, not only in a closing caveat. *Commit to the Line* is marked plainly: that the physical act of pressing helps is my experience, not a researched finding.
- **"The research has nothing on this" is a valid answer.** Gaps go on a research list, along with sources looked at and set aside, and why.
- **I can overrule a verdict**, as with *Ancient History* — but the overrule is recorded, and the evidence is never quietly rewritten to fit.
- **Source text stays private.** It is other people's copyright: fetched to local storage outside the repo, never committed, never served. The repo holds our summaries, short attributed passages and links.

## Considered and rejected

- **Averaging the two checkers.** A disagreement is information; it goes to me, with the more cautious value stored meanwhile.
- **Open web search for new sources.** Scholarly indexes come first; blogs and SEO pages are where wrong or poisoned content lives.
