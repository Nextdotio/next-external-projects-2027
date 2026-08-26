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
- **Prices scale with guest numbers.** Each format has a `baseCost` (venue, production,
  staffing, guest list) plus a `perGuest` rate (food, drink, kit, transfers); the page
  shows a ±8% band around `base + perGuest × guests`. Never reintroduce a flat "from"
  figure on its own — it reads as a fixed price regardless of room size.
- **Prices are behind a flag.** `SHOW_INVESTMENT` at the top of `src/App.jsx` toggles
  every indicative figure on the cards, in the brief builder and in both printouts. The
  model is derived from delivered-event history, not an approved price list — see
  README.md before changing it.
- **The fifth calendar slot is `offcal`**, an off-calendar build priced at a `premium`
  of 0.3. The uplift is stated openly wherever a number appears; change the rate on that
  one `SUMMITS` entry.
- **Two printables**, both generated client-side into a print window:
  `downloadBrochurePDF()` (hero + footer) and `downloadBriefPDF(brief)` (brief builder).
- Claims are pitched at the conservative end on purpose: 13 events, 5 cities. The
  reasoning is in README.md — do not round them up.
- The twelve-week section is an interactive timeline (`Timeline` in `src/App.jsx`) —
  a horizontal rail on desktop with arrow-key support, a vertical spine on mobile. Each
  `TIMELINE` entry needs `w`, `short`, `t`, `b`, `us` and `you`.
- Visual direction is low-lit and gold: near-black ground, `glass` / `glass-gold`
  surfaces, `gold-text` gradient headlines, `spill` glows and a film-grain overlay — all
  defined in `src/index.css`. Keep new sections on those utilities rather than one-off
  colours.
- Imagery is reused NEXT Summit Valletta 2025 photography of real partner-hosted events.
  Swap in per-format shots when Marketing supplies them.
