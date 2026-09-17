import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Mail, Globe, CalendarDays, MapPin, Users, Sparkles, CircleCheck, Download,
  ArrowRight, ArrowLeft, Clock, ShieldCheck, FileText, Wine, Trophy, Building2,
  Check, Target, Send, Coffee, UtensilsCrossed, PartyPopper, Ban, ClipboardList,
  BadgeCheck, Crown, Route, Gauge, UserCheck, Eye, ChevronDown,
} from 'lucide-react'

const base = import.meta.env.BASE_URL

// ─────────────────────────────────────────────────────────────────────────
// SALES DESK
//
// SHOW_INVESTMENT controls whether indicative figures appear on the format
// cards, in the brief builder and in both printouts. Set it to false to ship
// the brochure with no numbers at all — every other section keeps working.
// See README.md for where the model came from.
// ─────────────────────────────────────────────────────────────────────────
const SHOW_INVESTMENT = true

// ─── Indicative pricing model ─────────────────────────────────────────────
// Each format is a fixed base (venue, production, staffing, branding, guest
// list) plus a per-guest rate (food, drink, kit, transfers). A room of 350 does
// not cost what a room of 60 costs, and a single "from" figure invites exactly
// that misreading — so every number on the page is tied to a guest count.
// Bases are set so that base + perGuest x min reproduces the entry price for
// each format. Derived from delivered-event history, not an approved rate card.
const fmtPrice = (n) => '€' + Math.round(n).toLocaleString('en-US')
const roundTo = (n, step) => Math.round(n / step) * step

// The Drinks Reception fee is signed off, so it is quoted as a fee. Guests beyond
// what the fee covers are catered on quote, never silently absorbed.
const indicative = (f, guests, premium = 0) =>
  f.fee != null ? f.fee * (1 + premium)
    : f.baseCost == null ? null : (f.baseCost + f.perGuest * guests) * (1 + premium)
const overCount = (f, guests) => (f.fee != null && guests > f.feeCovers ? guests - f.feeCovers : 0)

// Quotes show a range, not a point estimate — the underlying data is thin.
const bandFor = (n) => [roundTo(n * 0.92, 1000), roundTo(n * 1.08, 1000)]
const fmtBand = (n, f) => {
  if (f && f.fee != null) return fmtPrice(roundTo(n, 1000))
  const [lo, hi] = bandFor(n)
  return `${fmtPrice(lo)} – ${fmtPrice(hi)}`
}

// ─── 2027 calendar ────────────────────────────────────────────────────────
// status: 'open' | 'interest' | 'tbc' | 'premium'
const SUMMITS = [
  {
    id: 'ice',
    name: 'ICE Barcelona',
    city: 'Barcelona',
    dates: '18–20 January 2027',
    month: 'JAN',
    status: 'open',
    premium: 0,
    note: 'The year opens here. Anything at ICE is sold and built during 2026 — briefs want to be with us by October.',
  },
  {
    id: 'igb',
    name: 'iGB Live',
    city: 'London',
    dates: '7–8 July 2027',
    month: 'JUL',
    status: 'open',
    premium: 0,
    note: 'British market focus, and the best central London venues are gone by spring. Early briefs get the short list.',
  },
  {
    id: 'sbc',
    name: 'SBC Summit',
    city: 'Lisbon',
    dates: '21–23 September 2027',
    month: 'SEP',
    status: 'interest',
    premium: 0,
    note: 'The largest gathering on the calendar, and the slot with interest already registered against it.',
  },
  {
    id: 'sigma',
    name: 'SiGMA World',
    city: 'Rome',
    dates: 'Dates to be confirmed',
    month: 'Q4',
    status: 'tbc',
    premium: 0,
    note: 'Edition dates are not published yet. Register interest and we will come back to you the day they are.',
  },
  {
    id: 'offcal',
    name: 'Off-Calendar',
    city: 'Your city, your date',
    dates: 'Wrapped around yours',
    month: 'ANY',
    status: 'premium',
    premium: 0.3,
    note: 'Already have a date, a city or an occasion of your own? We wrap the whole operation around it. Away from a summit week nothing is shared — crew, freight, venue and guest travel are all built from scratch — so it carries a premium.',
  },
]

const STATUS_STYLE = {
  open: { label: 'Open', cls: 'bg-brand-yellow text-brand-dark' },
  interest: { label: 'Interest registered', cls: 'bg-brand-white/12 text-brand-white border border-brand-white/25' },
  tbc: { label: 'Dates TBC', cls: 'bg-brand-white/8 text-brand-gray border border-brand-white/20' },
  premium: { label: 'Premium build', cls: 'bg-transparent text-brand-champagne border border-brand-yellow/60' },
}

// ─── The approved format ──────────────────────────────────────────────────────
// The largest room any published format builds. Derived so the hero chip and
// the printed brochure can never drift from the formats themselves.
const FORMATS = [
  {
    id: 'reception',
    name: 'Drinks Reception',
    icon: Wine,
    img: 'networking-drinks.jpg',
    tagline: 'The widest room, the shortest build.',
    guests: 'Rooms of 60 to 350 guests',
    min: 60, max: 350, def: 60,
    duration: 'One evening · 3–4 hours',
    notice: '8 weeks minimum',
    // APPROVED: Drinks Reception at a firm EUR 35,000 covering the format for up
    // to 60 guests. Beyond 60, catering is quoted on the brief. No derived band -
    // this figure is signed off, not inferred.
    fee: 35000, feeCovers: 60,
    baseCost: null, perGuest: null,
    bestFor: 'First-time hosts, market entries and launches that need volume and visibility rather than a seating plan.',
    included: [
      'Private venue within walking distance of the summit, held exclusively for you',
      'Three to four hours of bar and canapé service',
      'Your branding across the space — entrance, bar, backdrop, screens',
      'Guest list built from the NEXT.io network against your written brief',
      'Branded invitations, a hosted event page and live RSVP tracking',
      'WhatsApp invite journey with reminders at two weeks, one week and on the day',
      'Door and guest list management on the night',
      'A NEXT.io event manager on site from load-in to load-out',
      'Photography and a post-event attendance report',
    ],
    excluded: [
      'Seated dining or a formal programme',
      'Stage production, talent or entertainment booking',
      'Guest travel, transfers or accommodation',
    ],
  },
]

const MAX_GUESTS = Math.max(...FORMATS.map((f) => f.max))

// ─── How the room gets built ──────────────────────────────────────────────
const ROOM_STEPS = [
  {
    icon: ClipboardList,
    title: 'You brief us',
    body: 'Job titles, seniority, verticals, markets and named accounts. Written down, agreed, and used as the standard we are held to.',
  },
  {
    icon: UserCheck,
    title: 'We build the list',
    body: 'Names come out of the NEXT.io network and are matched against your brief one by one. Your own list is merged in and de-duplicated.',
  },
  {
    icon: Send,
    title: 'We invite properly',
    body: 'Personal invitations, a hosted event page, live RSVP tracking and a WhatsApp reminder journey. No blanket mailshot to twenty thousand people.',
  },
  {
    icon: ShieldCheck,
    title: 'We manage the door',
    body: 'Guest list and door control on the night, so the room holds the people you asked for and not the people who heard about it.',
  },
  {
    icon: Gauge,
    title: 'We report honestly',
    body: 'Registered against attended, the seniority mix you actually got, and where we fell short if we did.',
  },
]

const REPORT_IN = [
  'Registered, confirmed and attended',
  'Seniority mix measured against your brief',
  'Company, vertical and market breakdown',
  'Introductions made on the night',
  'Meetings held, where we booked them',
  'Guest feedback and satisfaction',
]

// ─── 12-week countdown ────────────────────────────────────────────────────
const TIMELINE = [
  {
    w: 'Week 12', short: '12', t: 'Brief and qualification',
    b: 'Objectives, guest criteria, format and budget, in one conversation.',
    us: 'A straight answer on whether we can deliver it, in the same call.',
    you: 'What a good night looks like, and who has to be in the room.',
  },
  {
    w: 'Week 10', short: '10', t: 'Proposal and venues',
    b: 'Three researched venues sized to your guest count, costed against the brief.',
    us: 'Shortlist, floor plans, costs and a delivery timeline.',
    you: 'Pick a venue, or tell us what is wrong with all three.',
  },
  {
    w: 'Week 8', short: '8', t: 'Contract and deposit',
    b: 'Signature and deposit. Only then do we hold the venue and commit suppliers.',
    us: 'Contract, payment schedule, and the venue held the day it clears.',
    you: 'Signature and the deposit. Nothing moves before both.',
  },
  {
    w: 'Week 6', short: '6', t: 'Design and build',
    b: 'Branding, menus, production design and run of show, all signed off by you.',
    us: 'Renders, menus, a run of show and a production schedule.',
    you: 'Brand assets, and one round of sign-off.',
  },
  {
    w: 'Week 4', short: '4', t: 'Invitations go out',
    b: 'Event page live, invitations issued, RSVP tracking open and visible to you.',
    us: 'Branded event page, first invitation wave, live RSVP dashboard.',
    you: 'Any names of your own, to merge and de-duplicate with ours.',
  },
  {
    w: 'Week 2', short: '2', t: 'Reminders and review',
    b: 'WhatsApp reminder wave, and a guest list review while there is still time to act.',
    us: 'Reminder wave, chased RSVPs, and the list as it actually stands.',
    you: 'Tell us who is missing. There is still time to fix it.',
  },
  {
    w: 'Week 1', short: '1', t: 'Final numbers',
    b: 'Confirmed headcount, seating and flow, and a briefing pack for your team.',
    us: 'Final numbers, seating or flow plan, and who is worth meeting.',
    you: 'Confirm who is attending from your side.',
  },
  {
    w: 'Event day', short: '★', t: 'We run it',
    b: 'A NEXT.io team on site from load-in to load-out, managing the door, the room and the schedule.',
    us: 'Load-in, door, room, schedule, suppliers, and the problems you never hear about.',
    you: 'Host. That is the whole job.',
  },
  {
    w: 'Week +1', short: '+1', t: 'Report and review',
    b: 'The post-event report, a debrief, and what we would change for the next one.',
    us: 'Who came, how senior, who met whom, and where we missed.',
    you: 'Tell us what to do differently. It goes into the next brief.',
  },
]

