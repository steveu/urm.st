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

Visitors paste a job posting and get a fit verdict, two or three reasons each backed by a quote from the posting, a location verdict, and a flag for instructions aimed at AI tools.

- `src/fit/`: the core. `profile.md` is job-radar's scoring profile, copied verbatim and public by design; `copy.ts` holds everything the page can say, keyed by the codes the model picks from; `schema.ts` checks every answer, including that each quote is verbatim from the posting; `check.ts` calls the model (pinned in `prompt.ts` with `PROMPT_VERSION`) and retries once before giving up as "couldn't assess".
- `netlify/functions/fit-check.mts`: `POST /api/fit-check` with `{ "text": "…" }`. Netlify rate-limits it per visitor (5 requests per 3 minutes); the API key is `ANTHROPIC_API_KEY` in Netlify's environment, plus `ANTHROPIC_WORKSPACE_ID` if the key needs one. Nothing is stored or logged. Set a monthly spend cap on the key in the Anthropic Console as a backstop.
- The system prompt is treated as extractable: it holds only the instructions, the public profile and the public location summary.

Try it locally, with the key in your environment:

```sh
npm run build
ANTHROPIC_API_KEY=… npm run preview:fit   # serves dist/ and the function at http://127.0.0.1:4391
HOST=0.0.0.0 PORT=4391 npm run preview:fit   # to reach it from another device
npm run fit:try                               # run the invented sample postings live and print the cost
```

`node --env-file=<file> scripts/preview-fit.ts` works too. The preview stands in for Netlify's rate limit with an in-memory one using the same numbers.
