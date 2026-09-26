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
  since 2024, 5 cities. The 800+ figure is different in kind - it is the founders'
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

## Navigation (23 Sep 2026)

Stuart: "it's hard to find products when i have to scroll right down for them".

- **The first screen carries the offer.** `HeroOffer` (`[data-offer]`, under the hero
  lede) shows the format, its fee with `feeScope` (the 60-guest scope and the room
  ceiling, always together; the printed brochure reads the same helper) and the five
  slots as calendar leaves, each linking to its own row (`#slot-<id>`); the off-calendar
  leaf carries its premium. It reads `FORMATS` and `SUMMITS` only, and
  `SHOW_INVESTMENT = false` drops the fee.
- **Section order:** what it is → the format (`#formats`) → the calendar → the room →
  how it works → brief. The format sits ahead of the calendar. Grounds alternate, so a
  reorder swaps `bg-brand-ink/70` too.
- **`SiteNav`:** the bar shows The Format and Build a Brief from md, Calendar from lg,
  How It Works from xl; the menu button (every width) lists every section plus the
  printable brochure, and is the whole nav on a phone. `navLinks` in App is the one list
  (page order, plus the `bar` breakpoint). The section in view is marked `aria-current`.
- **Anchors land by measurement:** App measures the nav into `--nav-h`
  (ResizeObserver); `section[id]` and `.jump-target` use it as `scroll-margin-top`, and
  the sticky brief summary as its `top`. Never hardcode a nav offset. First-load deep
  links (`…/#formats`) are landed again after render and while Inter swaps in, until
  the reader scrolls. `#brief` is `overflow-clip`, not `overflow-hidden`: a hidden
  section is a scroll container, and the sticky summary never stuck.

## Present mode and seller tools (26 Sep 2026)

Stuart: "Make all brochures beautiful, easy to navigate, easy to understand for buyers,
and easy for our sellers to take the buyers through and convince them to buy each and
every product."

- **Present mode** is a full-screen walk-through for a screen share. The shell (URL,
  keys, swipe, focus, scroll lock, slide list) is `src/PresentMode.jsx`; the deck is
  `buildSlides` and the `*Slide` components in `src/App.jsx`. Entry points: Present in
  the nav (an icon from md, labelled from xl, in the section menu on a phone), Present
  beside Print the brochure in the hero, and a quiet Present on the format card and on
  every calendar row, which opens the deck on that card's slide.
- **The deck, 16 slides (17 once the brief has something in it):** cover (the hero's
  eyebrow, headline and chips, an "In this presentation" list, and `HeroOffer` itself,
  whose parts jump to their slides) → What it is (`PILLARS`) → Track record
  (`TRACK_RECORD` and `TrackRecordNote`) → the format (one slide per `FORMATS` entry; a
  family slide is added if there are ever two or more) → the 2027 calendar (family
  slide) → one slide per `SUMMITS` slot → The room (`ROOM_STATS`, `ROOM_STEPS`) → Twelve
  weeks (`TIMELINE`, condensed to week, title and line) → Your report (`REPORT_IN`,
  `PIPELINE`) → How we work with you (`TERMS`) → Straight answers (`FAQS`, opened in
  place) → Your brief (only when the brief has a slot or a format; `BriefSummary`) →
  Next steps (the page's closing call to action, Build your brief, Print the brochure,
  the enquiry mailto, and `RESPONSE`).
- **Where the deck gets its data:** the same constants and components as the page.
  `HEADS` holds every section's eyebrow, headline and lede; `PILLARS`, `TRACK_RECORD`,
  `HERO_CHIPS`, `ROOM_STATS`, `PIPELINE`, `REPORT_TITLE` and `CALENDAR_NOTES` hold the
  rest of the copy that appears on both; the arrays (`FORMATS`, `SUMMITS`, `ROOM_STEPS`,
  `TIMELINE`, `REPORT_IN`, `TERMS`, `FAQS`, `RESPONSE`) feed both. A new slot, step,
  term or question appears in the deck by itself. Edit the constant, never a slide,
  and never re-type a figure onto one.
