# NEXT.io External Projects 2027 — client-facing brochure

Single-page React (Vite + Tailwind) brochure for **External Projects**: partner-funded
VIP events that NEXT.io builds and runs alongside the major iGaming summits, with one
host per event.

**Live:** https://nextdotio.github.io/next-external-projects-2027/

> **One-time setup still needed.** `npm run deploy` has pushed the built site to the
> `gh-pages` branch, but GitHub Pages has never been switched on for this repo, so the
> URL above returns "Site not found". Turn it on once — *Settings → Pages → Source:
> Deploy from a branch → `gh-pages` / `(root)`* — and it publishes immediately; every
> `npm run deploy` after that just updates it. (The sibling summit repos are already
> configured this way; the API path that would do it is blocked from this environment.)

This is the sales asset Stuart asked for on the 20 August strategy call — "a deck we can
start pitching to certain companies that we're doing these external events and how they
can get involved" — built as a page rather than a deck so a seller can send one link,
and print a brochure or a filled-in brief straight from it.

## What's on the page

| Section | Purpose |
| --- | --- |
| What this actually is | You host / we build and run / we fill the room, plus track record |
| The 2027 calendar | Five slots against named summits; click one to start a brief |
| One format | Drinks Reception - the only format approved for sale |
| The room is the product | How the guest list is built, and what the post-event report does and does not cover |
| Brief to event in twelve weeks | Week-by-week build, response-time promise, commercial ground rules |
| Build your brief | Summit + format + guest count → mailto or printable brief |
| Straight answers | The six questions that come up on the first call |

Two printable outputs, both generated client-side and opened in a print window:
the **full brochure** (hero buttons and footer) and a **filled-in outline brief**
(brief builder).

## Where the content came from

- `External_Projects_Portfolio_Strategy_1.pptx` — the Stage 2 strategy deck
- The External Projects 2027 strategy call, 20 August 2026 (Angelica, Rory, Will,
  Stuart, Ana, Pierre, Gerda)

Specifically: the format is Appendix B; the calendar is slide 4; guest-list
standards (300 guests, 75% C-level, 80% of agreed criteria, no blanket invites) are
Rory's relationship KPIs; the twelve-week timeline and the WhatsApp invite journey are
Angelica's event timeline; response times are Appendix B; the commercial ground rules
are Appendix C plus the deposit discussion in Appendix 14.

### What was deliberately left out

The strategy deck is internal. None of the following appears on the page, and none of
it should be added:

- Profit targets, per-event cost and margin (€175k / €105k / €280k, €55k cost, €35k profit)
- Client concentration (SPRIBE 82%, Altenar 15%) and named past clients
- Commission structure, seller incentives, pipeline maths and conversion assumptions
- The readiness gate, intervention triggers and open leadership decisions

Named clients are described rather than named ("our longest-standing host has run seven
of these with us across four cities"). Get written permission before naming anyone.

### Numbers on the page, and how far they are safe

- **13 events since 2024** — the deck's own records disagree (13 v 14, unresolved,
  Richard to reconcile by 15 Dec). The page claims the lower figure on purpose.
- **5 host cities** — Rome, Barcelona, Malta, London and SBC Summit Americas in Florida.
  Lisbon is pipeline, not delivered, so it is not counted.
- **300 guests / 75% C-level / 80% of criteria** — the standards Relationships commits
  to, not measured outcomes. Worded as targets throughout.

## Investment — one approved format, one approved fee

**DECIDED (Desi + Gerda, 17 Sep 2026):** only one format is approved for sale, the
**Drinks Reception at €35,000**. The other five formats have been removed from the
brochure. They were never an approved price list - this README said so from the start
("**They are not an approved price list**", Appendix B: the point is faster quoting,
"not a published price list") - so the review confirmed what the provenance already
recorded rather than contradicting it.

The fee is now modelled as a **fee, not a derived band**: `fee: 35000` and
`feeCovers: 60` on the `reception` entry, with `baseCost`/`perGuest` set to null. An
approved figure must never render as a ±8% range, so `fmtBand` short-circuits when a
format carries a `fee`.

**Guard the margin.** €35,000 was the entry price at **60 guests** in the old model
(about €180 a guest in food, drink, kit and transfers on top of a fixed base). The
room now runs **60 to 350 guests** (Stuart, 17 Sep 2026), so the exposure is no
longer a rounding error: quoting €35,000 flat at 350 would give away roughly
**€52,000** of catering on a single event. The fee is therefore published as covering
**up to 60 guests**, with everything above that quoted on the brief - the card, the
brief builder and both PDF exports all say so, and the brief builder now shows a live
"guests beyond the fee" count on the page as well as in the printout and the mailto.
If Desi and Gerda intend €35,000 to cover a larger room, that is a margin decision to
take knowingly and in writing, not a wording tweak.

The **off-calendar** slot still adds a **30% premium** on top (`premium` on that
`SUMMITS` entry).

One flag controls all of it — `SHOW_INVESTMENT` at the top of `src/App.jsx`:

```js
const SHOW_INVESTMENT = true   // false → every price disappears, page still works
```

Set it to `false` to ship a brochure with no numbers, or edit `baseCost` / `perGuest` on
the `FORMATS` array once Finance confirms the cost of an event and the minimum profit
(both due 31 August).

## The fifth slot is off-calendar, and priced up

Slide 4 leaves one 2027 slot open. Rather than list it as a vague "your summit", the page
sells it as **Off-Calendar**: the host already has a date, a city or an occasion, and we
wrap the whole operation around it.

It carries a 30% premium, stated openly on the calendar row, in the brief builder, in the
FAQ and in both printouts. The reason given to the client is the real one: during a summit
week crew, freight and venue costs are shared across several events and the guests are
already in town; off-calendar, none of that is shared and the room has to be brought to
the city rather than found in it.

Change the rate in one place — `premium: 0.3` on the `offcal` entry in `SUMMITS`.

## Still to add

- **Testimonials.** Will was collecting these from Martin; none are on the page and none
  have been invented.
- **Format photography.** Images are reused from NEXT Summit Valletta 2025 and show
  real partner-hosted events, but they are summit photography, not per-format shots.
  Marketing owes one story and one photo set per format.
- **Calendar confirmation.** Dates are as recorded in our files. Confirm with each
  organiser before this goes out; SiGMA World Rome is unconfirmed.
- **The fifth slot.** Sold as an off-calendar premium build rather than a named summit.
  G2E was proposed on the call — add it to the `SUMMITS` array if leadership would rather
  have a dated fifth slot than an open one.

## Development

```
npm install
npm run dev      # local dev server
npm run build    # verify it compiles
npm run deploy   # vite build && gh-pages -d dist
```

Content lives in plain arrays at the top of `src/App.jsx`: `SUMMITS`, `FORMATS`,
`ROOM_STEPS`, `REPORT_IN`, `TIMELINE`, `RESPONSE`, `TERMS`, `FAQS`. Both printouts read
from the same arrays, so editing one of them updates the page and the PDFs together.
