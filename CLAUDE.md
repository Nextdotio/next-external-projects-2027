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
- **Keep our own governance off the page.** The site never says a format, a fee or
  a figure was *approved*, *signed off* or *derived* — that is how we talk internally
  about our own process, and a host reads it as us negotiating with ourselves. The
  page states what the client gets and what it costs. Same for measurement jargon
  (no "KPI") and for hedges that explain where a number came from. The rationale
  belongs in code comments, CLAUDE.md and README.md, which is where it lives.
- **`MAX_GUESTS`** is derived from `FORMATS`, so the hero chip and the printed
  brochure cannot drift from the largest room a published format actually builds.
  Never hardcode a guest ceiling.
- **One approved format only** (Desi + Gerda, 17 Sep 2026): the Drinks Reception at a
  firm €35,000. The other five were removed - they were derived from delivered-event
  history, never an approved rate card. Do not reinstate one without a written approval.
- **The fee is a fee, not a band.** `fee: 35000` + `feeCovers: 60` on the format;
  `fmtBand` short-circuits for any format carrying a `fee`, because an approved figure
  must not render as a ±8% range. The old `baseCost`/`perGuest` model still works for any
  future format that is genuinely guest-scaled.
- **€35,000 covers up to 60 guests; the room runs 60 to 350.** (Stuart, 17 Sep 2026 -
  `min: 60, max: 350` on the format.) €35,000 was the 60-guest entry price in the old
  model, ~€180 a guest beyond it, so publishing it flat across a 350-guest room gives
  away ~€52,000 of catering. The card, the brief builder and both PDFs state the
  60-guest fee scope *and* the 350 ceiling together - one without the other either
  caps the sale or gives the build away. Never drop either line. The brief builder
  shows a live "guests beyond the fee" count on the page, in the printout and in the
  mailto.
- **Prices are behind a flag.** `SHOW_INVESTMENT` at the top of `src/App.jsx` toggles
  every indicative figure on the cards, in the brief builder and in both printouts. The
  model is derived from delivered-event history, not an approved price list — see
  README.md before changing it.
- **The fifth calendar slot is `offcal`**, an off-calendar build priced at a `premium`
  of 0.3. The uplift is stated openly wherever a number appears; change the rate on that
  one `SUMMITS` entry.
- **Two printables**, both generated client-side into a print window:
  `downloadBrochurePDF()` (hero + footer) and `downloadBriefPDF(brief)` (brief builder).
- Claims are pitched at the conservative end on purpose: 13 partner-hosted events
  since 2024, 5 cities. The 500+ figure is different in kind - it is the founders'
  lifetime output since Events by Martin, across two decades and the whole business,
  not partner-hosted events. Keep the two clearly separated wherever they appear. The
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
