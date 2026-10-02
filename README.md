# urm.st

Personal site and portfolio, built with [Astro](https://astro.build). Deployed on Netlify from `netlify.toml`.

```sh
npm install
npm run dev      # local dev server
npm run build    # type-check and build to dist/
npm run preview  # serve the built site
```

- `src/layouts/Base.astro`: document shell, meta and structured data
- `src/components/`: header, footer, hero
- `src/styles/global.css`: design tokens and base styles
- `content/`, `data/`: content carried over from the previous react-static site, not yet wired in