const RESPONSE = [
  { d: '1', t: 'First response', b: 'A named person replies, with the questions we need answered.' },
  { d: '2', t: 'A budget figure', b: 'A number you can take into a meeting, before anything has been scoped or booked.' },
  { d: '3', t: 'Can we deliver it', b: 'A straight yes or no on the format, the city and the date. We would rather say no early.' },
  { d: '5', t: 'Full proposal', b: 'Venues, scope, costs and timeline — once we have everything we asked for.' },
]

const TERMS = [
  { icon: Crown, t: 'One host per event', b: 'Your event carries your brand alone. No co-sponsors, no shared billing, and no competitor in the room.' },
  { icon: Building2, t: 'NEXT.io is the organiser', b: 'We contract the venue and the suppliers, we staff it, and we carry the operational risk of running it.' },
  { icon: ShieldCheck, t: 'Contract before commitment', b: 'Nothing is held or booked until the contract is signed and the deposit has cleared. That protects both sides.' },
  { icon: Route, t: 'Staged payments', b: 'A deposit on signature, the balance before the event, and any agreed extras invoiced afterwards.' },
  { icon: FileText, t: 'Changes are priced, then approved', b: 'Every change to an agreed scope is costed and signed off in writing before we act on it. No surprises on the final invoice.' },
  { icon: Clock, t: 'Cancellation steps up', b: 'Cancellation terms are set out in the contract and increase as the date approaches, because supplier commitments do the same.' },
]

const FAQS = [
  {
    q: 'Do we have to sponsor the summit as well?',
    a: 'No. External Projects sit alongside the summit and are completely independent of summit sponsorship. Plenty of hosts do both, and plenty do only this.',
  },
  {
    q: 'Why does an off-calendar event cost more?',
    a: 'During a summit week the industry is already in one city, so crew, freight and venue costs are shared across several events and your guests are a taxi ride away. Take the same event to your own city on your own date and none of that is shared — the crew flies in for you alone, and the guest list has to be flown in rather than intercepted. That is what the premium pays for.',
  },
  {
    q: 'Can we bring our own guest list?',
    a: 'Yes, and most hosts do. We merge your list with ours, de-duplicate it, and invite both under one branded journey so nobody gets two different invitations.',
  },
  {
    q: 'Who is actually in the room?',
    a: 'Senior operators, suppliers, affiliates and studios from the NEXT.io network, filtered to your brief. We target three quarters of the room at C-level or head-of, and at least eighty per cent matching the criteria you set.',
  },
  {
    q: 'What if fewer people turn up than we agreed?',
    a: 'You get the real numbers. The post-event report shows registered against attended and the seniority mix you actually got. If we missed the brief, the report says so — that is the point of measuring it.',
  },
  {
    q: 'How quickly can you turn one around?',
    a: 'The reception needs eight to twelve weeks depending on the build. If you have hosted with us before, eight weeks is usually enough because we already know how you work.',
  },
]

// ─── Enquiry mailto ───────────────────────────────────────────────────────
function buildMailto(brief) {
  const subject = 'NEXT.io External Projects 2027 - Event Enquiry'
  if (!brief.format && !brief.summit) {
    return `mailto:sales@next.io?subject=${encodeURIComponent(subject)}`
  }
  const fmt = FORMATS.find((f) => f.id === brief.format)
  const smt = SUMMITS.find((s) => s.id === brief.summit)
  const premium = smt?.premium || 0
  const est = fmt ? indicative(fmt, brief.guests, premium) : null
  const lines = [
    'Hi,',
    '',
    "We'd like to host an event with NEXT.io in 2027. Outline brief below:",
    '',
    `  Occasion:      ${smt ? (smt.id === 'offcal' ? 'Off-calendar - our own city and date' : `${smt.name}, ${smt.city} (${smt.dates})`) : 'To be discussed'}`,
    `  Format:        ${fmt ? fmt.name : 'To be discussed'}`,
    `  Guests:        ${fmt ? `approx. ${brief.guests}` : 'To be discussed'}`,
    fmt ? `  Lead time:     ${fmt.notice}` : null,
    SHOW_INVESTMENT && fmt
      ? `  ${fmt && fmt.fee != null ? 'Fee:          ' : 'Indicative:   '} ${est ? (fmt && fmt.fee != null ? `${fmtBand(est, fmt)} covering ${fmt.feeCovers} guests${overCount(fmt, brief.guests) ? `, plus ${overCount(fmt, brief.guests)} on quote` : ''}` : `${fmtBand(est)} at ${brief.guests} guests`) : 'quoted on brief'}${premium ? ' (includes off-calendar premium)' : ''}`
      : null,
    '',
    'Our objectives for the event:',
    '  - ',
    '',
    'Guest criteria that matter to us (titles, seniority, verticals, markets):',
    '  - ',
    '',
    'Please come back with venue options and a proposal.',
    '',
    'Kind regards,',
  ].filter(Boolean)
  return `mailto:sales@next.io?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\r\n'))}`
}