- **Shared components, so their rules travel onto the slides:** `FormatInvestment` (the
  fee with its 60-guest scope and the room ceiling, card and slide), `feeScope` (the
  short form: cover and slot slides), `HeroOffer` (anchors on the page, buttons in the
  deck through `onJump`), `BriefSummary` (fee, guests beyond it, off-calendar premium,
  send, print, brief link), `FaqItem`, `TrackRecordNote`, `DateTile`, `Headline`.
- **URL:** `?present` opens the cover; `?present=<slide id>` opens that slide, and the
  address bar follows the slide (replaceState, so Back does not step through slides).
  Product slides use the card's anchor: `formats`, `slot-ice`, `slot-igb`, `slot-sbc`,
  `slot-sigma`, `slot-offcal`. The others: `cover`, `what-it-is`, `track-record`,
  `calendar`, `the-room`, `how-it-works`, `report`, `terms`, `questions`, `your-brief`,
  `next-steps`. Closing drops `present`; Back or Forward to an address without it
  closes the deck.
- **Keys:** → Space PageDown next, ← PageUp back, Home and End, G all slides, Esc closes
  the slide list first and then the deck; swipe on touch. Focus returns to whatever
  opened the deck; the page behind is inert and scroll-locked; reduced motion drops
  the slide animation.
- **Fit:** a typical slide fits 1280x800 without scrolling. The format slide lists
  every line the fee covers, never "+ N more on the card" (Stuart, 26 Sep 2026:
  "Please do include all deliverables. It's important"). The `short` variant in
  `src/index.css` (max-height 820px) tightens the deck's spacing and type for that; a
  long slide may scroll on a phone, and nothing scrolls sideways at 390. Check both
  before adding content to a slide.
- **Slide actions:** Add to brief goes through the page's own setters (`chooseFormat`,
  `chooseSummit`, the same ones the format card, the calendar rows and the brief
  builder use), so the deck and the page can never disagree about the brief. Open the
  card (Open the slot) closes the deck and lands on the card through `landOn`, which
  also moves focus there. Copy link sits beside them.
- **Copy link** (`CopyLinkButton`) is on the format card (`#formats`), every calendar
  row (`#slot-<id>`) and every product slide: this page plus the card's anchor, never
  `present`, and it says "Link copied". Quiet styling (`QUIET_ACTION`), never competing
  with the price or Add to brief. The calendar row's main button stretches over the
  whole row (`after:inset-0`), so clicking anywhere still starts a brief while Copy link
  and Present sit above that layer. Never nest a button inside the row.
- **Brief link:** "Copy brief link" in `BriefSummary` (on the page and on the Your brief
  slide) copies `?plan=<slot id>,<format id>~<guests>#brief`, for example
  `?plan=sbc,reception~120#brief`. On load App restores it through `chooseSummit` and
  `chooseFormat`, fits the guest count to the slider (`fitGuests`: within the format's
  60 to 350, on its step), skips anything it does not recognise, and drops `plan` from
  the address bar. It says "brief" because that is what the page calls it.
- **No goal chips:** the format and the slots carry no goal tags, so the product menu
  pattern from the other brochures does not apply here.
- **Rules to keep, on slides as on the page:** `SHOW_INVESTMENT = false` drops every fee
  from the deck too; the fee never appears without the 60-guest scope and the 350
  ceiling; the off-calendar premium is stated wherever that slot is priced; `MAX_GUESTS`
  stays derived; the 13 partner-hosted events since 2024 and the 5 cities stay apart
  from the 800+ (the Track record slide prints `TrackRecordNote` word for word); no
  "approved", "signed off", "derived" or "KPI"; past clients are described, never
  named. Buyer-facing words only: the button is "Present", and the page never says
  seller, pitch, objection or close. No em dashes in new copy.
- **Polish in the same pass:** the brief summary's small print before a format is
  picked now follows the formats on offer (each carries a fixed fee), where it used to
  say the figure "moves with guest numbers".
