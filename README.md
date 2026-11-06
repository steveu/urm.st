# urm.st

Personal site and portfolio, built with [Astro](https://astro.build). Deployed on Netlify from `netlify.toml`.

```sh
npm install
npm run dev      # local dev server
npm run build    # type-check and build to dist/
npm run preview  # serve the built site
npm test         # unit tests (vitest)
```

- `src/layouts/Base.astro`: document shell, meta and structured data
- `src/components/`: header, footer, hero
- `src/styles/global.css`: design tokens and base styles
- `content/`, `data/`: content carried over from the previous react-static site, not yet wired in

## Fit check

A demo of job-radar, a matching tool, running on my own profile. Visitors paste a job posting and see how it matches: a verdict, two or three reasons picked from a fixed list, each backed by a quote from the posting, a location verdict against the profile's location preferences, and a flag for instructions aimed at AI tools. The posting comes back marked up, each quote tinted in place.

- `src/fit/`: the core. `profile.md` is the profile the check scores against, with its location preferences, public by design; `copy.ts` holds everything the page can say, keyed by the codes the model picks from; `schema.ts` checks every answer, including that each quote is verbatim from the posting; `check.ts` calls the model (pinned in `prompt.ts` with `PROMPT_VERSION`) and retries once before giving up as "couldn't assess".
- `netlify/functions/fit-check.mts`: `POST /api/fit-check` with `{ "text": "…" }`. Netlify rate-limits it per visitor (5 requests per 3 minutes); the API key is `ANTHROPIC_API_KEY` in Netlify's environment, plus `ANTHROPIC_WORKSPACE_ID` if the key needs one. Nothing is stored or logged. Set a monthly spend cap on the key in the Anthropic Console as a backstop.
- The system prompt is treated as extractable: it holds only the instructions and the public profile.
- `src/components/fit/`: the home-page band. `FitCheck.astro` shows four invented sample postings, whose answers were computed ahead by the real check and committed in `src/fit/sample-results.json`, so they're instant, free and work with scripts off; then the paste box. `result.ts` renders the marked-up posting and its thumbnail from site copy and the escaped posting, the same at build time and in the browser. The browser checks every quote against the paste again before showing it.
- `src/fit/evals/`: the two evals, explained at `/work/fit-check`; the band's close quotes the red team. `redteam.ts` holds invented postings, each paired with a copy carrying an instruction aimed at AI tools; `scripts/fit-redteam.ts` scores every pair. `scripts/fit-agreement.ts` scores postings I labelled by hand in job-radar after the profile was frozen, reading job-radar's database read-only at run time from outside the repo. Both write aggregate counts and rates only (`*-results.json`); a test fails if those files hold any other text, or were measured with a different model or prompt version.

Try it locally, with the key in your environment:

```sh
npm run build
ANTHROPIC_API_KEY=… npm run preview:fit   # serves dist/ and the function at http://127.0.0.1:4391
FIT_HOST=0.0.0.0 npm run preview:fit         # to reach it from another device
npm run fit:try                               # run the invented sample postings live and print the cost
npm run fit:samples                           # recompute the samples' committed answers (after a prompt, model or sample change)
npm run fit:redteam                           # re-run the red team and rewrite its figures (a couple of pence)
npm run fit:agreement                         # re-run agreement with job-radar's labels (needs ~/data/job-radar/radar.db; under 10p)
```

`node --env-file=<file> scripts/preview-fit.ts` works too. The preview binds to `FIT_HOST` and `FIT_PORT`, falling back to `HOST` and `PORT`, then `127.0.0.1:4391`; an env file shared with another project may set `HOST`, so set `FIT_HOST` to choose. Variables set in the shell win over the env file. The preview stands in for Netlify's rate limit with an in-memory one using the same numbers.