// ─── Printable brief ──────────────────────────────────────────────────────
function downloadBriefPDF(brief) {
  const fmt = FORMATS.find((f) => f.id === brief.format)
  const smt = SUMMITS.find((s) => s.id === brief.summit)
  const premium = smt?.premium || 0
  const est = fmt ? indicative(fmt, brief.guests, premium) : null
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const row = (k, v) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`
  const list = (items, cls) => `<ul class="${cls}">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>NEXT.io External Projects 2027 - Event Brief</title>
  <script>window.addEventListener('load',function(){setTimeout(function(){window.print()},500)});<\/script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;background:#fff;font-size:12.5px;line-height:1.55}
    .header{background:#0b0b0d;color:#fff;padding:44px 48px 36px}
    .logo{font-size:26px;font-weight:900;text-transform:uppercase;letter-spacing:-0.5px}
    .logo span{color:#ffcf33}
    .sub{color:#999;font-size:13px;margin-top:6px}
    .body{padding:36px 48px}
    .label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#999;margin:28px 0 12px}
    .label:first-child{margin-top:0}
    table{width:100%;border-collapse:collapse}
    th{text-align:left;padding:11px 16px;background:#f6f6f6;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#777;width:190px;border-bottom:1px solid #e8e8e8;vertical-align:top}
    td{padding:11px 16px;border-bottom:1px solid #e8e8e8;font-weight:600}
    ul{padding-left:18px;margin-top:4px}
    li{margin-bottom:4px}
    ul.out li{color:#8a1c1c}
    .two{display:flex;gap:32px}
    .two>div{flex:1}
    .fill{border:1px dashed #c9c9c9;border-radius:6px;padding:14px 16px;min-height:88px;color:#aaa;font-style:italic}
    .foot{padding:26px 48px 40px;border-top:3px solid #ffcf33;margin-top:34px;color:#666;font-size:11.5px;line-height:1.75}
    .foot strong{color:#1a1a1a}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body>
  <div class="header">
    <div class="logo">NEXT<span>.io</span> External Projects <span>2027</span></div>
    <div class="sub">Outline Event Brief &nbsp;&middot;&nbsp; Prepared ${date}</div>
  </div>
  <div class="body">
    <div class="label">The event</div>
    <table>
      ${row('Occasion', smt ? (smt.id === 'offcal' ? 'Off-calendar — your own city and date' : `${smt.name} — ${smt.city}`) : 'To be discussed')}
      ${row('Dates', smt ? smt.dates : 'To be discussed')}
      ${row('Format', fmt ? fmt.name : 'To be discussed')}
      ${row('Guest numbers', fmt ? `approx. ${brief.guests}` : 'To be discussed')}
      ${row('Minimum lead time', fmt ? fmt.notice : '8–16 weeks depending on format')}
      ${SHOW_INVESTMENT ? row(fmt && fmt.fee != null ? `Fee, covering ${fmt.feeCovers} guests` : `Indicative at ${fmt ? brief.guests : '—'} guests`, est ? fmtBand(est, fmt) : 'Quoted on brief') : ''}
      ${SHOW_INVESTMENT && fmt && overCount(fmt, brief.guests) ? row('Guests beyond the fee', `${overCount(fmt, brief.guests)} - catering quoted on the brief`) : ''}
      ${SHOW_INVESTMENT && premium ? row('Off-calendar premium', `Included — +${Math.round(premium * 100)}% for a build outside a summit week`) : ''}
      ${row('Exclusivity', 'One host per event — no co-sponsors')}
    </table>
    ${fmt ? `
    <div class="label">What is included</div>
    ${list(fmt.included, 'in')}
    <div class="label">What is not included</div>
    ${list(fmt.excluded, 'out')}` : ''}
    <div class="label">To complete before we quote</div>
    <div class="two">
      <div>
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#777;margin-bottom:8px">Your objectives</p>
        <div class="fill">What does a good night look like for you?</div>
      </div>
      <div>
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#777;margin-bottom:8px">Guest criteria</p>
        <div class="fill">Titles, seniority, verticals, markets, named accounts.</div>
      </div>
    </div>
  </div>
  <div class="foot">
    <strong>Send this back and the clock starts.</strong> First response in one working day, a budget figure in two, a straight answer on deliverability in three, and a full proposal in five once we have everything we have asked for.<br>
    <strong>sales@next.io</strong> &nbsp;&middot;&nbsp; next.io<br>
    Fees cover the format as specified and exclude VAT. Anything beyond the scope set out here is quoted on the brief.
  </div>
  </body></html>`
  openPrintable(html)
}

// ─── Printable brochure ───────────────────────────────────────────────────
function downloadBrochurePDF() {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const cal = SUMMITS.map((s) => `<tr>
      <td class="mth">${esc(s.month)}</td>
      <td><strong>${esc(s.name)}</strong><div class="mut">${esc(s.city)}</div></td>
      <td>${esc(s.dates)}</td>
      <td class="stat">${esc(STATUS_STYLE[s.status].label)}</td>
    </tr>`).join('')
  const formats = FORMATS.map((f) => {
    const lo = indicative(f, f.min)
    const hi = f.fee != null ? lo : indicative(f, f.max)
    const eur = (v) => '€' + Math.round(roundTo(v, 1000)).toLocaleString('en-US')
    const price = !SHOW_INVESTMENT ? ''
      : lo == null ? 'POA'
      : f.fee != null ? eur(lo)
      : `${eur(lo)} – ${eur(hi)}`
    const scale = SHOW_INVESTMENT && lo != null
      ? `<div class="scale">${esc(f.fee != null ? `A fixed fee covering up to ${f.feeCovers} guests · rooms to ${f.max} quoted on the brief` : `${f.min} guests to ${f.max} guests · about €${f.perGuest} a guest either way`)}</div>` : ''
    return `<div class="fmt">
      <div class="fhead">
        <div><h3>${esc(f.name)}</h3><div class="mut">${esc(f.tagline)}</div></div>
        <div class="price">${price}${scale}</div>
      </div>
      <div class="meta">${esc(f.guests)} &nbsp;&middot;&nbsp; ${esc(f.duration)} &nbsp;&middot;&nbsp; ${esc(f.notice)}</div>
      <p class="best"><strong>Best for:</strong> ${esc(f.bestFor)}</p>
      <div class="cols">
        <div><p class="ch">Included</p><ul>${f.included.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>
        <div><p class="ch">Not included</p><ul class="out">${f.excluded.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>
      </div>
    </div>`
  }).join('')
  const terms = TERMS.map((t) => `<li><strong>${esc(t.t)}.</strong> ${esc(t.b)}</li>`).join('')
  const steps = TIMELINE.map((s) => `<tr><td class="mth">${esc(s.w)}</td><td><strong>${esc(s.t)}</strong><div class="mut">${esc(s.b)}</div><div class="mut"><em>We:</em> ${esc(s.us)} &nbsp;<em>You:</em> ${esc(s.you)}</div></td></tr>`).join('')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>NEXT.io External Projects 2027</title>
  <script>window.addEventListener('load',function(){setTimeout(function(){window.print()},600)});<\/script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;background:#fff;font-size:11.5px;line-height:1.55}
    .cover{background:#0b0b0d;color:#fff;padding:56px 48px}
    .cover h1{font-size:30px;font-weight:900;text-transform:uppercase;letter-spacing:-0.5px}
    .cover h1 span{color:#ffcf33}
    .cover .tag{font-size:15px;color:#ffcf33;font-weight:700;margin-top:10px}
    .cover p{color:#aaa;margin-top:10px;font-size:12.5px;max-width:640px;line-height:1.7}
    section{padding:26px 48px 6px}
    h2{font-size:17px;font-weight:900;text-transform:uppercase;margin-bottom:14px;page-break-after:avoid}
    table{width:100%;border-collapse:collapse;margin-bottom:8px}
    td{padding:9px 12px;border-bottom:1px solid #ebebeb;vertical-align:top}
    .mth{font-weight:900;color:#8a7300;width:88px;white-space:nowrap}
    .stat{text-align:right;font-size:10.5px;text-transform:uppercase;letter-spacing:1px;color:#777;white-space:nowrap}
    .mut{color:#777;font-weight:400;margin-top:2px}
    .fmt{border:1px solid #e5e5e5;border-radius:8px;padding:14px 16px;margin-bottom:12px;page-break-inside:avoid}
    .fhead{display:flex;justify-content:space-between;align-items:baseline;gap:16px}
    .fhead h3{font-size:14px;font-weight:800}
    .price{font-size:14px;font-weight:900;white-space:nowrap;text-align:right}
    .scale{font-size:9.5px;font-weight:400;color:#777;text-transform:uppercase;letter-spacing:.6px;margin-top:3px}
    .meta{font-size:10.5px;text-transform:uppercase;letter-spacing:1px;color:#8a7300;margin-top:8px}
    .best{margin:8px 0 10px;color:#444}
    .cols{display:flex;gap:24px}
    .cols>div{flex:1}
    .ch{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:4px}
    ul{padding-left:16px}
    li{margin-bottom:3px}
    ul.out li{color:#8a1c1c}
    ol{padding-left:18px}
    ol li{margin-bottom:6px}
    .foot{padding:24px 48px 40px;border-top:3px solid #ffcf33;margin-top:24px;color:#666;font-size:11px;line-height:1.75}
    .foot strong{color:#1a1a1a}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body>
  <div class="cover">
    <h1>NEXT<span>.io</span> External Projects <span>2027</span></h1>
    <div class="tag">Your event. Our room.</div>
    <p>Partner-funded VIP events, built and run by NEXT.io alongside the summits your buyers already attend — or wrapped around a date and a city of your own. You host it and it carries your brand alone. We find the venue, build it, fill the room from our network, run it on the night and report on who was actually there.</p>
  </div>
  <section><h2>The 2027 calendar</h2><table>${cal}</table>
  <p class="mut">Summit dates are as published by the organisers and are confirmed with them before anything is booked. Off-calendar builds carry a premium of around ${Math.round((SUMMITS.find((s) => s.id === 'offcal').premium) * 100)}%, because outside a summit week nothing — crew, freight, venue or guest travel — is shared with another event.</p></section>
  <section><h2>The format</h2>${formats}
  <p class="mut">${SHOW_INVESTMENT ? `The fee is fixed for the format as specified and covers up to ${FORMATS[0].feeCovers} guests: venue, production, staffing, branding and the guest list. We build rooms up to ${MAX_GUESTS}; additional guests and catering are quoted against your brief.` : ''}</p></section>
  <section><h2>How the room gets built</h2>
  <p style="margin-bottom:10px">Up to ${MAX_GUESTS} guests per event. We target three quarters of the room at C-level or head-of, and at least eighty per cent matching the criteria you set in writing. Your own list is merged in and de-duplicated. No blanket mailshots.</p>
  <p class="ch">Your post-event report covers</p><ul>${REPORT_IN.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
  <p style="margin-top:10px"><strong>What it does not cover:</strong> your pipeline. We can tell you exactly who walked in, how senior they were and who they met. What that becomes commercially is yours to run.</p></section>
  <section><h2>From brief to event in twelve weeks</h2><table>${steps}</table>
  <p class="mut">Eight weeks is usually enough if you have hosted with us before.</p></section>
  <section><h2>How we work with you</h2><ol>${terms}</ol></section>
  <div class="foot">
    <strong>Start a brief:</strong> sales@next.io &nbsp;&middot;&nbsp; next.io<br>
    First response in one working day &middot; a budget figure in two &middot; a straight answer on deliverability in three &middot; full proposal in five.<br>
    ${SHOW_INVESTMENT ? `The Drinks Reception fee is fixed for the format as specified and covers up to ${FORMATS[0].feeCovers} guests. It excludes VAT. Larger rooms — we build up to ${MAX_GUESTS} — additional catering and anything outside the specification are quoted against your brief.<br>` : ''}
    Generated ${date}
  </div>
  </body></html>`
  openPrintable(html)
}

function openPrintable(html) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 120000)
}

// ─── Scroll animation ─────────────────────────────────────────────────────
function useScrollAnimation() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.style.opacity = '1'
          e.target.style.transform = 'none'
          observer.unobserve(e.target)
        }
      }),
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    )
    document.querySelectorAll('[data-anim]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

const anim = { opacity: 0, transform: 'translateY(24px)', transition: 'opacity .7s ease, transform .7s ease' }

// ─── Section eyebrow ──────────────────────────────────────────────────────
function Eyebrow({ children }) {
  return (
    <div className="mb-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-brand-yellow/90 mb-3">{children}</p>
      <div className="gold-rule w-28" />
    </div>
  )
}

// ─── Featured format ──────────────────────────────────────────────────────
// Used when the card carries a single approved format: a full-width spread
// rather than one portrait card stranded in a grid. FormatCard's grid layout
// is kept for the day a second format is approved.
function FormatFeature({ f, onSelect, selected }) {
  const Icon = f.icon
  const entry = indicative(f, f.min)

  return (
    <div
      data-anim
      style={anim}
      className={`rounded-[2rem] overflow-hidden grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] ${
        selected ? 'glass-gold' : 'glass'
      }`}
    >
      {/* Photography */}
      <div className="relative min-h-[19rem] lg:min-h-[34rem]">
        <img alt={f.name} src={`${base}images/${f.img}`} className="absolute inset-0 w-full h-full object-cover opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/50 to-brand-dark/5" />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-yellow/12 via-transparent to-transparent" />
        <div className="hidden lg:block absolute inset-y-0 right-0 w-36 bg-gradient-to-r from-transparent to-brand-dark/95" />
        <div className="absolute inset-x-0 bottom-0 p-8 lg:p-10">
          <div className="flex items-center gap-3 mb-2">
            <Icon className="w-7 h-7 text-brand-yellow shrink-0" />
            <h3 className="text-3xl md:text-4xl font-bold uppercase tracking-tight leading-[1.05]">{f.name}</h3>
          </div>
          <p className="text-brand-champagne/90 italic">{f.tagline}</p>
        </div>
      </div>

      {/* Detail */}
      <div className="p-8 lg:p-10 flex flex-col">
        <div className="flex flex-wrap gap-2 mb-6 text-[10px] uppercase tracking-[0.15em] font-bold">
          <span className="flex items-center gap-1.5 bg-brand-white/6 border border-brand-white/10 rounded-full px-3.5 py-2">
            <Users className="w-3.5 h-3.5 text-brand-yellow" />{f.guests}
          </span>
          <span className="flex items-center gap-1.5 bg-brand-white/6 border border-brand-white/10 rounded-full px-3.5 py-2">
            <Clock className="w-3.5 h-3.5 text-brand-yellow" />{f.notice}
          </span>
          <span className="flex items-center gap-1.5 bg-brand-white/6 border border-brand-white/10 rounded-full px-3.5 py-2">
            <Sparkles className="w-3.5 h-3.5 text-brand-yellow" />{f.duration}
          </span>
        </div>

        <p className="text-brand-gray leading-relaxed mb-8">
          <span className="text-brand-white font-semibold">Best for: </span>{f.bestFor}
        </p>

        <p className="text-[10px] uppercase tracking-[0.25em] text-brand-gray mb-4">
          {f.fee != null ? 'What the fee covers' : 'What is included'}
        </p>
        <ul className="grid sm:grid-cols-2 gap-x-7 gap-y-2.5 mb-8">
          {f.included.map((i) => (
            <li key={i} className="flex gap-2.5 text-sm text-brand-white/90 leading-snug">
              <Check className="w-4 h-4 text-brand-yellow shrink-0 mt-0.5" />{i}
            </li>
          ))}
        </ul>

        <div className="rounded-2xl bg-brand-dark/60 border border-brand-white/8 p-5 mb-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-brand-gray mb-3">Not included</p>
          <ul className="grid sm:grid-cols-3 gap-x-6 gap-y-2">
            {f.excluded.map((i) => (
              <li key={i} className="flex gap-2.5 text-sm text-brand-gray leading-snug">
                <Ban className="w-4 h-4 text-brand-gray/60 shrink-0 mt-0.5" />{i}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto flex flex-col sm:flex-row sm:items-end gap-6 justify-between">
          {SHOW_INVESTMENT && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-brand-gray mb-2">{f.fee != null ? 'Investment' : 'Indicative investment'}</p>
              {entry == null ? (
                <>
                  <p className="text-4xl font-bold gold-text leading-none">Quoted on brief</p>
                  <p className="text-[11px] text-brand-gray mt-2.5">{f.duration} · scoped before it is priced</p>
                </>
              ) : (
                <>
                  <p className="text-4xl font-bold gold-text leading-none">{fmtPrice(roundTo(entry, 1000))}</p>
                  <p className="text-[11px] text-brand-gray mt-2.5 leading-relaxed max-w-md">
                    {f.fee != null
                      ? <>A fixed fee for the format as specified, covering up to <span className="text-brand-white font-semibold">{f.feeCovers} guests</span>. We build rooms up to {f.max} — anything above {f.feeCovers} is quoted on the brief.</>
                      : <>at {f.min} guests, then about <span className="text-brand-white font-semibold">{fmtPrice(f.perGuest)} a guest</span> on top — roughly {fmtPrice(roundTo(indicative(f, f.max), 1000))} at {f.max}.</>}
                  </p>
                </>
              )}
            </div>
          )}

          <button
            onClick={() => onSelect(f.id)}
            className={`shrink-0 rounded-full px-9 py-4 font-bold text-[11px] uppercase tracking-[0.2em] transition-colors ${
              selected
                ? 'bg-brand-yellow text-brand-dark'
                : 'bg-brand-white/8 text-brand-white hover:bg-brand-yellow hover:text-brand-dark'
            } ${SHOW_INVESTMENT ? '' : 'w-full'}`}
          >
            {selected
              ? <span className="flex items-center justify-center gap-2"><CircleCheck className="w-4 h-4" />In your brief</span>
              : 'Add to brief'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Format card ──────────────────────────────────────────────────────────
function FormatCard({ f, onSelect, selected, delay }) {
  const [open, setOpen] = useState(false)
  const Icon = f.icon
  const entry = indicative(f, f.min)

  return (
    <div
      data-anim
      style={{ ...anim, transitionDelay: `${delay}ms` }}
      className={`rounded-3xl overflow-hidden flex flex-col lift ${
        selected ? 'glass-gold' : 'glass hover:border-brand-yellow/45'
      }`}
    >
      <div className="relative h-56 shrink-0">
        <img alt={f.name} src={`${base}images/${f.img}`} className="w-full h-full object-cover opacity-85" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/45 to-brand-dark/5" />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-yellow/10 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center gap-2.5 mb-1.5">
            <Icon className="w-5 h-5 text-brand-yellow" />
            <h3 className="text-2xl font-bold uppercase tracking-tight">{f.name}</h3>
          </div>
          <p className="text-brand-champagne/90 text-sm italic">{f.tagline}</p>
        </div>
      </div>

      <div className="p-6 flex flex-col grow">
        <div className="flex flex-wrap gap-2 mb-5 text-[10px] uppercase tracking-[0.15em] font-bold">
          <span className="flex items-center gap-1.5 bg-brand-white/6 border border-brand-white/10 rounded-full px-3 py-1.5">
            <Users className="w-3.5 h-3.5 text-brand-yellow" />{f.guests}
          </span>
          <span className="flex items-center gap-1.5 bg-brand-white/6 border border-brand-white/10 rounded-full px-3 py-1.5">
            <Clock className="w-3.5 h-3.5 text-brand-yellow" />{f.notice}
          </span>
        </div>

        <p className="text-brand-gray text-sm leading-relaxed mb-6">
          <span className="text-brand-white font-semibold">Best for: </span>{f.bestFor}
        </p>

        {SHOW_INVESTMENT && (
          <div className="mb-6 pb-6 border-b border-brand-white/10">
            <p className="text-[10px] uppercase tracking-[0.25em] text-brand-gray mb-2">{f.fee != null ? 'Investment' : 'Indicative investment'}</p>
            {entry == null ? (
              <>
                <p className="text-3xl font-bold gold-text leading-none">Quoted on brief</p>
                <p className="text-[11px] text-brand-gray mt-2.5">{f.duration} · scoped before it is priced</p>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold gold-text leading-none">{fmtPrice(roundTo(entry, 1000))}</p>
                <p className="text-[11px] text-brand-gray mt-2.5 leading-relaxed">
                  {f.fee != null
                    ? <>A fixed fee for the format as specified, covering up to <span className="text-brand-white font-semibold">{f.feeCovers} guests</span>. We build rooms up to {f.max} — anything above {f.feeCovers} is quoted on the brief.</>
                    : <>at {f.min} guests, then about <span className="text-brand-white font-semibold">{fmtPrice(f.perGuest)} a guest</span> on top — roughly {fmtPrice(roundTo(indicative(f, f.max), 1000))} at {f.max}.</>}
                </p>
              </>
            )}
          </div>
        )}

        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center justify-between w-full text-left text-[11px] uppercase tracking-[0.2em] font-bold text-brand-white hover:text-brand-yellow transition-colors mb-3"
        >
          {open ? 'Hide what you get' : 'See what you get'}
          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="mb-6 space-y-4 fade-up">
            <ul className="space-y-2">
              {f.included.map((i) => (
                <li key={i} className="flex gap-2.5 text-sm text-brand-white/90 leading-snug">
                  <Check className="w-4 h-4 text-brand-yellow shrink-0 mt-0.5" />{i}
                </li>
              ))}
            </ul>
            <div className="rounded-2xl bg-brand-dark/70 border border-brand-white/8 p-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-brand-gray mb-2">Not included</p>
              <ul className="space-y-1.5">
                {f.excluded.map((i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-brand-gray leading-snug">
                    <Ban className="w-4 h-4 text-brand-gray/60 shrink-0 mt-0.5" />{i}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <button
          onClick={() => onSelect(f.id)}
          className={`mt-auto w-full rounded-full py-3.5 font-bold text-[11px] uppercase tracking-[0.2em] transition-colors ${
            selected
              ? 'bg-brand-yellow text-brand-dark'
              : 'bg-brand-white/8 text-brand-white hover:bg-brand-yellow hover:text-brand-dark'
          }`}
        >
          {selected
            ? <span className="flex items-center justify-center gap-2"><CircleCheck className="w-4 h-4" />In your brief</span>
            : 'Add to brief'}
        </button>
      </div>
    </div>
  )
}

// ─── Interactive twelve-week timeline ─────────────────────────────────────
function Timeline() {
  const [active, setActive] = useState(0)
  const last = TIMELINE.length - 1
  const step = TIMELINE[active]
  const pct = (active / last) * 100

  const move = useCallback((delta) => {
    setActive((i) => Math.min(Math.max(i + delta, 0), last))
  }, [last])

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(1) }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(-1) }
    if (e.key === 'Home') { e.preventDefault(); setActive(0) }
    if (e.key === 'End') { e.preventDefault(); setActive(last) }
  }

  const dotClass = (i) =>
    i === active
      ? 'bg-brand-yellow scale-150 shadow-[0_0_0_4px_rgba(255,207,51,0.18),0_0_22px_rgba(255,207,51,0.85)]'
      : i < active
        ? 'bg-brand-gold'
        : 'bg-brand-white/25 group-hover:bg-brand-yellow/70'

  return (
    <div>
      {/* Horizontal rail — desktop */}
      <div
        className="hidden md:block relative mb-12 px-2"
        role="tablist"
        aria-label="Twelve week build"
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <div className="absolute left-2 right-2 top-[9px] h-px bg-brand-white/12" />
        <div
          className="absolute left-2 top-[9px] h-px bg-gradient-to-r from-brand-gold via-brand-yellow to-brand-yellow transition-all duration-500 ease-out shadow-[0_0_12px_rgba(255,207,51,0.6)]"
          style={{ width: `calc((100% - 1rem) * ${pct / 100})` }}
        />
        <div className="relative flex justify-between">
          {TIMELINE.map((s, i) => (
            <button
              key={s.w}
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              className="group flex flex-col items-center gap-4 cursor-pointer"
              style={{ flex: '0 0 auto' }}
            >
              <span className={`w-[18px] h-[18px] rounded-full transition-all duration-300 ${dotClass(i)}`} />
              <span
                className={`text-[10px] font-bold uppercase tracking-[0.18em] whitespace-nowrap transition-colors duration-300 ${
                  i === active ? 'text-brand-yellow' : 'text-brand-gray group-hover:text-brand-white'
                }`}
              >
                {s.w}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Detail panel — desktop */}
      <div key={active} className="hidden md:grid lg:grid-cols-12 gap-10 glass rounded-3xl p-10 min-h-[19rem] fade-up">
        <div className="lg:col-span-5 flex flex-col">
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-brand-yellow mb-3">{step.w}</p>
          <h3 className="text-3xl xl:text-4xl font-bold uppercase leading-[1.05] tracking-tight mb-4">{step.t}</h3>
          <p className="text-brand-gray leading-relaxed">{step.b}</p>

          <div className="flex items-center gap-4 mt-auto pt-8">
            <div className="flex gap-2">
              <button
                onClick={() => move(-1)}
                disabled={active === 0}
                aria-label="Previous step"
                className="w-11 h-11 rounded-full border border-brand-white/15 flex items-center justify-center hover:border-brand-yellow hover:text-brand-yellow transition-colors disabled:opacity-25 disabled:hover:border-brand-white/15 disabled:hover:text-brand-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => move(1)}
                disabled={active === last}
                aria-label="Next step"
                className="w-11 h-11 rounded-full border border-brand-white/15 flex items-center justify-center hover:border-brand-yellow hover:text-brand-yellow transition-colors disabled:opacity-25 disabled:hover:border-brand-white/15 disabled:hover:text-brand-white"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <span className="text-[11px] uppercase tracking-[0.25em] text-brand-gray">
              Step {active + 1} of {TIMELINE.length}
            </span>
          </div>
        </div>

        <div className="lg:col-span-7 grid sm:grid-cols-2 gap-5 content-start">
          <div className="rounded-2xl bg-brand-dark/60 border border-brand-white/8 p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-yellow mb-3">We do</p>
            <p className="text-brand-white/90 leading-relaxed text-sm">{step.us}</p>
          </div>
          <div className="rounded-2xl bg-brand-dark/60 border border-brand-white/8 p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-champagne mb-3">You do</p>
            <p className="text-brand-white/90 leading-relaxed text-sm">{step.you}</p>
          </div>
        </div>
      </div>

      {/* Vertical spine — mobile */}
      <div className="md:hidden relative pl-8">
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-brand-white/12" />
        <div
          className="absolute left-[7px] top-2 w-px bg-gradient-to-b from-brand-gold to-brand-yellow transition-all duration-500"
          style={{ height: `calc((100% - 1rem) * ${pct / 100})` }}
        />
        <div className="space-y-3">
          {TIMELINE.map((s, i) => (
            <div key={s.w} className="relative">
              <span
                className={`absolute -left-8 top-4 w-[15px] h-[15px] rounded-full transition-all duration-300 ${
                  i === active
                    ? 'bg-brand-yellow shadow-[0_0_18px_rgba(255,207,51,0.8)]'
                    : i < active ? 'bg-brand-gold' : 'bg-brand-white/25'
                }`}
              />
              <button
                onClick={() => setActive(i === active ? -1 : i)}
                aria-expanded={i === active}
                className={`w-full text-left rounded-2xl p-5 transition-colors ${
                  i === active ? 'glass-gold' : 'glass'
                }`}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-yellow mb-1.5">{s.w}</p>
                <p className="font-bold uppercase leading-tight">{s.t}</p>
                {i === active && (
                  <div className="mt-4 space-y-4 fade-up">
                    <p className="text-brand-gray text-sm leading-relaxed">{s.b}</p>
                    <div className="rounded-xl bg-brand-dark/60 border border-brand-white/8 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-yellow mb-2">We do</p>
                      <p className="text-brand-white/90 text-sm leading-relaxed">{s.us}</p>
                    </div>
                    <div className="rounded-xl bg-brand-dark/60 border border-brand-white/8 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-champagne mb-2">You do</p>
                      <p className="text-brand-white/90 text-sm leading-relaxed">{s.you}</p>
                    </div>
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Brief builder ────────────────────────────────────────────────────────
function BriefBuilder({ brief, setBrief }) {
  const fmt = FORMATS.find((f) => f.id === brief.format)
  const smt = SUMMITS.find((s) => s.id === brief.summit)
  const premium = smt?.premium || 0

  // Keep the guest count if it still fits the newly chosen format; otherwise
  // drop to that format's typical size rather than pinning to its floor.
  useEffect(() => {
    if (!fmt) return
    setBrief((b) => ({
      ...b,
      guests: b.guests >= fmt.min && b.guests <= fmt.max ? b.guests : fmt.def,
    }))
  }, [brief.format]) // eslint-disable-line react-hooks/exhaustive-deps

  const est = fmt ? indicative(fmt, brief.guests, premium) : null
  const ready = Boolean(brief.summit && brief.format)

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-6">
        <div data-anim style={anim} className="glass rounded-3xl p-7">
          <p className="text-[10px] uppercase tracking-[0.3em] text-brand-gray mb-5">1 · The occasion</p>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {SUMMITS.map((s) => (
              <button
                key={s.id}
                onClick={() => setBrief((b) => ({ ...b, summit: s.id }))}
                className={`text-left rounded-2xl px-4 py-3.5 border transition-all duration-300 ${
                  brief.summit === s.id
                    ? 'border-brand-yellow bg-brand-yellow/10'
                    : 'border-brand-white/10 bg-brand-dark/50 hover:border-brand-yellow/45'
                } ${s.id === 'offcal' ? 'sm:col-span-2' : ''}`}
              >
                <span className="flex items-center gap-2">
                  <span className="font-bold text-sm">{s.name}</span>
                  {s.premium > 0 && (
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-brand-champagne border border-brand-yellow/50 rounded-full px-2 py-0.5">
                      +{Math.round(s.premium * 100)}%
                    </span>
                  )}
                </span>
                <span className="block text-xs text-brand-gray mt-0.5">{s.city} · {s.dates}</span>
              </button>
            ))}
          </div>
        </div>

        <div data-anim style={anim} className="glass rounded-3xl p-7">
          <p className="text-[10px] uppercase tracking-[0.3em] text-brand-gray mb-5">2 · The format</p>
          <div className={`grid gap-2.5 ${FORMATS.length === 1 ? '' : 'sm:grid-cols-3'}`}>
            {FORMATS.map((f) => {
              const Icon = f.icon
              const on = brief.format === f.id
              return (
                <button
                  key={f.id}
                  onClick={() => setBrief((b) => ({ ...b, format: f.id }))}
                  className={`text-left rounded-2xl px-4 py-3.5 border transition-all duration-300 ${
                    on ? 'border-brand-yellow bg-brand-yellow/10' : 'border-brand-white/10 bg-brand-dark/50 hover:border-brand-yellow/45'
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-2 ${on ? 'text-brand-yellow' : 'text-brand-gray'}`} />
                  <span className="block font-bold text-sm leading-tight">{f.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div data-anim style={anim} className="glass rounded-3xl p-7">
          <p className="text-[10px] uppercase tracking-[0.3em] text-brand-gray mb-5">3 · The room size</p>
          {fmt ? (
            <>
              <div className="flex items-baseline gap-3 mb-5">
                <span className="text-6xl font-bold gold-text leading-none">{brief.guests}</span>
                <span className="text-sm text-brand-gray">guests · {fmt.name}</span>
              </div>
              <input
                type="range"
                min={fmt.min}
                max={fmt.max}
                step={fmt.max - fmt.min > 60 ? 10 : 5}
                value={brief.guests}
                onChange={(e) => setBrief((b) => ({ ...b, guests: Number(e.target.value) }))}
                className="w-full accent-[#ffcf33]"
                aria-label="Approximate guest numbers"
              />
              <div className="flex justify-between text-[10px] uppercase tracking-[0.2em] text-brand-gray mt-2.5">
                <span>{fmt.min}</span><span>{fmt.max}</span>
              </div>
              {SHOW_INVESTMENT && fmt.baseCost != null && (
                <p className="text-[11px] text-brand-gray mt-5 leading-relaxed">
                  Moving this moves the number. Food, drink, kit and transfers scale with the room at about{' '}
                  <span className="text-brand-white font-semibold">{fmt.fee != null ? 'quoted on the brief' : fmtPrice(fmt.perGuest) + ' a guest'}</span>; venue,
                  production, staffing and the guest list do not.
                </p>
              )}
            </>
          ) : (
            <p className="text-brand-gray text-sm">Pick a format and the guest range for it appears here.</p>
          )}
        </div>
      </div>

      <div className="lg:col-span-2">
        <div data-anim style={anim} className="glass-gold rounded-3xl p-7 lg:sticky lg:top-28">
          <p className="text-[10px] uppercase tracking-[0.3em] text-brand-gray mb-6">Your outline brief</p>

          <dl className="space-y-4 mb-6">
            {[
              ['Occasion', smt ? smt.name : 'Not chosen yet'],
              ['Where / when', smt ? `${smt.city} · ${smt.dates}` : '—'],
              ['Format', fmt ? fmt.name : 'Not chosen yet'],
              ['Guests', fmt ? `approx. ${brief.guests}` : '—'],
              ['Lead time', fmt ? fmt.notice : FORMATS[0].notice],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-brand-white/10 pb-3">
                <dt className="text-[10px] uppercase tracking-[0.2em] text-brand-gray shrink-0 pt-0.5">{k}</dt>
                <dd className="text-sm font-semibold text-right">{v}</dd>
              </div>
            ))}
          </dl>

          {SHOW_INVESTMENT && (
            <div className="rounded-2xl bg-brand-dark/70 border border-brand-white/10 p-5 mb-6">
              <p className="text-[10px] uppercase tracking-[0.25em] text-brand-gray mb-2">
                {fmt ? (fmt.fee != null ? `Fee, covering ${fmt.feeCovers} guests` : `Indicative at ${brief.guests} guests`) : 'Investment'}
              </p>
              <p className="text-2xl font-bold gold-text leading-tight">
                {!fmt ? '—' : est == null ? 'Quoted on brief' : fmtBand(est, fmt)}
              </p>
              {fmt && overCount(fmt, brief.guests) > 0 && (
                <p className="text-[11px] text-brand-champagne mt-3 leading-relaxed">
                  Plus {overCount(fmt, brief.guests)} guests beyond the {fmt.feeCovers} the fee covers — catering for those is
                  quoted against your brief, never added afterwards.
                </p>
              )}
              {premium > 0 && est != null && (
                <p className="text-[11px] text-brand-champagne mt-3 leading-relaxed">
                  Includes the +{Math.round(premium * 100)}% off-calendar premium — outside a summit week, nothing is shared.
                </p>
              )}
              <p className="text-[11px] text-brand-gray mt-3 leading-relaxed">
                {fmt && fmt.fee != null
                  ? <>Excludes VAT. A larger room, or anything outside the specification, is quoted against your brief.</>
                  : <>Moves with guest numbers, excludes VAT, and is quoted against your brief before anything is booked.</>}
              </p>
            </div>
          )}

          <a
            href={buildMailto(brief)}
            className={`flex items-center justify-center gap-2 w-full rounded-full py-4 font-bold text-[11px] uppercase tracking-[0.2em] transition-colors mb-3 ${
              ready ? 'bg-brand-yellow text-brand-dark hover:bg-brand-champagne' : 'bg-brand-white/8 text-brand-gray hover:bg-brand-white/15'
            }`}
          >
            <Mail className="w-4 h-4" />{ready ? 'Send this brief' : 'Email the team'}
          </a>
          <button
            onClick={() => downloadBriefPDF(brief)}
            className="flex items-center justify-center gap-2 w-full rounded-full py-4 font-bold text-[11px] uppercase tracking-[0.2em] border border-brand-white/20 hover:border-brand-yellow hover:text-brand-yellow transition-colors"
          >
            <Download className="w-4 h-4" />Print the brief
          </button>
          <p className="text-[11px] text-brand-gray mt-5 leading-relaxed">
            Nothing here is a booking. It is a starting point that saves the first two emails.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────
export default function App() {
  useScrollAnimation()

  const [brief, setBrief] = useState({ summit: null, format: null, guests: 100 })
  const [openFaq, setOpenFaq] = useState(null)

  const selectFormat = useCallback((id) => {
    setBrief((b) => ({ ...b, format: id }))
    document.getElementById('brief')?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const navLinks = useMemo(() => [
    ['What It Is', 'what-it-is'], ['Calendar', 'calendar'], ['The Format', 'formats'],
    ['The Room', 'the-room'], ['How It Works', 'how-it-works'], ['Brief', 'brief'],
  ], [])

  return (
    <div className="grain min-h-screen bg-brand-dark text-brand-white font-sans">

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-brand-dark/85 backdrop-blur-xl py-4 border-b border-brand-white/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex justify-between items-center gap-3">
          <a href="#" className="flex items-center gap-3 shrink-0">
            <img alt="NEXT.io" className="h-7 sm:h-8 object-contain" src={`${base}logos/next-io.png`} />
            <span className="hidden sm:block text-[10px] uppercase tracking-[0.3em] text-brand-gray border-l border-brand-white/20 pl-3">
              External Projects
            </span>
          </a>
          <div className="flex items-center gap-7">
            <a href="#formats" className="text-[11px] font-bold uppercase tracking-[0.2em] hover:text-brand-yellow transition-colors hidden md:block">The Format</a>
            <a href="#brief" className="text-[11px] font-bold uppercase tracking-[0.2em] hover:text-brand-yellow transition-colors hidden md:block">Build a Brief</a>
            <a
              href="mailto:sales@next.io?subject=NEXT.io External Projects 2027 - Event Enquiry"
              className="bg-brand-yellow text-brand-dark px-5 sm:px-7 py-2.5 rounded-full font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-brand-champagne transition-colors whitespace-nowrap"
            >
              Contact Sales
            </a>
          </div>
        </div>
      </nav>

      <main>
        {/* ── HERO ── */}
        <section className="relative min-h-[92vh] flex flex-col items-center justify-center overflow-hidden pt-28 pb-20">
          <div className="absolute inset-0 z-0">
            <img alt="A NEXT.io partner-hosted CxO dinner" src={`${base}images/cxo-event-hero.jpg`} className="w-full h-full object-cover opacity-[0.28]" />
            <div className="absolute inset-0 vignette" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-transparent to-brand-dark/80" />
          </div>
          <div className="spill w-[38rem] h-[38rem] -top-40 left-1/2 -translate-x-1/2 opacity-70 shimmer" />

          <div className="z-10 text-center max-w-5xl px-6 sm:px-8 w-full">
            <div className="flex items-center justify-center gap-4 mb-8">
              <span className="gold-rule w-12 rotate-180" />
              <p className="text-brand-yellow/90 font-bold uppercase tracking-[0.45em] text-[10px] sm:text-xs">External Projects · 2027</p>
              <span className="gold-rule w-12" />
            </div>
            <h1 className="text-5xl sm:text-7xl lg:text-[7.5rem] font-bold tracking-[-0.04em] uppercase leading-[0.86] mb-8">
              Your Event.<br /><span className="gold-text">Our Room.</span>
            </h1>
            <p className="text-brand-white/75 text-base sm:text-xl max-w-3xl mx-auto leading-relaxed mb-10">
              Partner-funded VIP events, built and run by NEXT.io alongside the summits your buyers already attend —
              or wrapped around a date and a city of your own. It carries your brand alone. We find the venue, build
              it, fill the room from our network, run it on the night, and tell you honestly who was there.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 mb-12 text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-bold">
              {[
                [CalendarDays, 'Five slots in 2027'],
                [Crown, 'One host per event'],
                [Users, `Up to ${MAX_GUESTS} curated guests`],
                [BadgeCheck, '75% C-level target'],
              ].map(([Icon, label]) => (
                <span key={label} className="flex items-center gap-2 glass rounded-full py-2.5 px-5">
                  <Icon className="w-3.5 h-3.5 text-brand-yellow" />{label}
                </span>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
              <a href="#brief" className="bg-brand-yellow text-brand-dark px-9 py-4 rounded-full font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-brand-champagne transition-colors flex items-center gap-2 shadow-[0_18px_50px_-18px_rgba(255,207,51,0.8)]">
                Build your brief <ArrowRight className="w-4 h-4" />
              </a>
              <button onClick={downloadBrochurePDF} className="border border-brand-white/20 px-9 py-4 rounded-full font-bold text-[11px] uppercase tracking-[0.2em] hover:border-brand-yellow hover:text-brand-yellow transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" /> Print the brochure
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-2.5">
              {navLinks.map(([label, id]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="text-brand-gray hover:text-brand-yellow font-bold uppercase tracking-[0.2em] text-[10px] transition-colors border border-brand-white/12 hover:border-brand-yellow/60 px-5 py-2.5 rounded-full"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHAT IT IS ── */}
        <section id="what-it-is" className="relative py-28 border-t border-brand-white/8 overflow-hidden">
          <div className="spill w-[30rem] h-[30rem] -left-40 top-20 opacity-50" />
          <div className="relative max-w-7xl mx-auto px-6 sm:px-8">
            <div data-anim style={anim} className="max-w-3xl mb-16">
              <Eyebrow>What this actually is</Eyebrow>
              <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tight leading-[1.02] mb-5">
                Not a sponsorship.<br /><span className="gold-text">A room of your own.</span>
              </h2>
              <p className="text-brand-gray text-lg leading-relaxed">
                No logo on someone else’s banner. An event of your own, in a city where the industry has already
                booked its flights — run end to end by the team that runs the NEXT.io summits.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-20">
              {[
                [Crown, 'You host it', 'It is your event, your brand and your guests. One host per event — no co-sponsors, no shared billing and no competitor standing in the same room.'],
                [Building2, 'We build and run it', 'Venue, food and drink, production, branding, staffing and on-site management. NEXT.io is the organiser of record and carries the operational risk.'],
                [Users, 'We fill the room', 'The guest list comes out of the NEXT.io network and is built against your written brief — then invited, chased and managed on the door.'],
              ].map(([Icon, t, b], i) => (
                <div key={t} data-anim style={{ ...anim, transitionDelay: `${i * 90}ms` }} className="glass lift rounded-3xl p-9 hover:border-brand-yellow/45">
                  <div className="w-12 h-12 rounded-full bg-brand-yellow/12 border border-brand-yellow/25 flex items-center justify-center mb-6">
                    <Icon className="w-5 h-5 text-brand-yellow" />
                  </div>
                  <h3 className="text-2xl font-bold uppercase mb-3 tracking-tight">{t}</h3>
                  <p className="text-brand-gray leading-relaxed">{b}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
              {[
                ['800+', 'Events delivered worldwide since Events by Martin'],
                ['13', 'Partner-hosted events delivered since 2024'],
                ['5', 'Host cities across Europe and the US'],
                ['75%', 'Target C-level and head-of'],
              ].map(([n, l], i) => (
                <div key={l} data-anim style={{ ...anim, transitionDelay: `${i * 80}ms` }} className="glass lift text-center px-4 py-9 rounded-3xl hover:border-brand-yellow/45">
                  <p className="text-5xl md:text-6xl font-bold gold-text mb-3 leading-none tracking-tight">{n}</p>
                  <p className="text-brand-gray text-[10px] md:text-[11px] uppercase tracking-[0.2em] leading-snug">{l}</p>
                </div>
              ))}
            </div>
            <p data-anim style={anim} className="text-brand-gray text-sm mt-7 max-w-3xl leading-relaxed">
              The founders of Events by Martin have produced more than 800 events around the world across two decades,
              a track record that became NEXT.io and now NEXTPredict. The thirteen above are the partner-hosted events
              we have delivered since 2024: Rome, Barcelona, Malta, London and SBC Summit Americas in Florida. Our
              longest-standing host has run seven of them with us across four cities — which is the number we would
              rather be judged on than any of the others.
            </p>
          </div>
        </section>

        {/* ── CALENDAR ── */}
        <section id="calendar" className="relative py-28 bg-brand-ink/70 border-t border-brand-white/8 overflow-hidden">
          <div className="spill w-[32rem] h-[32rem] -right-40 top-1/3 opacity-50" />
          <div className="relative max-w-7xl mx-auto px-6 sm:px-8">
            <div data-anim style={anim} className="max-w-3xl mb-14">
              <Eyebrow>The 2027 calendar</Eyebrow>
              <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tight leading-[1.02] mb-5">
                Five slots.<br /><span className="gold-text">Three of them dated.</span>
              </h2>
              <p className="text-brand-gray text-lg leading-relaxed">
                Planned against the summits rather than invented on request. Pick the week your buyers are already
                travelling to — or take the fifth option and we build it around a date of your own.
              </p>
            </div>

            <div className="space-y-3">
              {SUMMITS.map((s, i) => {
                const st = STATUS_STYLE[s.status]
                const chosen = brief.summit === s.id
                const isPremium = s.premium > 0
                return (
                  <button
                    key={s.id}
                    onClick={() => { setBrief((b) => ({ ...b, summit: s.id })); document.getElementById('brief')?.scrollIntoView({ behavior: 'smooth' }) }}
                    data-anim
                    style={{ ...anim, transitionDelay: `${i * 70}ms` }}
                    className={`w-full text-left rounded-3xl p-7 md:p-8 lift grid md:grid-cols-12 gap-4 md:gap-6 items-center ${
                      chosen ? 'glass-gold' : isPremium ? 'glass-gold hover:border-brand-yellow' : 'glass hover:border-brand-yellow/45'
                    }`}
                  >
                    <div className="md:col-span-1">
                      <span className={`text-2xl font-bold tracking-tight ${isPremium ? 'gold-text' : 'text-brand-yellow'}`}>{s.month}</span>
                    </div>
                    <div className="md:col-span-3">
                      <h3 className="text-xl font-bold uppercase leading-tight tracking-tight">{s.name}</h3>
                      <p className="text-brand-gray text-sm flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-brand-yellow" />{s.city}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm font-semibold">{s.dates}</p>
                      {isPremium && (
                        <p className="text-[10px] uppercase tracking-[0.2em] text-brand-champagne mt-1.5">
                          +{Math.round(s.premium * 100)}% premium
                        </p>
                      )}
                    </div>
                    <div className="md:col-span-4">
                      <p className="text-brand-gray text-sm leading-snug">{s.note}</p>
                    </div>
                    <div className="md:col-span-2 md:text-right">
                      <span className={`inline-block text-[9px] font-bold uppercase tracking-[0.2em] rounded-full px-3.5 py-2 ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
            <p data-anim style={anim} className="text-brand-gray text-sm mt-7 max-w-4xl leading-relaxed">
              Summit dates are as published by the organisers and are confirmed with them before anything is booked.
              Off-calendar builds are priced at a premium because outside a summit week nothing is shared — crew and
              freight travel for you alone, and the room has to be brought to the city rather than found in it.
            </p>
          </div>
        </section>

        {/* ── FORMATS ── */}
        <section id="formats" className="relative py-28 border-t border-brand-white/8 overflow-hidden">
          <div className="spill w-[34rem] h-[34rem] -left-48 top-1/4 opacity-45" />
          <div className="relative max-w-7xl mx-auto px-6 sm:px-8">
            <div data-anim style={anim} className="max-w-3xl mb-14">
              <Eyebrow>What we build</Eyebrow>
              <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tight leading-[1.02] mb-5">
                A proven format,<br /><span className="gold-text">not a blank page.</span>
              </h2>
              <p className="text-brand-gray text-lg leading-relaxed">
                We have built and run this many times over, which is why we can tell you exactly what it includes,
                what it does not, and how much notice it needs before you have signed anything.
                {SHOW_INVESTMENT && ' The fee is fixed for the format as specified — no surprises once the brief is agreed.'}
              </p>
            </div>
            {FORMATS.length === 1 ? (
              <FormatFeature f={FORMATS[0]} selected={brief.format === FORMATS[0].id} onSelect={selectFormat} />
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {FORMATS.map((f, i) => (
                  <FormatCard key={f.id} f={f} delay={i * 60} selected={brief.format === f.id} onSelect={selectFormat} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── THE ROOM ── */}
        <section id="the-room" className="relative py-28 bg-brand-ink/70 border-t border-brand-white/8 overflow-hidden">
          <div className="spill w-[30rem] h-[30rem] right-0 bottom-20 opacity-45" />
          <div className="relative max-w-7xl mx-auto px-6 sm:px-8">
            <div data-anim style={anim} className="max-w-3xl mb-14">
              <Eyebrow>The guest list</Eyebrow>
              <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tight leading-[1.02] mb-5">
                The room<br /><span className="gold-text">is the product.</span>
              </h2>
              <p className="text-brand-gray text-lg leading-relaxed">
                Any agency can find you a venue. The reason to do this with NEXT.io is the guest list — and the fact
                that we will tell you afterwards how close we got to the one you asked for.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-16">
              {[
                [String(MAX_GUESTS), 'Guests at the largest room we build'],
                ['75%', 'Target C-level and head-of'],
                ['80%', 'Of your written guest criteria'],
                ['1', 'Host per event — always'],
              ].map(([n, l], i) => (
                <div key={l} data-anim style={{ ...anim, transitionDelay: `${i * 80}ms` }} className="glass lift px-6 py-9 rounded-3xl hover:border-brand-yellow/45">
                  <p className="text-5xl font-bold gold-text mb-3 leading-none tracking-tight">{n}</p>
                  <p className="text-brand-gray text-[10px] uppercase tracking-[0.2em] leading-snug">{l}</p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-5 gap-5 mb-16">
              {ROOM_STEPS.map((s, i) => {
                const Icon = s.icon
                return (
                  <div key={s.title} data-anim style={{ ...anim, transitionDelay: `${i * 80}ms` }} className="glass lift rounded-3xl p-7 hover:border-brand-yellow/45">
                    <div className="flex items-center gap-3 mb-5">
                      <span className="w-9 h-9 rounded-full bg-brand-yellow text-brand-dark font-bold text-sm flex items-center justify-center shrink-0">{i + 1}</span>
                      <Icon className="w-5 h-5 text-brand-yellow" />
                    </div>
                    <h3 className="font-bold uppercase text-lg mb-2.5 leading-tight tracking-tight">{s.title}</h3>
                    <p className="text-brand-gray text-sm leading-relaxed">{s.body}</p>
                  </div>
                )
              })}
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div data-anim style={anim} className="glass rounded-3xl p-9">
                <div className="flex items-center gap-3 mb-6">
                  <Eye className="w-5 h-5 text-brand-yellow" />
                  <h3 className="text-xl font-bold uppercase tracking-tight">What your report covers</h3>
                </div>
                <ul className="space-y-3">
                  {REPORT_IN.map((r) => (
                    <li key={r} className="flex gap-3 text-brand-white/90">
                      <CircleCheck className="w-5 h-5 text-brand-yellow shrink-0 mt-0.5" />{r}
                    </li>
                  ))}
                </ul>
              </div>
              <div data-anim style={{ ...anim, transitionDelay: '90ms' }} className="glass-gold rounded-3xl p-9">
                <div className="flex items-center gap-3 mb-6">
                  <Target className="w-5 h-5 text-brand-yellow" />
                  <h3 className="text-xl font-bold uppercase tracking-tight">What it does not cover</h3>
                </div>
                <p className="text-3xl font-bold gold-text leading-tight mb-4">Your pipeline.</p>
                <p className="text-brand-gray leading-relaxed">
                  We can tell you exactly who walked in, how senior they were, who they met and what they thought of
                  the evening. What that becomes commercially is yours to run — and we would rather say that now
                  than dress an attendance number up as revenue in three months’ time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" className="relative py-28 border-t border-brand-white/8 overflow-hidden">
          <div className="spill w-[36rem] h-[36rem] left-1/3 top-0 opacity-40" />
          <div className="relative max-w-7xl mx-auto px-6 sm:px-8">
            <div data-anim style={anim} className="max-w-3xl mb-16">
              <Eyebrow>The build</Eyebrow>
              <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tight leading-[1.02] mb-5">
                Brief to event<br /><span className="gold-text">in twelve weeks.</span>
              </h2>
              <p className="text-brand-gray text-lg leading-relaxed">
                Twelve weeks is the standard build for a first event; eight is usually enough if you have hosted with
                us before. Walk the track — every step says what we do and what we need from you.
              </p>
            </div>

            <div data-anim style={anim} className="mb-24">
              <Timeline />
            </div>

            <div data-anim style={anim} className="mb-24">
              <h3 className="text-2xl md:text-4xl font-bold uppercase mb-4 tracking-tight">What you get back, and how fast</h3>
              <p className="text-brand-gray mb-9 max-w-3xl leading-relaxed">
                Waiting three weeks for a number is what kills these conversations. These are working days, from the
                point we have what we have asked you for.
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                {RESPONSE.map((r, i) => (
                  <div key={r.t} data-anim style={{ ...anim, transitionDelay: `${i * 80}ms` }} className="glass-gold lift rounded-3xl p-7">
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-5xl font-bold gold-text leading-none">{r.d}</span>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-brand-gray">working {r.d === '1' ? 'day' : 'days'}</span>
                    </div>
                    <h4 className="font-bold uppercase mb-2.5 leading-tight tracking-tight">{r.t}</h4>
                    <p className="text-brand-gray text-sm leading-relaxed">{r.b}</p>
                  </div>
                ))}
              </div>
            </div>

            <div data-anim style={anim}>
              <h3 className="text-2xl md:text-4xl font-bold uppercase mb-4 tracking-tight">How we work with you</h3>
              <p className="text-brand-gray mb-9 max-w-3xl leading-relaxed">
                The rules below exist because they keep events profitable for you and deliverable for us. None of them
                are negotiable at the last minute, which is the whole point of writing them here.
              </p>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                {TERMS.map((t, i) => {
                  const Icon = t.icon
                  return (
                    <div key={t.t} data-anim style={{ ...anim, transitionDelay: `${(i % 3) * 80}ms` }} className="glass lift rounded-3xl p-8 hover:border-brand-yellow/45">
                      <Icon className="w-5 h-5 text-brand-yellow mb-5" />
                      <h4 className="text-lg font-bold uppercase mb-2.5 leading-tight tracking-tight">{t.t}</h4>
                      <p className="text-brand-gray text-sm leading-relaxed">{t.b}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── BRIEF BUILDER ── */}
        <section id="brief" className="relative py-28 bg-brand-ink/70 border-t border-brand-white/8 overflow-hidden">
          <div className="spill w-[32rem] h-[32rem] -right-32 top-10 opacity-50" />
          <div className="relative max-w-7xl mx-auto px-6 sm:px-8">
            <div data-anim style={anim} className="max-w-3xl mb-14">
              <Eyebrow>Start here</Eyebrow>
              <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tight leading-[1.02] mb-5">
                Build<br /><span className="gold-text">your brief.</span>
              </h2>
              <p className="text-brand-gray text-lg leading-relaxed">
                Three choices and you have something to send us. It is not a booking — it is the first two emails,
                already written.
              </p>
            </div>
            <BriefBuilder brief={brief} setBrief={setBrief} />
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="relative py-28 border-t border-brand-white/8">
          <div className="max-w-4xl mx-auto px-6 sm:px-8">
            <div data-anim style={anim} className="mb-12">
              <Eyebrow>Before you ask</Eyebrow>
              <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tight leading-[1.02] mb-5">
                Straight <span className="gold-text">answers.</span>
              </h2>
              <p className="text-brand-gray text-lg">The questions that come up in the first call, answered before it.</p>
            </div>
            <div className="space-y-3">
              {FAQS.map((f, i) => (
                <div key={f.q} data-anim style={{ ...anim, transitionDelay: `${i * 60}ms` }} className={`rounded-3xl overflow-hidden transition-colors ${openFaq === i ? 'glass-gold' : 'glass'}`}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between gap-4 text-left p-7 hover:text-brand-yellow transition-colors"
                    aria-expanded={openFaq === i}
                  >
                    <span className="font-bold text-lg leading-snug">{f.q}</span>
                    <ChevronDown className={`w-5 h-5 shrink-0 text-brand-yellow transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === i && <p className="px-7 pb-7 -mt-1 text-brand-gray leading-relaxed fade-up">{f.a}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="relative py-32 border-t border-brand-white/8 overflow-hidden">
          <div className="spill w-[40rem] h-[40rem] left-1/2 -translate-x-1/2 top-0 opacity-60 shimmer" />
          <div className="relative max-w-5xl mx-auto px-6 sm:px-8 text-center">
            <div data-anim style={anim}>
              <Sparkles className="w-7 h-7 text-brand-yellow mx-auto mb-7" />
              <h2 className="text-4xl md:text-7xl font-bold uppercase tracking-[-0.03em] mb-7 leading-[0.95]">
                Five slots.<br /><span className="gold-text">One of them is yours.</span>
              </h2>
              <p className="text-brand-gray text-lg max-w-2xl mx-auto mb-11 leading-relaxed">
                Tell us the occasion, the format and roughly how many people you want in the room. You will hear back
                from a named person inside one working day.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href="#brief" className="bg-brand-yellow text-brand-dark px-9 py-4 rounded-full font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-brand-champagne transition-colors flex items-center gap-2 shadow-[0_18px_50px_-18px_rgba(255,207,51,0.8)]">
                  Build your brief <ArrowRight className="w-4 h-4" />
                </a>
                <a href="mailto:sales@next.io?subject=NEXT.io External Projects 2027 - Event Enquiry" className="border border-brand-white/20 px-9 py-4 rounded-full font-bold text-[11px] uppercase tracking-[0.2em] hover:border-brand-yellow hover:text-brand-yellow transition-colors flex items-center gap-2">
                  <Mail className="w-4 h-4" /> sales@next.io
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-brand-white/8 py-14">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <img alt="NEXT.io" className="h-7 object-contain" src={`${base}logos/next-io.png`} />
            <span className="text-[10px] uppercase tracking-[0.3em] text-brand-gray border-l border-brand-white/20 pl-3">
              External Projects 2027
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <a href="mailto:sales@next.io" className="flex items-center gap-2 text-brand-gray hover:text-brand-yellow transition-colors">
              <Mail className="w-4 h-4" /> sales@next.io
            </a>
            <a href="https://next.io" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-brand-gray hover:text-brand-yellow transition-colors">
              <Globe className="w-4 h-4" /> next.io
            </a>
            <button onClick={downloadBrochurePDF} className="flex items-center gap-2 text-brand-gray hover:text-brand-yellow transition-colors">
              <Download className="w-4 h-4" /> Print the brochure
            </button>
          </div>
        </div>
        <p className="max-w-7xl mx-auto px-6 sm:px-8 text-brand-gray/70 text-xs mt-9 leading-relaxed">
          {SHOW_INVESTMENT && 'Fees cover the format as specified and exclude VAT. Guest numbers, cities and dates beyond the scope set out here are quoted on the brief. '}
          Summit dates are as published by the organisers and are confirmed before anything is booked. Availability subject to change.
        </p>
      </footer>
    </div>
  )
}
