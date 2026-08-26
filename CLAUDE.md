# NEXT.io External Projects 2027 — brochure

Single-page React (Vite + Tailwind) app. All content lives in `src/App.jsx` as plain
arrays near the top — `SUMMITS`, `FORMATS`, `ROOM_STEPS`, `REPORT_IN`, `TIMELINE`,
`RESPONSE`, `TERMS`, `FAQS`. The page and both printable outputs read from the same
arrays, so edit the array, not the markup.

## Deploying to gh-pages — ALWAYS

After any change that affects the site, **redeploy to gh-pages** so the live site stays
current. Do this without being asked, as part of finishing the work:

```
npm run deploy   # = vite build && npx gh-pages -d dist
```

Confirm it prints `Published` before reporting done.

## Workflow

- Develop on branch `claude/external-projects-brochure-syztql`.
- Run `npm run build` to verify changes compile.
- Redeploy gh-pages (see above).
- Commit with a clear message and push the branch.
- Open a fresh PR into `main` only when asked.

## Notes

- **This page is client-facing.** The source deck
  (`External_Projects_Portfolio_Strategy_1.pptx`) is internal. Never add profit targets,
  per-event costs or margins, client concentration, commission, pipeline maths, the
  readiness gate or open leadership decisions. Past clients are described, not named —
  naming one needs their written permission first.
- **Prices are behind a flag.** `SHOW_INVESTMENT` at the top of `src/App.jsx` toggles
  every indicative band on the cards, in the brief builder and in both printouts. The
  bands are derived from delivered-event history, not an approved price list — see
  README.md before changing them.
- **Two printables**, both generated client-side into a print window:
  `downloadBrochurePDF()` (hero + footer) and `downloadBriefPDF(brief)` (brief builder).
- Claims are pitched at the conservative end on purpose: 13 events, 5 cities. The
  reasoning is in README.md — do not round them up.
- Imagery is reused NEXT Summit Valletta 2025 photography of real partner-hosted events.
  Swap in per-format shots when Marketing supplies them.
