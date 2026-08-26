# NEXT.io External Projects 2027 — client-facing brochure

Single-page React (Vite + Tailwind) brochure for **External Projects**: partner-funded
VIP events that NEXT.io builds and runs alongside the major iGaming summits, with one
host per event.

**Live:** https://stuatnext.github.io/next-external-projects-2027/

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
| Six formats | Reception, Dinner, Lounge, Hospitality Day, VIP Side Event, Flagship |
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

Specifically: the six formats are Appendix B; the calendar is slide 4; guest-list
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

## Indicative investment — read before sending this to anyone

The format cards, the brief builder and both printouts show an indicative "from" band.
Those bands are derived from the delivered-event history in the deck (≈€90k average
client spend; €139k and €58k averages for the two main hosts; a €50k standard build
cited as a good deal), laid out across the six formats. **They are not an approved price
list**, and Appendix B is explicit that the point is faster quoting, "not a published
price list".

One flag controls all of it — `SHOW_INVESTMENT` at the top of `src/App.jsx`:

```js
const SHOW_INVESTMENT = true   // false → every price disappears, page still works
```

Set it to `false` to ship a brochure with no numbers, or edit the `from` values on the
`FORMATS` array once Finance confirms the cost of an event and the minimum profit
(both due 31 August).

## Still to add

- **Testimonials.** Will was collecting these from Martin; none are on the page and none
  have been invented.
- **Format photography.** Images are reused from NEXT Summit Valletta 2025 and show
  real partner-hosted events, but they are summit photography, not per-format shots.
  Marketing owes one story and one photo set per format.
- **Calendar confirmation.** Dates are as recorded in our files. Confirm with each
  organiser before this goes out; SiGMA World Rome is unconfirmed.
- **The fifth slot.** Listed as an open brief. G2E was proposed on the call — swap it
  into the `SUMMITS` array once leadership confirms.

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
