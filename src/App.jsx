import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Mail, Globe, CalendarDays, MapPin, Users, Sparkles, CircleCheck, Download,
  ArrowRight, ArrowLeft, Clock, ShieldCheck, FileText, Wine, Building2,
  Check, Target, Send, Ban, ClipboardList, Presentation,
  BadgeCheck, Crown, Route, Gauge, UserCheck, Eye, ChevronDown, Menu, X,
} from 'lucide-react'
import { PresentMode, usePresent, CopyLinkButton, QUIET_ACTION } from './PresentMode.jsx'

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

// The line that travels with a format's entry figure wherever it is quoted in short:
// for a fee, the guests it covers and the room ceiling together (CLAUDE.md - one
// without the other either caps the sale or gives the build away). The printed
// brochure and the first-screen panel both read it, so they cannot drift apart.
const feeScope = (f) => (f.fee != null
  ? `A fixed fee covering up to ${f.feeCovers} guests · rooms to ${f.max} quoted on the brief`
  : `${f.min} guests to ${f.max} guests · about €${f.perGuest} a guest either way`)

// House rule: NEXT.io and NEXTPredict keep their own casing, even inside a heading
// that CSS sets in capitals (never NEXT.IO). Wrap data strings that render uppercase.
const brandCase = (s) => String(s).split(/(NEXT\.io|NEXTPredict)/).map((part, i) =>
  (i % 2 ? <span key={i} className="normal-case">{part}</span> : part))

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
    note: 'The year opens here. Anything at ICE is sold and built during 2026, so briefs want to be with us by October.',
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
    note: 'Rome is one of the five cities where we have already delivered partner-hosted events. Edition dates are not published yet: register interest and we will come back to you the day they are.',
  },
  {
    id: 'offcal',
    name: 'Off-Calendar',
    city: 'Your city, your date',
    dates: 'Wrapped around yours',
    month: 'ANY',
    status: 'premium',
    premium: 0.3,
    note: 'Already have a date, a city or an occasion of your own? We wrap the whole operation around it. Away from a summit week nothing is shared (crew, freight, venue and guest travel are all built from scratch), so it carries a premium.',
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
      'Your branding across the space: entrance, bar, backdrop, screens',
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
  { d: '5', t: 'Full proposal', b: 'Venues, scope, costs and timeline, once we have everything we asked for.' },
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
    a: 'During a summit week the industry is already in one city, so crew, freight and venue costs are shared across several events and your guests are a taxi ride away. Take the same event to your own city on your own date and none of that is shared: the crew flies in for you alone, and the guest list has to be flown in rather than intercepted. That is what the premium pays for.',
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
    a: 'You get the real numbers. The post-event report shows registered against attended and the seniority mix you actually got. If we missed the brief, the report says so. That is the point of measuring it.',
  },
  {
    q: 'How quickly can you turn one around?',
    a: 'The reception needs eight to twelve weeks depending on the build. If you have hosted with us before, eight weeks is usually enough because we already know how you work.',
  },
]

// ─── Page copy shared with Present mode ─────────────────────────────────────
// Section heads (eyebrow, the white half of the headline, the gold half, lede),
// the figures and the footnotes, read by the page and by the deck, so a slide
// never re-types a figure and never drifts from the section it summarises. A
// lede given as a list is joined on the page; the deck may show its first line.
const HEADS = {
  hero: {
    eyebrow: 'External Projects · 2027',
    title: 'Your Event.', gold: 'Our Room.',
    lede: 'Partner-funded VIP events, built and run by NEXT.io alongside the summits your buyers already attend, or wrapped around a date and a city of your own. It carries your brand alone. We find the venue, build it, fill the room from our network, run it on the night, and tell you honestly who was there.',
  },
  whatItIs: {
    eyebrow: 'What this actually is',
    title: 'Not a sponsorship.', gold: 'A room of your own.',
    lede: 'No logo on someone else’s banner. An event of your own, in a city where the industry has already booked its flights, run end to end by the team that runs the NEXT.io summits.',
  },
  formats: {
    eyebrow: 'What we build',
    title: 'A proven format,', gold: 'not a blank page.',
    lede: [
      'We have built and run this many times over, which is why we can tell you exactly what it includes, what it does not, and how much notice it needs before you have signed anything.',
      SHOW_INVESTMENT && 'The fee is fixed for the format as specified, so there are no surprises once the brief is agreed.',
    ],
  },
  calendar: {
    eyebrow: 'The 2027 calendar',
    title: 'Five slots.', gold: 'Three of them dated.',
    lede: 'Planned against the summits rather than invented on request. Pick the week your buyers are already travelling to, or take the fifth option and we build it around a date of your own.',
  },
  room: {
    eyebrow: 'The guest list',
    title: 'The room', gold: 'is the product.',
    lede: 'Any agency can find you a venue. The reason to do this with NEXT.io is the guest list, and the fact that we will tell you afterwards how close we got to the one you asked for.',
  },
  build: {
    eyebrow: 'The build',
    title: 'Brief to event', gold: 'in twelve weeks.',
    lede: [
      'Twelve weeks is the standard build for a first event; eight is usually enough if you have hosted with us before.',
      'Walk the track: every step says what we do and what we need from you.',
    ],
  },
  response: {
    title: 'What you get back, and how fast',
    lede: 'Waiting three weeks for a number is what kills these conversations. These are working days, from the point we have what we have asked you for.',
  },
  terms: {
    title: 'How we work with you',
    lede: 'The rules below exist because they keep events profitable for you and deliverable for us. None of them are negotiable at the last minute, which is the whole point of writing them here.',
  },
  brief: {
    eyebrow: 'Start here',
    title: 'Build', gold: 'your brief.',
    lede: 'Three choices and you have something to send us. It is not a booking. It is the first two emails, already written.',
  },
  faq: {
    eyebrow: 'Before you ask',
    title: 'Straight', gold: 'answers.',
    lede: 'The questions that come up in the first call, answered before it.',
  },
  cta: {
    title: 'Five slots.', gold: 'One of them is yours.',
    lede: 'Tell us the occasion, the format and roughly how many people you want in the room. You will hear back from a named person inside one working day.',
  },
}
const ledeText = (lede) => [].concat(lede).filter(Boolean).join(' ')

// You host / we build and run / we fill the room.
const PILLARS = [
  { icon: Crown, t: 'You host it', b: 'It is your event, your brand and your guests. One host per event: no co-sponsors, no shared billing and no competitor standing in the same room.' },
  { icon: Building2, t: 'We build and run it', b: 'Venue, food and drink, production, branding, staffing and on-site management. NEXT.io is the organiser of record and carries the operational risk.' },
  { icon: Users, t: 'We fill the room', b: 'The guest list comes out of the NEXT.io network and is built against your written brief, then invited, chased and managed on the door.' },
]

// Track record. The 800+ is the founders' lifetime output since Events by Martin;
// the 13 and the 5 are partner-hosted events since 2024. TrackRecordNote keeps
// the two apart wherever the figures appear (CLAUDE.md - never merge or round).
const TRACK_RECORD = [
  ['800+', 'Events delivered worldwide since Events by Martin'],
  ['13', 'Partner-hosted events delivered since 2024'],
  ['5', 'Host cities across Europe and the US'],
  ['75%', 'Target C-level and head-of'],
]

// The hero's headline figures and the room's; the guest ceiling is MAX_GUESTS.
const HERO_CHIPS = [
  [CalendarDays, 'Five slots in 2027'],
  [Crown, 'One host per event'],
  [Users, `Up to ${MAX_GUESTS} curated guests`],
  [BadgeCheck, '75% C-level target'],
]
const ROOM_STATS = [
  [String(MAX_GUESTS), 'Guests at the largest room we build'],
  ['75%', 'Target C-level and head-of'],
  ['80%', 'Of your written guest criteria'],
  ['1', 'Host per event, always'],
]

// The report: what it covers is REPORT_IN; what it does not is this.
const PIPELINE = {
  title: 'What it does not cover',
  big: 'Your pipeline.',
  body: 'We can tell you exactly who walked in, how senior they were, who they met and what they thought of the evening. What that becomes commercially is yours to run, and we would rather say that now than dress an attendance number up as revenue in three months’ time.',
}
const REPORT_TITLE = 'What your report covers'

// The calendar footnote: the first line is about summit dates, the second about
// the off-calendar premium. The page prints both; a slot slide prints the one
// that applies to it.
const CALENDAR_NOTES = [
  'Summit dates are as published by the organisers and are confirmed with them before anything is booked.',
  'Off-calendar builds are priced at a premium because outside a summit week nothing is shared: crew and freight travel for you alone, and the room has to be brought to the city rather than found in it.',
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
  ].filter((l) => l != null) // drop the conditional lines, keep the blank ones
  return `mailto:sales@next.io?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\r\n'))}`
}

// ─── Brief link ───────────────────────────────────────────────────────────
// "Copy brief link" sends the brief as it stands: this page plus
// ?plan=<slot id>,<format id>~<guests>#brief, e.g. ?plan=sbc,reception~120#brief.
// On load App restores it through the page's own setters (the occasion, the
// format, then the guest count fitted to the slider), skips anything it does
// not recognise, and drops the parameter from the address bar.
const guestStep = (f) => (f.max - f.min > 60 ? 10 : 5)
const fitGuests = (f, n) => {
  const step = guestStep(f)
  const snapped = f.min + Math.round((n - f.min) / step) * step
  return Math.min(f.max, Math.max(f.min, snapped))
}
function briefLink(brief) {
  const url = new URL(window.location.href)
  const params = new URLSearchParams(url.search)
  params.delete('present')
  params.delete('plan')
  const plan = [brief.summit, brief.format && `${brief.format}~${brief.guests}`].filter(Boolean).join(',')
  const rest = params.toString()
  // ids are plain lower-case words, so the list stays readable (no %2C)
  url.search = [rest, plan && `plan=${plan}`].filter(Boolean).join('&')
  url.hash = 'brief'
  return url.href
}
function readPlanParam() {
  try {
    const p = new URLSearchParams(window.location.search).get('plan')
    return p == null ? null : p.split(',').map((t) => t.trim()).filter(Boolean)
  } catch { return null }
}
function dropPlanParam() {
  try {
    const url = new URL(window.location.href)
    url.searchParams.delete('plan')
    window.history.replaceState(window.history.state, '', url)
  } catch { /* no URL access: nothing to tidy */ }
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
    .logo .io{text-transform:none}
    .sub{color:#999;font-size:13px;margin-top:6px}
    .body{padding:36px 48px}
    .label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#999;margin:28px 0 12px}
    .label:first-child{margin-top:0}
    table{width:100%;border-collapse:collapse}
    th{text-align:left;padding:11px 16px;background:#f6f6f6;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#777;width:190px;border-bottom:1px solid #e8e8e8;vertical-align:top}
    td{padding:11px 16px;border-bottom:1px solid #e8e8e8;font-weight:600}
    ul{padding-left:18px;margin-top:4px}
    li{margin-bottom:4px}
    ul.out li{color:#6b6b6b}
    .two{display:flex;gap:32px}
    .two>div{flex:1}
    .fill{border:1px dashed #c9c9c9;border-radius:6px;padding:14px 16px;min-height:88px;color:#aaa;font-style:italic}
    .foot{padding:26px 48px 40px;border-top:3px solid #ffcf33;margin-top:34px;color:#666;font-size:11.5px;line-height:1.75}
    .foot strong{color:#1a1a1a}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body>
  <div class="header">
    <div class="logo">NEXT<span class="io">.io</span> External Projects <span>2027</span></div>
    <div class="sub">Outline Event Brief &nbsp;&middot;&nbsp; Prepared ${date}</div>
  </div>
  <div class="body">
    <div class="label">The event</div>
    <table>
      ${row('Occasion', smt ? (smt.id === 'offcal' ? 'Off-calendar: your own city and date' : `${smt.name} · ${smt.city}`) : 'To be discussed')}
      ${row('Dates', smt ? smt.dates : 'To be discussed')}
      ${row('Format', fmt ? fmt.name : 'To be discussed')}
      ${row('Guest numbers', fmt ? `approx. ${brief.guests} · the room runs ${fmt.min} to ${fmt.max}` : 'To be discussed')}
      ${row('Minimum lead time', fmt ? fmt.notice : '8–16 weeks depending on format')}
      ${SHOW_INVESTMENT ? row(fmt && fmt.fee != null ? `Fee, covering ${fmt.feeCovers} guests` : fmt ? `Indicative at ${brief.guests} guests` : 'Investment', est ? fmtBand(est, fmt) : 'Quoted on brief') : ''}
      ${SHOW_INVESTMENT && fmt && overCount(fmt, brief.guests) ? row('Guests beyond the fee', `${overCount(fmt, brief.guests)} - catering quoted on the brief`) : ''}
      ${SHOW_INVESTMENT && premium ? row('Off-calendar premium', `Included: +${Math.round(premium * 100)}% for a build outside a summit week`) : ''}
      ${row('Exclusivity', 'One host per event, no co-sponsors')}
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
    const scale = SHOW_INVESTMENT && lo != null ? `<div class="scale">${esc(feeScope(f))}</div>` : ''
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
    .cover h1 .io{text-transform:none}
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
    ul.out li{color:#6b6b6b}
    ol{padding-left:18px}
    ol li{margin-bottom:6px}
    .foot{padding:24px 48px 40px;border-top:3px solid #ffcf33;margin-top:24px;color:#666;font-size:11px;line-height:1.75}
    .foot strong{color:#1a1a1a}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body>
  <div class="cover">
    <h1>NEXT<span class="io">.io</span> External Projects <span>2027</span></h1>
    <div class="tag">Your event. Our room.</div>
    <p>Partner-funded VIP events, built and run by NEXT.io alongside the summits your buyers already attend, or wrapped around a date and a city of your own. You host it and it carries your brand alone. We find the venue, build it, fill the room from our network, run it on the night and report on who was actually there.</p>
  </div>
  <section><h2>The 2027 calendar</h2><table>${cal}</table>
  <p class="mut">Summit dates are as published by the organisers and are confirmed with them before anything is booked. Off-calendar builds carry a premium of around ${Math.round((SUMMITS.find((s) => s.id === 'offcal').premium) * 100)}%, because outside a summit week nothing (crew, freight, venue or guest travel) is shared with another event.</p></section>
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
    ${SHOW_INVESTMENT ? `The Drinks Reception fee is fixed for the format as specified and covers up to ${FORMATS[0].feeCovers} guests. It excludes VAT. Larger rooms (we build up to ${MAX_GUESTS}), additional catering and anything outside the specification are quoted against your brief.<br>` : ''}
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

// ─── Calendar date tile ───────────────────────────────────────────────────
// Month over day range, like a calendar leaf. The day range is read from the
// display string, so SUMMITS stays the one source of truth for dates and both
// printables keep reading the same fields. Undated slots fall back to a word.
const dayRange = (s) => {
  const m = /^(\d{1,2}(?:\s*[–-]\s*\d{1,2})?)\s+[A-Za-z]+\s+\d{4}$/.exec(s.dates)
  return m ? m[1].replace(/\s*[–-]\s*/, '–') : null
}

// Three sizes: `compact` is the small leaf in the first-screen panel, `large`
// the leaf on a slot's slide in Present mode.
const TILE = {
  compact: { box: 'w-12 sm:w-full rounded-xl', head: 'py-1 pl-[0.2em] text-[9px] tracking-[0.2em]', body: 'h-8 sm:h-10', days: 'text-[13px] sm:text-lg', word: 'text-[10px] sm:text-xs' },
  default: { box: 'w-[4.5rem] sm:w-24 rounded-2xl', head: 'py-1.5 pl-[0.25em] text-[10px] tracking-[0.25em]', body: 'h-11 sm:h-14', days: 'text-lg sm:text-2xl', word: 'text-[13px] sm:text-base' },
  large: { box: 'w-20 sm:w-32 rounded-3xl', head: 'py-2 pl-[0.25em] text-[11px] sm:text-xs tracking-[0.25em]', body: 'h-14 sm:h-20', days: 'text-2xl sm:text-4xl', word: 'text-base sm:text-xl' },
}
function DateTile({ s, chosen, size = 'default' }) {
  const days = dayRange(s)
  const premium = s.premium > 0
  const t = TILE[size]
  return (
    <span
      aria-hidden="true"
      className={`flex flex-col shrink-0 overflow-hidden border text-center transition-colors duration-300 ${t.box} ${
        chosen ? 'border-brand-yellow/70' : premium ? 'border-brand-yellow/35' : 'border-brand-white/10 group-hover:border-brand-yellow/40'
      } ${premium ? 'bg-brand-yellow/[0.06]' : 'bg-brand-dark/60'}`}
    >
      <span className={`block font-bold uppercase text-brand-yellow bg-brand-yellow/10 border-b border-brand-yellow/15 ${t.head}`}>
        {s.month}
      </span>
      <span
        className={`flex items-center justify-center font-bold leading-none ${t.body} ${
          days
            ? `${t.days} tabular-nums tracking-tight text-brand-white`
            : `${t.word} uppercase tracking-[0.08em] pl-[0.08em] ${premium ? 'gold-text' : 'text-brand-white/75'}`
        }`}
      >
        {days || (s.status === 'tbc' ? 'TBC' : 'Date')}
      </span>
    </span>
  )
}

// ─── Section eyebrow ──────────────────────────────────────────────────────
function Eyebrow({ children }) {
  return (
    <div className="mb-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-brand-yellow/90 mb-3">{children}</p>
      <div className="gold-rule w-28" />
    </div>
  )
}

// ─── Section head ─────────────────────────────────────────────────────────
// The two-tone headline and the section intro, read from HEADS by the page and
// by Present mode. `inline` keeps the gold half on the same line where it fits
// instead of after a break.
const HEADLINE = 'text-4xl md:text-6xl font-bold uppercase tracking-tight leading-[1.02] mb-5'
function Headline({ head, as: Tag = 'h2', className = HEADLINE, inline = false }) {
  return (
    <Tag className={className}>
      {head.title}{inline ? ' ' : <br />}<span className="gold-text">{head.gold}</span>
    </Tag>
  )
}
function SectionHead({ head, className = 'max-w-3xl mb-14' }) {
  return (
    <div data-anim style={anim} className={className}>
      <Eyebrow>{head.eyebrow}</Eyebrow>
      <Headline head={head} />
      <p className="text-brand-gray text-lg leading-relaxed">{ledeText(head.lede)}</p>
    </div>
  )
}

// The line that keeps the founders' lifetime 800+ apart from the 13
// partner-hosted events since 2024 (CLAUDE.md). The page and the Track record
// slide both print it, word for word.
function TrackRecordNote(props) {
  return (
    <p {...props}>
      The founders of Events by Martin have produced more than 800 events around the world across two decades,
      a track record that became NEXT.io and now NEXTPredict. The thirteen above are the partner-hosted events
      we have delivered since 2024: Rome, Barcelona, Malta, London and SBC Summit Americas in Florida. Our
      longest-standing host has run seven of them with us across four cities. That is the number we would
      rather be judged on than any of the others.
    </p>
  )
}

// ─── Format photography crop ─────────────────────────────────────────────
// The Valletta 2025 photography has a sponsor bar burned into the bottom sixth
// of the frame (it starts at y=1429 of 1707, 83.7%), which put a partner's logo
// under the format title. The image is sized to 140% of its panel and lifted by
// 14%, so the panel shows roughly 10%-81% of the frame at any aspect ratio: the
// bar never shows and less of the empty night sky does.
const PHOTO_CROP = '-top-[14%] h-[140%] object-cover'

// ─── Format investment ────────────────────────────────────────────────────
// The format's price block: the fee with the guests it covers and the room
// ceiling in one sentence (CLAUDE.md: never one without the other), or the
// guest-scaled figures for a format priced that way. The feature card, the grid
// card and the format's slide in Present mode all print this, so the rule
// travels with the fee. Nothing renders when SHOW_INVESTMENT is false.
const INVEST_SIZE = {
  card: { fig: 'text-3xl', note: 'text-[11px]' },
  feature: { fig: 'text-4xl', note: 'text-[11px] max-w-md' },
  slide: { fig: 'text-5xl sm:text-6xl tracking-tight', note: 'text-sm sm:text-[15px] max-w-lg' },
}
function FormatInvestment({ f, size = 'card', className = '' }) {
  if (!SHOW_INVESTMENT) return null
  const entry = indicative(f, f.min)
  const z = INVEST_SIZE[size]
  return (
    <div className={className}>
      <p className="text-[10px] uppercase tracking-[0.25em] text-brand-gray mb-2">{f.fee != null ? 'Investment' : 'Indicative investment'}</p>
      {entry == null ? (
        <>
          <p className={`${z.fig} font-bold gold-text leading-none`}>Quoted on brief</p>
          <p className={`${z.note} text-brand-gray mt-2.5`}>{f.duration} · scoped before it is priced</p>
        </>
      ) : (
        <>
          <p className={`${z.fig} font-bold gold-text leading-none`}>{fmtPrice(roundTo(entry, 1000))}</p>
          <p className={`${z.note} text-brand-gray mt-2.5 leading-relaxed`}>
            {f.fee != null
              ? <>A fixed fee for the format as specified, covering up to <span className="text-brand-white font-semibold">{f.feeCovers} guests</span>. We build rooms up to {f.max}, and anything above {f.feeCovers} is quoted on the brief.</>
              : <>at {f.min} guests, then about <span className="text-brand-white font-semibold">{fmtPrice(f.perGuest)} a guest</span> on top, roughly {fmtPrice(roundTo(indicative(f, f.max), 1000))} at {f.max}.</>}
          </p>
        </>
      )}
    </div>
  )
}

// A card's quiet "Present" action: opens the deck on this card's slide. It sits
// beside Copy link and never competes with the price or Add to brief.
function PresentAction({ onClick, label = 'Present', className = QUIET_ACTION }) {
  return (
    <button
      type="button"
      title="Present this in a full-screen walk-through"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick() }}
      className={className}
    >
      <Presentation className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />{label}
    </button>
  )
}

// Product slides use the card anchor as their id, so ?present=formats and
// #formats agree. A second format would get a family slide and its own anchor.
const formatSlideId = (f) => (FORMATS.length === 1 ? 'formats' : `format-${f.id}`)

// ─── Featured format ──────────────────────────────────────────────────────
// Used when the card carries a single approved format: a full-width spread
// rather than one portrait card stranded in a grid. FormatCard's grid layout
// is kept for the day a second format is approved.
function FormatFeature({ f, onSelect, selected, onPresent }) {
  const Icon = f.icon

  return (
    <div
      data-anim
      style={anim}
      className={`rounded-[2rem] overflow-hidden grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] ${
        selected ? 'glass-gold' : 'glass'
      }`}
    >
      {/* Photography */}
      <div className="relative min-h-[19rem] lg:min-h-[34rem] overflow-hidden">
        <img alt={f.name} src={`${base}images/${f.img}`} className={`absolute inset-x-0 w-full ${PHOTO_CROP} opacity-90`} />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/50 to-brand-dark/5" />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-yellow/12 via-transparent to-transparent" />
        <div className="hidden lg:block absolute inset-y-0 right-0 w-36 bg-gradient-to-r from-transparent to-brand-dark/95" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 lg:p-10">
          <div className="flex items-center gap-3 mb-2">
            <Icon className="w-7 h-7 text-brand-yellow shrink-0" />
            <h3 className="text-3xl md:text-4xl font-bold uppercase tracking-tight leading-[1.05]">{f.name}</h3>
          </div>
          <p className="text-brand-champagne/90 italic">{f.tagline}</p>
        </div>
      </div>

      {/* Detail */}
      <div className="p-6 sm:p-8 lg:p-10 flex flex-col">
        {/* A spec line rather than three pills: pills that wrap leave one stranded on
            a row of its own; a line of specs wraps like text. */}
        <ul className="flex flex-wrap gap-x-6 gap-y-2.5 pb-6 mb-6 border-b border-brand-white/8 text-[10px] uppercase tracking-[0.14em] font-bold text-brand-white/85">
          {[[Users, f.guests], [Clock, f.notice], [Sparkles, f.duration]].map(([SpecIcon, t]) => (
            <li key={t} className="flex items-center gap-2 whitespace-nowrap">
              <SpecIcon className="w-3.5 h-3.5 text-brand-yellow shrink-0" />{t}
            </li>
          ))}
        </ul>

        <p className="text-brand-gray leading-relaxed mb-8">
          <span className="text-brand-white font-semibold">Best for: </span>{f.bestFor}
        </p>

        <p className="text-[10px] uppercase tracking-[0.25em] text-brand-gray mb-4">
          {f.fee != null ? 'What the fee covers' : 'What is included'}
        </p>
        {/* Newspaper columns: nine items read down then across, instead of a grid
            whose last row holds one item and an empty half. */}
        <ul className="sm:columns-2 gap-x-7 mb-8">
          {f.included.map((i) => (
            <li key={i} className="flex gap-2.5 text-sm text-brand-white/90 leading-snug mb-2.5 break-inside-avoid">
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
          <FormatInvestment f={f} size="feature" />

          {/* Add to brief, with the quiet Copy link and Present under it */}
          <div className={`flex flex-col gap-2 shrink-0 ${SHOW_INVESTMENT ? 'sm:items-end' : 'w-full'}`}>
            <button
              onClick={() => onSelect(f.id)}
              className={`shrink-0 rounded-full px-9 py-4 font-bold text-[11px] uppercase tracking-[0.2em] border transition-colors ${
                selected
                  ? 'bg-brand-yellow border-brand-yellow text-brand-dark'
                  : 'border-brand-yellow/60 text-brand-yellow hover:bg-brand-yellow hover:text-brand-dark'
              } ${SHOW_INVESTMENT ? '' : 'w-full'}`}
            >
              {selected
                ? <span className="flex items-center justify-center gap-2"><CircleCheck className="w-4 h-4" />In your brief</span>
                : 'Add to brief'}
            </button>
            <div className="flex justify-center sm:justify-end -mb-2">
              <CopyLinkButton id="formats" title="Copy a link to this format" />
              <PresentAction onClick={() => onPresent(formatSlideId(f))} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Format card ──────────────────────────────────────────────────────────
function FormatCard({ f, onSelect, selected, delay, onPresent }) {
  const [open, setOpen] = useState(false)
  const Icon = f.icon

  return (
    <div
      id={`format-${f.id}`}
      data-anim
      style={{ ...anim, transitionDelay: `${delay}ms` }}
      className={`jump-target rounded-3xl overflow-hidden flex flex-col lift ${
        selected ? 'glass-gold' : 'glass hover:border-brand-yellow/45'
      }`}
    >
      <div className="relative h-56 shrink-0 overflow-hidden">
        <img alt={f.name} src={`${base}images/${f.img}`} className={`absolute inset-x-0 w-full ${PHOTO_CROP} opacity-85`} />
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

        <FormatInvestment f={f} size="card" className="mb-6 pb-6 border-b border-brand-white/10" />

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
        <div className="flex justify-center mt-2 -mb-2">
          <CopyLinkButton id={`format-${f.id}`} title="Copy a link to this format" />
          <PresentAction onClick={() => onPresent(formatSlideId(f))} />
        </div>
      </div>
    </div>
  )
}

// ─── Interactive twelve-week timeline ─────────────────────────────────────
function Timeline() {
  const [active, setActive] = useState(0)
  const last = TIMELINE.length - 1
  // The phone accordion can close every step (active = -1). The desktop rail and
  // panel, rendered but hidden on a phone, always show one step, so they read the
  // nearest valid index: TIMELINE[-1] threw and took the whole page down.
  const shown = Math.max(active, 0)
  const step = TIMELINE[shown]
  const pct = (shown / last) * 100

  const move = useCallback((delta) => {
    setActive((i) => Math.min(Math.max(Math.max(i, 0) + delta, 0), last))
  }, [last])

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(1) }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(-1) }
    if (e.key === 'Home') { e.preventDefault(); setActive(0) }
    if (e.key === 'End') { e.preventDefault(); setActive(last) }
  }

  const dotClass = (i) =>
    i === shown
      ? 'bg-brand-yellow scale-150 shadow-[0_0_0_4px_rgba(255,207,51,0.18),0_0_22px_rgba(255,207,51,0.85)]'
      : i < shown
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
              aria-selected={i === shown}
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              className="group flex flex-col items-center gap-4 cursor-pointer"
              style={{ flex: '0 0 auto' }}
            >
              <span className={`w-[18px] h-[18px] rounded-full transition-all duration-300 ${dotClass(i)}`} />
              <span
                className={`text-[10px] font-bold uppercase tracking-[0.18em] whitespace-nowrap transition-colors duration-300 ${
                  i === shown ? 'text-brand-yellow' : 'text-brand-gray group-hover:text-brand-white'
                }`}
              >
                {s.w}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Detail panel — desktop */}
      <div key={shown} className="hidden md:grid lg:grid-cols-12 gap-10 glass rounded-3xl p-10 min-h-[19rem] fade-up">
        <div className="lg:col-span-5 flex flex-col">
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-brand-yellow mb-3">{step.w}</p>
          <h3 className="text-3xl xl:text-4xl font-bold uppercase leading-[1.05] tracking-tight mb-4">{brandCase(step.t)}</h3>
          <p className="text-brand-gray leading-relaxed">{step.b}</p>

          <div className="flex items-center gap-4 mt-auto pt-8">
            <div className="flex gap-2">
              <button
                onClick={() => move(-1)}
                disabled={shown === 0}
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
              Step {shown + 1} of {TIMELINE.length}
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
                <p className="font-bold uppercase leading-tight">{brandCase(s.t)}</p>
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
function BriefBuilder({ brief, setBrief, chooseSummit, chooseFormat }) {
  const fmt = FORMATS.find((f) => f.id === brief.format)

  // Keep the guest count if it still fits the newly chosen format; otherwise
  // drop to that format's typical size rather than pinning to its floor.
  useEffect(() => {
    if (!fmt) return
    setBrief((b) => ({
      ...b,
      guests: b.guests >= fmt.min && b.guests <= fmt.max ? b.guests : fmt.def,
    }))
  }, [brief.format]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-6">
        <div data-anim style={anim} className="glass rounded-3xl p-7">
          <p className="text-[10px] uppercase tracking-[0.3em] text-brand-gray mb-5">1 · The occasion</p>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {SUMMITS.map((s) => (
              <button
                key={s.id}
                onClick={() => chooseSummit(s.id)}
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
                  onClick={() => chooseFormat(f.id)}
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
                step={guestStep(fmt)}
                value={brief.guests}
                onChange={(e) => setBrief((b) => ({ ...b, guests: Number(e.target.value) }))}
                className="w-full h-10 cursor-pointer accent-[#ffcf33]"
                aria-label="Approximate guest numbers"
              />
              <div className="flex justify-between text-[10px] uppercase tracking-[0.2em] text-brand-gray mt-1">
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
        <BriefSummary
          brief={brief}
          data-anim
          style={anim}
          className="glass-gold rounded-3xl p-7 lg:sticky lg:top-[calc(var(--nav-h,70px)+1.5rem)]"
        />
      </div>
    </div>
  )
}

// ─── Brief summary ────────────────────────────────────────────────────────
// "Your outline brief": the choices so far, the fee with what it covers, the
// guests beyond it, the off-calendar premium, then send, print and copy a link.
// The brief builder and the Your brief slide in Present mode both render this.
function BriefSummary({ brief, className = 'glass-gold rounded-3xl p-7', copyClass = QUIET_ACTION, ...rest }) {
  const fmt = FORMATS.find((f) => f.id === brief.format)
  const smt = SUMMITS.find((s) => s.id === brief.summit)
  const premium = smt?.premium || 0
  const est = fmt ? indicative(fmt, brief.guests, premium) : null
  const ready = Boolean(brief.summit && brief.format)
  const started = Boolean(brief.summit || brief.format)
  // Before a format is picked, the small print follows the formats on offer:
  // each one carries a fixed fee today, so it must not read as a moving estimate.
  const feeTerms = fmt ? fmt.fee != null : FORMATS.every((f) => f.fee != null)

  return (
    <div className={className} {...rest}>
      <p className="text-[10px] uppercase tracking-[0.3em] text-brand-gray mb-6">Your outline brief</p>

      <dl className="space-y-4 mb-6">
        {[
          ['Occasion', smt ? smt.name : 'Not chosen yet'],
          ['Where / when', smt ? `${smt.city} · ${smt.dates}` : '–'],
          ['Format', fmt ? fmt.name : 'Not chosen yet'],
          ['Guests', fmt ? `approx. ${brief.guests}` : '–'],
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
          <p className={`text-2xl font-bold leading-tight ${fmt ? 'gold-text' : 'text-brand-gray/60'}`}>
            {!fmt ? '–' : est == null ? 'Quoted on brief' : fmtBand(est, fmt)}
          </p>
          {fmt && overCount(fmt, brief.guests) > 0 && (
            <p className="text-[11px] text-brand-champagne mt-3 leading-relaxed">
              Plus {overCount(fmt, brief.guests)} guests beyond the {fmt.feeCovers} the fee covers. Catering for those is
              quoted against your brief, never added afterwards.
            </p>
          )}
          {premium > 0 && est != null && (
            <p className="text-[11px] text-brand-champagne mt-3 leading-relaxed">
              Includes the +{Math.round(premium * 100)}% off-calendar premium: outside a summit week, nothing is shared.
            </p>
          )}
          <p className="text-[11px] text-brand-gray mt-3 leading-relaxed">
            {feeTerms
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
      {started && (
        <div className="flex justify-center mt-2 -mb-2">
          <CopyLinkButton getLink={() => briefLink(brief)} label="Copy brief link" title="Copy a link that opens this brief, filled in" className={copyClass} />
        </div>
      )}
      <p className="text-[11px] text-brand-gray mt-5 leading-relaxed">
        Nothing here is a booking. It is a starting point that saves the first two emails.
      </p>
    </div>
  )
}

// ─── First-screen offer ───────────────────────────────────────────────────
// Stuart, 23 Sep 2026: "it's hard to find products when i have to scroll right
// down for them". The hero closes on what a host can book and what it costs, read
// from FORMATS and SUMMITS like the sections it summarises: the format links to
// #formats, each slot to its own calendar row (#slot-<id>). Wherever the fee shows,
// feeScope puts the guests it covers and the room ceiling beside it; the off-calendar
// slot carries its premium, as it does on the calendar. SHOW_INVESTMENT = false drops
// the fee and keeps the rest.
const SLOT_TONE = {
  open: 'text-brand-yellow',
  interest: 'text-brand-white/80',
  tbc: 'text-brand-gray',
  premium: 'text-brand-champagne',
}

// On the page every part is an anchor. On the Present mode cover (`onJump`) the
// same parts are buttons that move the deck to the format's or the slot's slide.
function HeroOffer({ onJump, className = 'mt-9 sm:mt-10' }) {
  const eyebrow = 'text-[10px] font-bold uppercase tracking-[0.3em] text-brand-yellow/90'
  // link text only; each use sets its own display
  const more = 'items-center gap-1.5 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.2em] text-brand-white group-hover:text-brand-yellow transition-colors'
  const jump = (to, page, cls, children, key) => (onJump
    ? <button key={key} type="button" onClick={() => onJump(to)} className={`${cls} text-left`}>{children}</button>
    : <a key={key} href={`#${page}`} className={cls}>{children}</a>)
  return (
    <div
      data-offer
      className={`${className} w-full text-left glass-gold rounded-[1.75rem] overflow-hidden shadow-[0_40px_90px_-40px_rgba(0,0,0,0.9)]`}
    >
      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="lg:border-r border-brand-yellow/15">
          {FORMATS.map((f, i) => {
            const Icon = f.icon
            const entry = indicative(f, f.min)
            return jump(
              formatSlideId(f),
              'formats',
              `group block w-full h-full p-6 sm:p-7 hover:bg-brand-yellow/[0.035] transition-colors ${i ? 'border-t border-brand-yellow/15' : ''}`,
              <>
                <span className="flex items-center justify-between gap-4 mb-3.5">
                  <span className={eyebrow}>What we build</span>
                  <span className={`inline-flex ${more}`}>
                    See the format <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </span>
                </span>
                <span className="flex items-center gap-2.5">
                  <Icon className="w-5 h-5 text-brand-yellow shrink-0" />
                  <span className="text-xl sm:text-2xl font-bold uppercase tracking-tight leading-none">{f.name}</span>
                </span>
                <span className="block mt-2.5 text-[10px] font-bold uppercase tracking-[0.14em] leading-relaxed text-brand-gray">
                  <span className="block sm:inline">{f.guests}</span>
                  <span className="hidden sm:inline"> · </span>
                  <span className="block sm:inline">{f.duration}</span>
                </span>
                {SHOW_INVESTMENT && (
                  <span className="mt-5 flex flex-wrap items-end gap-x-5 gap-y-2">
                    <span className="text-4xl sm:text-[2.75rem] font-bold gold-text leading-none tabular-nums tracking-tight">
                      {entry == null ? 'Quoted on brief' : fmtPrice(roundTo(entry, 1000))}
                    </span>
                    {entry != null && (
                      // broken at its " · " so neither clause splits across lines
                      <span className="text-xs leading-snug text-brand-white/75 pb-px">
                        {feeScope(f).split(' · ').map((part, j, all) => (
                          <span key={part} className="block">{part}{j < all.length - 1 ? ' ·' : ''}</span>
                        ))}
                      </span>
                    )}
                  </span>
                )}
              </>,
              f.id,
            )
          })}
        </div>

        <div className="p-6 sm:p-7 border-t lg:border-t-0 border-brand-yellow/15">
          <div className="flex items-center justify-between gap-4 mb-2 sm:mb-3.5">
            <p className={eyebrow}>The 2027 calendar</p>
            {jump('calendar', 'calendar', `group hidden sm:inline-flex min-h-11 -my-3.5 ${more}`, <>
              See the calendar <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </>)}
          </div>
          {/* A list on a phone, calendar leaves from sm up. The off-calendar slot
              states its premium in place of a status, as its calendar badge does. */}
          <ul className="grid sm:grid-cols-5 sm:gap-2.5">
            {SUMMITS.map((s) => (
              <li key={s.id} className="border-t border-brand-white/8 first:border-t-0 sm:border-0">
                {jump(`slot-${s.id}`, `slot-${s.id}`, 'group flex sm:flex-col items-center sm:items-stretch gap-3 sm:gap-2.5 w-full h-full min-h-11 py-1.5 sm:p-2.5 sm:rounded-2xl sm:border sm:border-brand-white/8 sm:bg-brand-dark/40 sm:hover:border-brand-yellow/45 transition-colors', <>
                  <span className="sm:hidden w-9 shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-yellow">{s.month}</span>
                  <span className="hidden sm:flex"><DateTile s={s} size="compact" /></span>
                  <span className="min-w-0 flex-1 flex sm:flex-col items-center sm:items-start justify-between gap-x-3 gap-y-1.5">
                    <span className="text-[13px] sm:text-xs font-bold leading-tight group-hover:text-brand-yellow transition-colors">{s.name}</span>
                    <span className={`sm:mt-auto text-[9px] font-bold uppercase tracking-[0.14em] leading-snug text-right sm:text-left tabular-nums ${SLOT_TONE[s.status]}`}>
                      {s.premium > 0 ? `+${Math.round(s.premium * 100)}%` : STATUS_STYLE[s.status].label}
                    </span>
                  </span>
                </>)}
              </li>
            ))}
          </ul>
          {jump('calendar', 'calendar', `group flex sm:hidden w-full justify-between min-h-11 border-t border-brand-white/8 ${more}`, <>
            See the calendar <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </>)}
        </div>
      </div>
    </div>
  )
}

// ─── Calendar row ─────────────────────────────────────────────────────────
// Agenda: date tile · summit and city · note · status. Fixed column widths so
// every row lines up like a table at desktop; on a phone the note and status
// drop under the tile and name. The whole row still starts a brief: its main
// button stretches over the row (after:inset-0), and the quiet Copy link and
// Present sit above that layer, so no button is nested in another.
function SlotRow({ s, i, chosen, onChoose, onPresent }) {
  const st = STATUS_STYLE[s.status]
  const isPremium = s.premium > 0
  return (
    <li id={`slot-${s.id}`} tabIndex={-1} className="jump-target outline-none">
      <div
        data-anim
        style={{ ...anim, transitionDelay: `${i * 70}ms` }}
        className={`group relative w-full text-left rounded-3xl p-5 sm:p-6 xl:px-7 lift grid grid-cols-[auto_minmax(0,1fr)] md:grid-cols-[auto_minmax(0,1fr)_12rem] xl:grid-cols-[auto_17rem_minmax(0,1fr)_12rem] gap-x-5 sm:gap-x-7 gap-y-4 md:gap-y-2 xl:gap-y-0 items-center ${
          chosen ? 'glass-gold shadow-[0_0_0_1px_rgba(255,207,51,0.5)]' : 'glass hover:border-brand-yellow/45'
        }`}
      >
        <span className="col-start-1 row-start-1 md:row-span-2 xl:row-span-1">
          <DateTile s={s} chosen={chosen} />
        </span>

        <span className="col-start-2 row-start-1 min-w-0 md:self-end xl:self-center">
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="text-lg sm:text-xl font-bold uppercase leading-tight tracking-tight">{s.name}</span>
            {isPremium && (
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] tabular-nums text-brand-champagne border border-brand-yellow/50 rounded-full px-2 py-0.5">
                +{Math.round(s.premium * 100)}%
              </span>
            )}
          </span>
          <span className="flex items-center gap-1.5 mt-1.5 text-sm text-brand-gray">
            <MapPin className="w-3.5 h-3.5 text-brand-yellow shrink-0" />{s.city}
          </span>
          <span className="sr-only">{s.dates}</span>
        </span>

        <span className="col-span-2 row-start-2 md:col-span-1 md:col-start-2 md:self-start xl:col-start-3 xl:row-start-1 xl:self-center">
          <span className="block text-brand-gray text-sm leading-relaxed">{s.note}</span>
          <span className="relative z-10 flex flex-wrap -ml-3 mt-1 -mb-2.5">
            <CopyLinkButton id={`slot-${s.id}`} title="Copy a link to this slot" />
            <PresentAction onClick={() => onPresent(`slot-${s.id}`)} />
          </span>
        </span>

        <span className="col-span-2 row-start-3 md:col-span-1 md:col-start-3 md:row-start-1 md:row-span-2 xl:col-start-4 xl:row-span-1 flex flex-wrap md:flex-nowrap md:flex-col items-center md:items-end justify-between gap-x-3 gap-y-2.5 pt-4 md:pt-0 border-t border-brand-white/8 md:border-0">
          <span className={`inline-flex items-center whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.2em] rounded-full px-3.5 py-2 ${st.cls}`}>
            {st.label}
          </span>
          <button
            type="button"
            onClick={onChoose}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.2em] transition-colors after:absolute after:inset-0 after:rounded-3xl after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand-yellow ${
              chosen ? 'text-brand-yellow' : 'text-brand-gray group-hover:text-brand-yellow'
            }`}
          >
            {chosen
              ? <><CircleCheck className="w-3.5 h-3.5" aria-hidden="true" />In your brief<span className="sr-only">: {s.name}</span></>
              : <>Start a brief<span className="sr-only"> for {s.name}</span><ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" /></>}
          </button>
        </span>
      </div>
    </li>
  )
}

// ─── Question ─────────────────────────────────────────────────────────────
// One of FAQS, opened in place. The page and the Straight answers slide both
// use it; `dense` is the slide's tighter version.
function FaqItem({ f, open, onToggle, dense = false, ...rest }) {
  return (
    <div className={`rounded-3xl overflow-hidden transition-colors ${open ? 'glass-gold' : 'glass'}`} {...rest}>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between gap-4 text-left hover:text-brand-yellow focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-yellow transition-colors ${dense ? 'min-h-11 px-5 py-4' : 'p-7'}`}
        aria-expanded={open}
      >
        <span className={`font-bold leading-snug ${dense ? 'text-base' : 'text-lg'}`}>{f.q}</span>
        <ChevronDown className={`w-5 h-5 shrink-0 text-brand-yellow transition-transform duration-300 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && <p className={`-mt-1 text-brand-gray leading-relaxed fade-up ${dense ? 'px-5 pb-5 text-[15px]' : 'px-7 pb-7'}`}>{f.a}</p>}
    </div>
  )
}

// ─── Site navigation ──────────────────────────────────────────────────────
// The purchase path (the format, the calendar, the brief) sits in the bar as the
// width allows; every section, and the brochure, sits in the menu, which is the
// whole nav on a phone. The section in view is marked (aria-current). App measures
// the bar into --nav-h, so anchored jumps land below it at every breakpoint.
const BAR_SHOW = { md: 'hidden md:block', lg: 'hidden lg:block', xl: 'hidden xl:block' }

function SiteNav({ navRef, links, activeId, onPresent }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus() } }
    const onDown = (e) => { if (!navRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open, navRef])

  return (
    <nav ref={navRef} aria-label="Brochure sections" className="fixed top-0 left-0 w-full z-50 bg-brand-dark/85 backdrop-blur-xl border-b border-brand-white/8">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 sm:py-4 flex justify-between items-center gap-3">
        <a href="#" className="flex items-center gap-3 shrink-0 min-h-10">
          <img alt="NEXT.io" className="h-7 sm:h-8 object-contain" src={`${base}logos/next-io.png`} />
          <span className="hidden sm:block md:hidden lg:block text-[10px] uppercase tracking-[0.3em] text-brand-gray border-l border-brand-white/20 pl-3 whitespace-nowrap">
            External Projects
          </span>
        </a>
        <div className="flex items-center gap-2 sm:gap-3">
          <ul className="hidden md:flex items-center">
            {links.filter((l) => l.bar).map(({ label, id, bar }) => (
              <li key={id} className={BAR_SHOW[bar]}>
                <a
                  href={`#${id}`}
                  aria-current={activeId === id ? 'true' : undefined}
                  className={`block px-3 xl:px-3.5 py-3 text-[11px] font-bold uppercase tracking-[0.2em] whitespace-nowrap transition-colors ${
                    activeId === id ? 'text-brand-yellow' : 'text-brand-white hover:text-brand-yellow'
                  }`}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
          {/* Present mode from md up; on a phone it sits in the menu. */}
          <button
            type="button"
            onClick={onPresent}
            aria-label="Present"
            title="Present this brochure, full screen"
            className="hidden md:inline-flex items-center justify-center gap-2 h-10 w-10 xl:w-auto xl:px-5 shrink-0 rounded-full border border-brand-white/15 text-brand-white text-[11px] font-bold uppercase tracking-[0.2em] hover:border-brand-yellow hover:text-brand-yellow transition-colors"
          >
            <Presentation className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="hidden xl:inline" aria-hidden="true">Present</span>
          </button>
          {/* Under 360px the logo, the pill and the menu cannot share a line, so the
              pill becomes a round mail button there. */}
          <a
            href="mailto:sales@next.io?subject=NEXT.io External Projects 2027 - Event Enquiry"
            aria-label="Contact Sales"
            className="inline-flex items-center justify-center h-10 w-10 shrink-0 min-[360px]:w-auto min-[360px]:px-4 sm:px-7 rounded-full bg-brand-yellow text-brand-dark font-bold text-[11px] uppercase tracking-[0.14em] sm:tracking-[0.2em] hover:bg-brand-champagne transition-colors whitespace-nowrap"
          >
            <Mail className="w-4 h-4 min-[360px]:hidden" aria-hidden="true" />
            <span className="hidden min-[360px]:inline">Contact Sales</span>
          </a>
          <button
            ref={btnRef}
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? 'Close the section menu' : 'Open the section menu'}
            className={`w-10 h-10 shrink-0 rounded-full border flex items-center justify-center transition-colors ${
              open ? 'border-brand-yellow text-brand-yellow' : 'border-brand-white/15 text-brand-white hover:border-brand-yellow hover:text-brand-yellow'
            }`}
          >
            {open ? <X className="w-4 h-4" aria-hidden="true" /> : <Menu className="w-4 h-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div
        id="site-menu"
        hidden={!open}
        className="absolute inset-x-0 top-full md:left-auto md:right-8 md:top-[calc(100%+0.5rem)] md:w-80 bg-brand-ink border-b md:border border-brand-white/10 md:rounded-3xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] overflow-hidden"
      >
        <ul className="py-2">
          {links.map(({ label, id }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                onClick={() => setOpen(false)}
                aria-current={activeId === id ? 'true' : undefined}
                className={`group flex items-center justify-between gap-4 min-h-12 px-6 text-xs font-bold uppercase tracking-[0.2em] transition-colors ${
                  activeId === id ? 'text-brand-yellow bg-brand-yellow/[0.06]' : 'text-brand-white hover:text-brand-yellow hover:bg-brand-white/[0.03]'
                }`}
              >
                {label}
                <ArrowRight className="w-3.5 h-3.5 text-brand-gray group-hover:text-brand-yellow transition-colors" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
        <div className="border-t border-brand-white/10 p-4 space-y-2.5">
          {/* Focus moves to the menu button first, so it is where focus comes back
              to when the presentation closes (this button is hidden by then). */}
          <button
            type="button"
            onClick={() => { setOpen(false); btnRef.current?.focus(); onPresent() }}
            className="flex items-center justify-center gap-2 w-full min-h-12 rounded-full border border-brand-yellow/60 text-brand-yellow font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-brand-yellow hover:text-brand-dark transition-colors"
          >
            <Presentation className="w-4 h-4" aria-hidden="true" /> Present
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); downloadBrochurePDF() }}
            className="flex items-center justify-center gap-2 w-full min-h-12 rounded-full border border-brand-white/20 font-bold text-[11px] uppercase tracking-[0.2em] hover:border-brand-yellow hover:text-brand-yellow transition-colors"
          >
            <Download className="w-4 h-4" aria-hidden="true" /> Print the brochure
          </button>
        </div>
      </div>
    </nav>
  )
}

// ─── Present mode: the deck ───────────────────────────────────────────────
// Built from the page's own arrays, so a new slot in SUMMITS, a new step in
// TIMELINE or a second format appears in the deck by itself, and nothing on a
// slide is typed twice. Product slides use the card's anchor as their id
// (formats, slot-<id>), so ?present=slot-sbc opens the slide for #slot-sbc.
// "Your brief" joins the deck once the brief has a slot or a format.
const GROUP_NOTE = {
  'The format': FORMATS.length === 1 ? FORMATS[0].name : `${FORMATS.length} formats`,
  'The 2027 calendar': `${SUMMITS.length} slots`,
  'Straight answers': `${FAQS.length} questions`,
}
function buildSlides(hasBrief) {
  const formatGroup = 'The format'
  return [
    { id: 'cover', label: 'Cover', group: 'Start', kind: 'cover' },
    { id: 'what-it-is', label: 'What it is', group: 'What it is', kind: 'what' },
    { id: 'track-record', label: 'Track record', group: 'What it is', kind: 'record' },
    ...(FORMATS.length > 1 ? [{ id: 'formats', label: 'The formats', group: formatGroup, kind: 'formats' }] : []),
    ...FORMATS.map((f) => ({ id: formatSlideId(f), label: f.name, group: formatGroup, kind: 'format', f })),
    { id: 'calendar', label: 'The 2027 calendar', group: 'The 2027 calendar', kind: 'calendar' },
    ...SUMMITS.map((s) => ({ id: `slot-${s.id}`, label: s.name, group: 'The 2027 calendar', kind: 'slot', s })),
    { id: 'the-room', label: 'The room', group: 'How it works', kind: 'room' },
    { id: 'how-it-works', label: 'Twelve weeks', group: 'How it works', kind: 'build' },
    { id: 'report', label: 'Your report', group: 'How it works', kind: 'report' },
    { id: 'terms', label: 'How we work with you', group: 'How it works', kind: 'terms' },
    { id: 'questions', label: 'Straight answers', group: 'Straight answers', kind: 'faq' },
    ...(hasBrief ? [{ id: 'your-brief', label: 'Your brief', group: 'Next steps', kind: 'brief' }] : []),
    { id: 'next-steps', label: 'Next steps', group: 'Next steps', kind: 'next' },
  ]
}

// Slide type: big, one idea per slide, on the page's tokens.
const DECK_H = 'text-[2.15rem] sm:text-5xl lg:text-6xl lg:short:text-[3.4rem] font-bold uppercase tracking-tight leading-[1.02]'
const DECK_LEDE = 'text-brand-gray text-base sm:text-lg leading-relaxed'
const DECK_LABEL = 'text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.3em] text-brand-yellow/90'
const DECK_BTN = 'inline-flex items-center justify-center gap-2 min-h-11 rounded-full px-6 sm:px-7 font-bold text-[11px] uppercase tracking-[0.2em] whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow'
const DECK_PRIMARY = `${DECK_BTN} bg-brand-yellow text-brand-dark hover:bg-brand-champagne shadow-[0_18px_50px_-18px_rgba(255,207,51,0.8)]`
const DECK_GOLD = `${DECK_BTN} border border-brand-yellow/60 text-brand-yellow hover:bg-brand-yellow hover:text-brand-dark`
const DECK_SECONDARY = `${DECK_BTN} border border-brand-white/20 hover:border-brand-yellow hover:text-brand-yellow`
const DECK_QUIET = `${QUIET_ACTION} min-h-11`

function DeckSlide({ slide, nav, slides, brief, chooseFormat, chooseSummit, landOn }) {
  switch (slide.kind) {
    case 'cover': return <CoverSlide slides={slides} goId={nav.goId} />
    case 'what': return <WhatSlide />
    case 'record': return <RecordSlide />
    case 'formats': return <FormatsSlide goId={nav.goId} />
    case 'format': return <FormatSlide f={slide.f} inBrief={brief.format === slide.f.id} onAdd={chooseFormat} landOn={landOn} />
    case 'calendar': return <CalendarSlide goId={nav.goId} brief={brief} />
    case 'slot': return <SlotSlide s={slide.s} inBrief={brief.summit === slide.s.id} onAdd={chooseSummit} landOn={landOn} />
    case 'room': return <RoomSlide />
    case 'build': return <BuildSlide />
    case 'report': return <ReportSlide />
    case 'terms': return <TermsSlide />
    case 'faq': return <FaqSlide />
    case 'brief': return <BriefSlide brief={brief} landOn={landOn} />
    case 'next': return <NextSlide brief={brief} landOn={landOn} />
    default: return null
  }
}

// Cover: the hero's lockup, headline and figures, what is in the deck, and the
// first-screen offer (the format with its fee and scope, the five slots).
function CoverSlide({ slides, goId }) {
  const groups = []
  for (const s of slides) {
    if (s.group !== 'Start' && !groups.some((g) => g.group === s.group)) groups.push({ group: s.group, first: s.id })
  }
  return (
    <>
      <div className="grid lg:grid-cols-12 gap-x-12 gap-y-8 items-start">
        <div className="lg:col-span-7">
          {/* the deck's top bar carries the logo on a phone */}
          <div className="flex items-center gap-3 mb-6 short:mb-5">
            <img alt="NEXT.io" src={`${base}logos/next-io.png`} className="hidden sm:block h-9 w-auto object-contain" />
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.3em] text-brand-yellow/90 sm:border-l sm:border-brand-white/20 sm:pl-3 whitespace-nowrap">
              {HEADS.hero.eyebrow}
            </span>
          </div>
          <Headline
            head={HEADS.hero}
            className="text-5xl sm:text-7xl lg:text-[4.75rem] lg:short:text-[4.1rem] font-bold uppercase tracking-[-0.04em] leading-[0.86]"
          />
          <ul className="mt-6 short:mt-5 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.14em] font-bold">
            {HERO_CHIPS.map(([Icon, label]) => (
              <li key={label} className="flex items-center gap-2 glass rounded-full py-2 px-3.5 whitespace-nowrap">
                <Icon className="w-3.5 h-3.5 text-brand-yellow shrink-0" aria-hidden="true" />{label}
              </li>
            ))}
          </ul>
        </div>
        <nav aria-label="In this presentation" className="lg:col-span-5">
          <p className={DECK_LABEL}>In this presentation</p>
          <ol className="mt-3 border-t border-brand-white/10">
            {groups.map((g, n) => (
              <li key={g.group} className="border-b border-brand-white/10">
                <button
                  type="button"
                  onClick={() => goId(g.first)}
                  className="group flex w-full min-h-11 items-center gap-3 sm:gap-4 py-1.5 text-left focus-visible:outline-2 focus-visible:outline-brand-yellow"
                >
                  <span className="w-6 shrink-0 text-[11px] font-bold tabular-nums text-brand-yellow/80">{String(n + 1).padStart(2, '0')}</span>
                  <span className="flex-1 min-w-0 text-sm sm:text-[15px] font-bold uppercase tracking-tight group-hover:text-brand-yellow transition-colors">{g.group}</span>
                  {GROUP_NOTE[g.group] && (
                    <span className="hidden min-[420px]:inline text-[10px] font-bold uppercase tracking-[0.16em] text-brand-gray text-right">{GROUP_NOTE[g.group]}</span>
                  )}
                  <ArrowRight className="w-3.5 h-3.5 shrink-0 text-brand-gray group-hover:text-brand-yellow transition-colors" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>
      <HeroOffer onJump={goId} className="mt-8 short:mt-6" />
      <p className="mt-5 short:mt-4 text-[10px] font-bold uppercase tracking-[0.25em] text-brand-gray">Use the arrow keys, or swipe</p>
    </>
  )
}

// What it is: you host, we build and run, we fill the room.
function WhatSlide() {
  const head = HEADS.whatItIs
  return (
    <>
      <Eyebrow>{head.eyebrow}</Eyebrow>
      <Headline head={head} className={DECK_H} />
      <p className={`${DECK_LEDE} mt-5 max-w-3xl`}>{ledeText(head.lede)}</p>
      <div className="mt-8 short:mt-6 grid md:grid-cols-3 gap-4">
        {PILLARS.map(({ icon: Icon, t, b }) => (
          <div key={t} className="glass rounded-3xl p-6 sm:p-7 sm:short:p-6">
            <div className="w-11 h-11 rounded-full bg-brand-yellow/12 border border-brand-yellow/25 flex items-center justify-center mb-5 short:mb-4">
              <Icon className="w-5 h-5 text-brand-yellow" aria-hidden="true" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold uppercase tracking-tight mb-2.5">{t}</h3>
            <p className="text-brand-gray leading-relaxed">{b}</p>
          </div>
        ))}
      </div>
    </>
  )
}

// Track record: the page's four figures and the line that keeps them apart.
function RecordSlide() {
  return (
    <>
      <Eyebrow>Track record</Eyebrow>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {TRACK_RECORD.map(([n, l]) => (
          <div key={l} className="glass rounded-3xl px-5 sm:px-7 py-7 sm:py-10">
            <p className="text-5xl sm:text-6xl lg:text-7xl font-bold gold-text leading-none tracking-tight mb-4">{n}</p>
            <p className="text-brand-gray text-[10px] sm:text-[11px] uppercase tracking-[0.16em] leading-snug">{l}</p>
          </div>
        ))}
      </div>
      <TrackRecordNote className="mt-8 max-w-4xl text-brand-white/80 text-base sm:text-lg leading-relaxed" />
    </>
  )
}

// Family slide, only when there is more than one format.
function FormatsSlide({ goId }) {
  const head = HEADS.formats
  return (
    <>
      <Eyebrow>{head.eyebrow}</Eyebrow>
      <Headline head={head} className={DECK_H} inline />
      <p className={`${DECK_LEDE} mt-5 max-w-3xl`}>{ledeText(head.lede)}</p>
      <ul className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {FORMATS.map((f) => {
          const Icon = f.icon
          return (
            <li key={f.id}>
              <button type="button" onClick={() => goId(formatSlideId(f))} className="group w-full h-full text-left glass rounded-3xl p-6 hover:border-brand-yellow/45 transition-colors">
                <span className="flex items-center gap-2.5"><Icon className="w-5 h-5 text-brand-yellow" aria-hidden="true" /><span className="text-xl font-bold uppercase tracking-tight group-hover:text-brand-yellow">{f.name}</span></span>
                <span className="block mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-gray">{f.guests}</span>
                <FormatInvestment f={f} size="card" className="mt-5" />
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}

// A format: name, tagline, fee with its scope, Add to brief (the page's own
// handler), Open the card, Copy link; then what the fee covers and what it
// does not, through the card's own blocks.
function FormatSlide({ f, inBrief, onAdd, landOn }) {
  const Icon = f.icon
  const id = formatSlideId(f)
  const shown = f.included.slice(0, 6)
  const more = f.included.length - shown.length
  return (
    <div className="grid lg:grid-cols-12 gap-x-12 gap-y-8 items-start">
      <div className="lg:col-span-7">
        <p className={`flex items-center gap-2.5 ${DECK_LABEL}`}>
          <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />{HEADS.formats.eyebrow}
        </p>
        <h2 className={`mt-4 ${DECK_H}`}>{brandCase(f.name)}</h2>
        <p className="mt-3 text-xl sm:text-2xl text-brand-champagne leading-snug">{f.tagline}</p>
        <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2.5 text-[10px] uppercase tracking-[0.14em] font-bold text-brand-white/85">
          {[[Users, f.guests], [Clock, f.notice], [Sparkles, f.duration]].map(([SpecIcon, t]) => (
            <li key={t} className="flex items-center gap-2 whitespace-nowrap">
              <SpecIcon className="w-3.5 h-3.5 text-brand-yellow shrink-0" aria-hidden="true" />{t}
            </li>
          ))}
        </ul>
        <FormatInvestment f={f} size="slide" className="mt-7 short:mt-6" />
        <p className="mt-6 text-brand-gray leading-relaxed max-w-xl">
          <span className="text-brand-white font-semibold">Best for: </span>{f.bestFor}
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => onAdd(f.id)} className={inBrief ? DECK_PRIMARY : DECK_GOLD}>
            {inBrief ? <><CircleCheck className="w-4 h-4" aria-hidden="true" />In your brief</> : 'Add to brief'}
          </button>
          <button type="button" onClick={() => landOn(id)} className={DECK_SECONDARY}>
            Open the card <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
          <CopyLinkButton id={id} title="Copy a link to this format" className={DECK_QUIET} />
        </div>
      </div>

      <div className="lg:col-span-5 space-y-4">
        <div className="glass rounded-3xl p-6">
          <p className="text-[10px] uppercase tracking-[0.25em] text-brand-gray mb-4">
            {f.fee != null ? 'What the fee covers' : 'What is included'}
          </p>
          <ul className="space-y-2.5">
            {shown.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm sm:text-[15px] text-brand-white/90 leading-snug">
                <Check className="w-4 h-4 text-brand-yellow shrink-0 mt-0.5" aria-hidden="true" />{item}
              </li>
            ))}
          </ul>
          {more > 0 && (
            <button type="button" onClick={() => landOn(id)} className="mt-3 -mb-1 inline-flex items-center min-h-11 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-yellow hover:text-brand-champagne transition-colors">
              + {more} more on the card
            </button>
          )}
        </div>
        <div className="rounded-2xl bg-brand-dark/60 border border-brand-white/8 p-5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-brand-gray mb-3">Not included</p>
          <ul className="space-y-2">
            {f.excluded.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm text-brand-gray leading-snug">
                <Ban className="w-4 h-4 text-brand-gray/60 shrink-0 mt-0.5" aria-hidden="true" />{item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

// The calendar family: every slot as a leaf, each a button to its slide, and the
// calendar's own footnote.
function CalendarSlide({ goId, brief }) {
  const head = HEADS.calendar
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
        <div>
          <Eyebrow>{head.eyebrow}</Eyebrow>
          <Headline head={head} className={DECK_H} inline />
        </div>
      </div>
      <p className={`${DECK_LEDE} mt-5 max-w-3xl`}>{ledeText(head.lede)}</p>
      <ul className="mt-8 grid sm:grid-cols-5 gap-2.5 sm:gap-3">
        {SUMMITS.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => goId(`slot-${s.id}`)}
              className={`group flex sm:flex-col items-center sm:items-stretch gap-4 sm:gap-3 w-full h-full text-left rounded-2xl sm:rounded-3xl p-3 sm:p-4 transition-colors focus-visible:outline-2 focus-visible:outline-brand-yellow ${
                brief.summit === s.id ? 'glass-gold' : 'glass hover:border-brand-yellow/45'
              }`}
            >
              <DateTile s={s} chosen={brief.summit === s.id} />
              <span className="min-w-0 flex-1 flex flex-col gap-1">
                <span className="font-bold uppercase tracking-tight leading-tight group-hover:text-brand-yellow transition-colors">{s.name}</span>
                <span className="text-xs text-brand-gray">{s.city}</span>
                <span className={`sm:mt-auto sm:pt-2 text-[9px] font-bold uppercase tracking-[0.14em] tabular-nums ${SLOT_TONE[s.status]}`}>
                  {s.premium > 0 ? `+${Math.round(s.premium * 100)}%` : STATUS_STYLE[s.status].label}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-6 max-w-4xl text-brand-gray text-sm leading-relaxed">{CALENDAR_NOTES.join(' ')}</p>
    </>
  )
}

// A slot: when and where, its status, its note, Add to brief (the same setter the
// calendar row uses), Open the row, Copy link; then the format there, with the
// fee and its scope together, and the premium stated where it applies.
function SlotSlide({ s, inBrief, onAdd, landOn }) {
  const st = STATUS_STYLE[s.status]
  const id = `slot-${s.id}`
  const pct = Math.round(s.premium * 100)
  return (
    <div className="grid lg:grid-cols-12 gap-x-12 gap-y-8 items-start">
      <div className="lg:col-span-7">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className={DECK_LABEL}>{HEADS.calendar.eyebrow}</span>
          <span className={`inline-flex items-center whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.2em] rounded-full px-3.5 py-2 ${st.cls}`}>{st.label}</span>
        </p>
        <div className="mt-5 flex items-center gap-5 sm:gap-7">
          <DateTile s={s} chosen={inBrief} size="large" />
          <div className="min-w-0">
            <h2 className="text-[2rem] sm:text-5xl lg:text-[3.25rem] font-bold uppercase tracking-tight leading-[1.02]">{s.name}</h2>
            {pct > 0 && (
              <span className="inline-block mt-3 text-[10px] font-bold uppercase tracking-[0.15em] tabular-nums text-brand-champagne border border-brand-yellow/50 rounded-full px-2.5 py-1">
                +{pct}%
              </span>
            )}
          </div>
        </div>
        <p className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-base sm:text-lg text-brand-white/85">
          <span className="inline-flex items-center gap-2"><MapPin className="w-4 h-4 text-brand-yellow shrink-0" aria-hidden="true" />{s.city}</span>
          <span className="inline-flex items-center gap-2"><CalendarDays className="w-4 h-4 text-brand-yellow shrink-0" aria-hidden="true" />{s.dates}</span>
        </p>
        <p className="mt-5 max-w-2xl text-lg sm:text-xl leading-relaxed text-brand-white/80">{s.note}</p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => onAdd(s.id)} className={inBrief ? DECK_PRIMARY : DECK_GOLD}>
            {inBrief ? <><CircleCheck className="w-4 h-4" aria-hidden="true" />In your brief</> : 'Add to brief'}
          </button>
          <button type="button" onClick={() => landOn(id)} className={DECK_SECONDARY}>
            Open the slot <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
          <CopyLinkButton id={id} title="Copy a link to this slot" className={DECK_QUIET} />
        </div>
      </div>

      <div className="lg:col-span-5 space-y-4">
        {FORMATS.map((f) => {
          const Icon = f.icon
          const entry = indicative(f, f.min)
          return (
            <div key={f.id} className="glass-gold rounded-3xl p-6 sm:p-7">
              <p className="text-[10px] uppercase tracking-[0.25em] text-brand-gray mb-3">What we build</p>
              <p className="flex items-center gap-2.5">
                <Icon className="w-5 h-5 text-brand-yellow shrink-0" aria-hidden="true" />
                <span className="text-xl sm:text-2xl font-bold uppercase tracking-tight leading-none">{f.name}</span>
              </p>
              <p className="mt-2.5 text-[10px] font-bold uppercase tracking-[0.14em] leading-relaxed text-brand-gray">
                <span className="whitespace-nowrap">{f.guests}</span> · <span className="whitespace-nowrap">{f.duration}</span>
              </p>
              {SHOW_INVESTMENT && (
                <>
                  <p className="mt-5 text-4xl sm:text-[2.75rem] font-bold gold-text leading-none tracking-tight">
                    {entry == null ? 'Quoted on brief' : fmtPrice(roundTo(entry, 1000))}
                  </p>
                  {pct > 0 && entry != null && (
                    <p className="mt-2.5 text-sm font-bold text-brand-champagne">+{pct}% off-calendar premium</p>
                  )}
                  {entry != null && <p className="mt-2.5 text-xs sm:text-sm leading-snug text-brand-white/75">{feeScope(f)}</p>}
                </>
              )}
            </div>
          )
        })}
        <p className="text-sm text-brand-gray leading-relaxed">{pct > 0 ? CALENDAR_NOTES[1] : CALENDAR_NOTES[0]}</p>
      </div>
    </div>
  )
}

// The room: how the guest list is built, and the figures it is held to.
function RoomSlide() {
  const head = HEADS.room
  return (
    <>
      <div className="grid lg:grid-cols-12 gap-x-12 gap-y-6 items-end">
        <div className="lg:col-span-7">
          <Eyebrow>{head.eyebrow}</Eyebrow>
          <Headline head={head} className={DECK_H} />
          <p className={`${DECK_LEDE} mt-5`}>{ledeText(head.lede)}</p>
        </div>
        <div className="lg:col-span-5 grid grid-cols-2 gap-2.5 sm:gap-3">
          {ROOM_STATS.map(([n, l]) => (
            <div key={l} className="glass rounded-2xl px-4 sm:px-5 py-4 sm:py-5">
              <p className="text-4xl sm:text-5xl font-bold gold-text leading-none tracking-tight mb-2.5">{n}</p>
              <p className="text-[10px] uppercase tracking-[0.14em] leading-snug text-brand-gray">{l}</p>
            </div>
          ))}
        </div>
      </div>
      <ol className="mt-8 short:mt-6 grid sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {ROOM_STEPS.map((step, n) => {
          const Icon = step.icon
          return (
            <li key={step.title} className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2.5 mb-3.5">
                <span className="w-8 h-8 rounded-full bg-brand-yellow text-brand-dark font-bold text-sm flex items-center justify-center shrink-0">{n + 1}</span>
                <Icon className="w-4 h-4 text-brand-yellow" aria-hidden="true" />
              </div>
              <h3 className="font-bold uppercase leading-tight tracking-tight mb-2">{brandCase(step.title)}</h3>
              <p className="text-brand-gray text-[13px] leading-relaxed">{step.body}</p>
            </li>
          )
        })}
      </ol>
    </>
  )
}

// Twelve weeks, condensed: every step's week, title and line on one slide. The
// page's timeline carries what we do and what the host does at each step.
function BuildSlide() {
  const head = HEADS.build
  return (
    <>
      <Eyebrow>{head.eyebrow}</Eyebrow>
      <Headline head={head} className={DECK_H} inline />
      <p className={`${DECK_LEDE} mt-4 max-w-3xl`}>{[].concat(head.lede)[0]}</p>
      <ol className="mt-7 short:mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {TIMELINE.map((step) => (
          <li key={step.w} className="glass rounded-2xl p-4 sm:p-5 sm:short:px-5 sm:short:py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-yellow mb-1.5">{step.w}</p>
            <p className="font-bold uppercase leading-tight tracking-tight">{brandCase(step.t)}</p>
            <p className="mt-1.5 text-[13px] text-brand-gray leading-relaxed">{step.b}</p>
          </li>
        ))}
      </ol>
    </>
  )
}

// What the post-event report covers, and what it does not.
function ReportSlide() {
  return (
    <>
      <Eyebrow>{HEADS.room.eyebrow}</Eyebrow>
      <h2 className={DECK_H}>{REPORT_TITLE}</h2>
      <div className="mt-8 grid md:grid-cols-2 gap-4">
        <ul className="glass rounded-3xl p-6 sm:p-8 space-y-3.5">
          {REPORT_IN.map((r) => (
            <li key={r} className="flex gap-3 text-base sm:text-lg text-brand-white/90 leading-snug">
              <CircleCheck className="w-5 h-5 text-brand-yellow shrink-0 mt-0.5" aria-hidden="true" />{r}
            </li>
          ))}
        </ul>
        <div className="glass-gold rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-5">
            <Target className="w-5 h-5 text-brand-yellow" aria-hidden="true" />
            <h3 className="text-lg sm:text-xl font-bold uppercase tracking-tight">{PIPELINE.title}</h3>
          </div>
          <p className="text-3xl sm:text-4xl font-bold gold-text leading-tight mb-4">{PIPELINE.big}</p>
          <p className="text-brand-gray leading-relaxed">{PIPELINE.body}</p>
        </div>
      </div>
    </>
  )
}

// How we work with you: TERMS, word for word.
function TermsSlide() {
  const head = HEADS.terms
  return (
    <>
      <h2 className={DECK_H}>{head.title}</h2>
      <p className={`${DECK_LEDE} mt-4 max-w-3xl`}>{head.lede}</p>
      <div className="mt-7 grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {TERMS.map((t) => {
          const Icon = t.icon
          return (
            <div key={t.t} className="glass rounded-2xl p-5 sm:p-6">
              <Icon className="w-5 h-5 text-brand-yellow mb-3.5" aria-hidden="true" />
              <h3 className="font-bold uppercase leading-tight tracking-tight mb-2">{brandCase(t.t)}</h3>
              <p className="text-brand-gray text-[13px] sm:text-sm leading-relaxed">{t.b}</p>
            </div>
          )
        })}
      </div>
    </>
  )
}

// Straight answers: FAQS, opened one at a time as the buyer asks.
function FaqSlide() {
  const [open, setOpen] = useState(null)
  const head = HEADS.faq
  return (
    <div className="grid lg:grid-cols-12 gap-x-12 gap-y-7 items-start">
      <div className="lg:col-span-4">
        <Eyebrow>{head.eyebrow}</Eyebrow>
        <Headline head={head} className={DECK_H} inline />
        <p className={`${DECK_LEDE} mt-4`}>{ledeText(head.lede)}</p>
      </div>
      <div className="lg:col-span-8 space-y-2.5">
        {FAQS.map((f, n) => (
          <FaqItem key={f.q} f={f} dense open={open === n} onToggle={() => setOpen(open === n ? null : n)} />
        ))}
      </div>
    </div>
  )
}

// The brief as it stands, through the brief builder's own summary.
function BriefSlide({ brief, landOn }) {
  const head = HEADS.brief
  return (
    <div className="grid lg:grid-cols-12 gap-x-12 gap-y-7 items-start">
      <div className="lg:col-span-5">
        <Eyebrow>{head.eyebrow}</Eyebrow>
        <Headline head={head} className={DECK_H} />
        <p className={`${DECK_LEDE} mt-5`}>{ledeText(head.lede)}</p>
        <button type="button" onClick={() => landOn('brief')} className={`mt-7 ${DECK_SECONDARY}`}>
          Open the brief builder <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      <BriefSummary brief={brief} className="lg:col-span-7 glass-gold rounded-3xl p-6 sm:p-7" copyClass={DECK_QUIET} />
    </div>
  )
}

// Next steps: the page's own call to action, then the three ways to start, and how fast
// the answer comes back.
function NextSlide({ brief, landOn }) {
  const head = HEADS.cta
  return (
    <>
      <div className="text-center max-w-4xl mx-auto">
        <Sparkles className="w-6 h-6 text-brand-yellow mx-auto mb-5" aria-hidden="true" />
        <Headline head={head} className="text-4xl sm:text-5xl lg:text-6xl font-bold uppercase tracking-[-0.03em] leading-[0.95]" />
        <p className={`${DECK_LEDE} mt-5 max-w-2xl mx-auto`}>{head.lede}</p>
        <div className="mt-8 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-3">
          <button type="button" onClick={() => landOn('brief')} className={DECK_PRIMARY}>
            Build your brief <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={downloadBrochurePDF} className={DECK_SECONDARY}>
            <Download className="w-4 h-4" aria-hidden="true" /> Print the brochure
          </button>
          <a href={buildMailto(brief)} className={DECK_SECONDARY}>
            <Mail className="w-4 h-4" aria-hidden="true" /> <span className="normal-case text-[13px] leading-none tracking-[0.03em]">sales@next.io</span>
          </a>
        </div>
      </div>
      <div className="mt-10">
        <p className={`${DECK_LABEL} text-center`}>{HEADS.response.title}</p>
        <ul className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {RESPONSE.map((r) => (
            <li key={r.t} className="glass-gold rounded-2xl p-4 sm:p-5 flex items-center gap-3.5">
              <span className="text-4xl font-bold gold-text leading-none tabular-nums">{r.d}</span>
              <span className="min-w-0">
                <span className="block text-[10px] uppercase tracking-[0.2em] leading-snug text-brand-gray">working {r.d === '1' ? 'day' : 'days'}</span>
                <span className="block mt-1 text-sm font-bold uppercase leading-tight tracking-tight">{r.t}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────
export default function App() {
  useScrollAnimation()

  const [brief, setBrief] = useState({ summit: null, format: null, guests: 100 })
  const [openFaq, setOpenFaq] = useState(null)

  // The page's own brief setters. The format card, the calendar rows, the brief
  // builder, a restored brief link and Present mode all go through these; the
  // select* versions also take the reader down to the brief.
  const chooseFormat = useCallback((id) => setBrief((b) => ({ ...b, format: id })), [])
  const chooseSummit = useCallback((id) => setBrief((b) => ({ ...b, summit: id })), [])
  const selectFormat = useCallback((id) => {
    chooseFormat(id)
    document.getElementById('brief')?.scrollIntoView({ behavior: 'smooth' })
  }, [chooseFormat])
  const selectSummit = useCallback((id) => {
    chooseSummit(id)
    document.getElementById('brief')?.scrollIntoView({ behavior: 'smooth' })
  }, [chooseSummit])

  // A copied brief link (?plan=sbc,reception~120#brief) fills the brief on
  // arrival through the same setters: a slot id picks the occasion, a format id
  // the format, and its guest count is fitted to the slider. Anything else is
  // skipped, and the parameter leaves the address bar.
  useEffect(() => {
    const tokens = readPlanParam()
    if (tokens === null) return
    for (const token of tokens) {
      const [id, extra] = token.split('~')
      const f = FORMATS.find((x) => x.id === id)
      if (SUMMITS.some((s) => s.id === id)) chooseSummit(id)
      else if (f) {
        chooseFormat(id)
        const n = Number(extra)
        if (extra && Number.isFinite(n)) setBrief((b) => ({ ...b, guests: fitGuests(f, n) }))
      }
    }
    dropPlanParam()
  }, [chooseFormat, chooseSummit])

  // Present mode (?present, ?present=<slide id>). The deck reads the page's own
  // arrays; "Your brief" joins it once the brief has a slot or a format.
  const { present, open: openPresent, close: closePresent } = usePresent()
  const hasBrief = Boolean(brief.summit || brief.format)
  const slides = useMemo(() => buildSlides(hasBrief), [hasBrief])
  // "Open the card": close the deck, then land on the card below the nav and
  // move focus there, as an anchored jump would.
  const landOn = useCallback((id) => {
    closePresent()
    setTimeout(() => {
      const el = document.getElementById(id)
      if (!el) return
      try { window.history.replaceState(window.history.state, '', `#${id}`) } catch { /* no URL access */ }
      el.scrollIntoView({ block: 'start' })
      if (el.hasAttribute('tabindex')) el.focus({ preventScroll: true })
    }, 40)
  }, [closePresent])

  // Page order. `bar` is the breakpoint from which a link also sits in the nav bar;
  // the menu always lists all of them.
  const navLinks = useMemo(() => [
    { label: 'What It Is', id: 'what-it-is' },
    { label: 'The Format', id: 'formats', bar: 'md' },
    { label: 'Calendar', id: 'calendar', bar: 'lg' },
    { label: 'The Room', id: 'the-room' },
    { label: 'How It Works', id: 'how-it-works', bar: 'xl' },
    { label: 'Build a Brief', id: 'brief', bar: 'md' },
  ], [])

  // The fixed nav changes height by breakpoint; anchored jumps and the sticky brief
  // summary read it from --nav-h rather than a hardcoded offset.
  const navRef = useRef(null)
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const set = () => document.documentElement.style.setProperty('--nav-h', `${nav.offsetHeight}px`)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(nav)
    return () => ro.disconnect()
  }, [])

  // A deep link (…/#formats) arrives before React has rendered its target, so the
  // browser has nothing to scroll to. Jump once the page exists, then land again
  // whenever the page height settles in the first seconds: Inter swaps in after the
  // first paint and moves everything above the target by ~120px. A reader's own
  // input (wheel, touch, key, pointer) ends it, so nobody is dragged back.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (!id) return
    let moved = false
    const stop = () => { moved = true }
    const input = ['wheel', 'touchstart', 'keydown', 'pointerdown']
    input.forEach((e) => window.addEventListener(e, stop, { passive: true }))
    const jump = () => {
      const el = document.getElementById(id)
      if (!el || moved) return
      const html = document.documentElement
      const prev = html.style.scrollBehavior
      html.style.scrollBehavior = 'auto'
      el.scrollIntoView({ block: 'start' })
      html.style.scrollBehavior = prev
    }
    let raf = requestAnimationFrame(jump)
    const settle = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(jump) }
    const ro = new ResizeObserver(settle)
    ro.observe(document.body)
    document.fonts?.addEventListener?.('loadingdone', settle)
    const release = () => {
      ro.disconnect()
      document.fonts?.removeEventListener?.('loadingdone', settle)
      input.forEach((e) => window.removeEventListener(e, stop))
    }
    const timer = setTimeout(release, 3000)
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); release() }
  }, [])

  // The section under the nav is the current one, marked in the bar and the menu.
  const [activeId, setActiveId] = useState(null)
  useEffect(() => {
    let raf = 0
    const measure = () => {
      const line = (navRef.current?.offsetHeight || 70) + 8
      let cur = null
      for (const { id } of navLinks) {
        const r = document.getElementById(id)?.getBoundingClientRect()
        if (r && r.top <= line && r.bottom > line) cur = id
      }
      setActiveId(cur)
    }
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure) }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    measure()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [navLinks])

  return (
    <div className="grain min-h-screen bg-brand-dark text-brand-white font-sans">

      {/* ── NAV ── */}
      <SiteNav navRef={navRef} links={navLinks} activeId={activeId} onPresent={() => openPresent()} />

      <main>
        {/* ── HERO ── */}
        <section className="relative min-h-[92vh] flex flex-col items-center justify-center overflow-hidden pt-24 sm:pt-28 lg:pt-[6.5rem] pb-16 sm:pb-20">
          <div className="absolute inset-0 z-0">
            <img alt="A NEXT.io partner-hosted CxO dinner" src={`${base}images/cxo-event-hero.jpg`} className="w-full h-full object-cover opacity-[0.28]" />
            <div className="absolute inset-0 vignette" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-transparent to-brand-dark/80" />
          </div>
          <div className="spill w-[38rem] h-[38rem] -top-40 left-1/2 -translate-x-1/2 opacity-70 shimmer" />

          <div className="z-10 text-center max-w-6xl px-6 sm:px-8 w-full">
            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-6">
              <span className="gold-rule w-8 sm:w-12 rotate-180 shrink-0" />
              <p className="text-brand-yellow/90 font-bold uppercase tracking-[0.3em] sm:tracking-[0.45em] text-[10px] sm:text-xs whitespace-nowrap">{HEADS.hero.eyebrow}</p>
              <span className="gold-rule w-8 sm:w-12 shrink-0" />
            </div>
            <Headline
              as="h1"
              head={HEADS.hero}
              className="text-5xl sm:text-7xl lg:text-[6.5rem] font-bold tracking-[-0.04em] uppercase leading-[0.86] mb-6"
            />
            <p className="text-brand-white/75 text-base sm:text-xl max-w-3xl mx-auto leading-relaxed">
              {HEADS.hero.lede}
            </p>

            <HeroOffer />

            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <a href="#brief" className="w-full sm:w-auto justify-center bg-brand-yellow text-brand-dark px-9 py-4 rounded-full font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-brand-champagne transition-colors flex items-center gap-2 shadow-[0_18px_50px_-18px_rgba(255,207,51,0.8)]">
                Build your brief <ArrowRight className="w-4 h-4" />
              </a>
              <button onClick={downloadBrochurePDF} className="w-full sm:w-auto justify-center border border-brand-white/20 px-9 py-4 rounded-full font-bold text-[11px] uppercase tracking-[0.2em] hover:border-brand-yellow hover:text-brand-yellow transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" /> Print the brochure
              </button>
              {/* The full-screen walk-through, beside the printable brochure. */}
              <button type="button" onClick={() => openPresent()} className="w-full sm:w-auto justify-center min-h-11 sm:border sm:border-brand-white/20 px-9 sm:py-4 rounded-full font-bold text-[11px] uppercase tracking-[0.2em] text-brand-white/85 sm:text-brand-white hover:border-brand-yellow hover:text-brand-yellow transition-colors flex items-center gap-2">
                <Presentation className="w-4 h-4" aria-hidden="true" /> Present
              </button>
            </div>
            {/* One row of pills from sm up; a 2 x 2 of tiles on a phone, where four
                pills otherwise stack into a column. */}
            <ul className="mt-8 grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-center gap-2 sm:gap-2.5 text-[10px] sm:text-[11px] uppercase tracking-[0.12em] sm:tracking-[0.2em] font-bold">
              {HERO_CHIPS.map(([Icon, label]) => (
                <li key={label} className="flex items-center gap-2 glass rounded-2xl sm:rounded-full py-2.5 px-3.5 sm:px-4 text-left leading-snug sm:whitespace-nowrap">
                  <Icon className="w-3.5 h-3.5 text-brand-yellow shrink-0" />{label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── WHAT IT IS ── */}
        <section id="what-it-is" className="relative py-28 border-t border-brand-white/8 overflow-hidden">
          <div className="spill w-[30rem] h-[30rem] -left-40 top-20 opacity-50" />
          <div className="relative max-w-7xl mx-auto px-6 sm:px-8">
            <SectionHead head={HEADS.whatItIs} className="max-w-3xl mb-16" />

            <div className="grid md:grid-cols-3 gap-6 mb-20">
              {PILLARS.map(({ icon: Icon, t, b }, i) => (
                <div key={t} data-anim style={{ ...anim, transitionDelay: `${i * 90}ms` }} className="glass lift rounded-3xl p-7 sm:p-9 hover:border-brand-yellow/45">
                  <div className="w-12 h-12 rounded-full bg-brand-yellow/12 border border-brand-yellow/25 flex items-center justify-center mb-6">
                    <Icon className="w-5 h-5 text-brand-yellow" />
                  </div>
                  <h3 className="text-2xl font-bold uppercase mb-3 tracking-tight">{t}</h3>
                  <p className="text-brand-gray leading-relaxed">{b}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
              {TRACK_RECORD.map(([n, l], i) => (
                <div key={l} data-anim style={{ ...anim, transitionDelay: `${i * 80}ms` }} className="glass lift px-5 sm:px-6 py-8 sm:py-9 rounded-3xl hover:border-brand-yellow/45">
                  <p className="text-5xl md:text-6xl font-bold gold-text mb-3 leading-none tracking-tight">{n}</p>
                  <p className="text-brand-gray text-[10px] md:text-[11px] uppercase tracking-[0.14em] sm:tracking-[0.2em] leading-snug">{l}</p>
                </div>
              ))}
            </div>
            <TrackRecordNote data-anim style={anim} className="text-brand-gray text-sm mt-7 max-w-3xl leading-relaxed" />
          </div>
        </section>

        {/* ── FORMATS ── */}
        {/* tabIndex -1: "Open the card" in Present mode lands here and moves focus in */}
        <section id="formats" tabIndex={-1} className="relative py-28 bg-brand-ink/70 border-t border-brand-white/8 overflow-hidden outline-none">
          <div className="spill w-[34rem] h-[34rem] -left-48 top-1/4 opacity-45" />
          <div className="relative max-w-7xl mx-auto px-6 sm:px-8">
            <SectionHead head={HEADS.formats} />
            {FORMATS.length === 1 ? (
              <FormatFeature f={FORMATS[0]} selected={brief.format === FORMATS[0].id} onSelect={selectFormat} onPresent={openPresent} />
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {FORMATS.map((f, i) => (
                  <FormatCard key={f.id} f={f} delay={i * 60} selected={brief.format === f.id} onSelect={selectFormat} onPresent={openPresent} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── CALENDAR ── */}
        <section id="calendar" className="relative py-28 border-t border-brand-white/8 overflow-hidden">
          <div className="spill w-[32rem] h-[32rem] -right-40 top-1/3 opacity-50" />
          <div className="relative max-w-7xl mx-auto px-6 sm:px-8">
            <SectionHead head={HEADS.calendar} />

            <ul className="space-y-3">
              {SUMMITS.map((s, i) => (
                <SlotRow
                  key={s.id}
                  s={s}
                  i={i}
                  chosen={brief.summit === s.id}
                  onChoose={() => selectSummit(s.id)}
                  onPresent={openPresent}
                />
              ))}
            </ul>
            <p data-anim style={anim} className="text-brand-gray text-sm mt-7 max-w-4xl leading-relaxed">
              {CALENDAR_NOTES.join(' ')}
            </p>
          </div>
        </section>

        {/* ── THE ROOM ── */}
        <section id="the-room" className="relative py-28 bg-brand-ink/70 border-t border-brand-white/8 overflow-hidden">
          <div className="spill w-[30rem] h-[30rem] right-0 bottom-20 opacity-45" />
          <div className="relative max-w-7xl mx-auto px-6 sm:px-8">
            <SectionHead head={HEADS.room} />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-16">
              {ROOM_STATS.map(([n, l], i) => (
                <div key={l} data-anim style={{ ...anim, transitionDelay: `${i * 80}ms` }} className="glass lift px-5 sm:px-6 py-8 sm:py-9 rounded-3xl hover:border-brand-yellow/45">
                  <p className="text-5xl md:text-6xl font-bold gold-text mb-3 leading-none tracking-tight">{n}</p>
                  <p className="text-brand-gray text-[10px] md:text-[11px] uppercase tracking-[0.14em] sm:tracking-[0.2em] leading-snug">{l}</p>
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
                    <h3 className="font-bold uppercase text-lg mb-2.5 leading-tight tracking-tight">{brandCase(s.title)}</h3>
                    <p className="text-brand-gray text-sm leading-relaxed">{s.body}</p>
                  </div>
                )
              })}
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div data-anim style={anim} className="glass rounded-3xl p-7 sm:p-9">
                <div className="flex items-center gap-3 mb-6">
                  <Eye className="w-5 h-5 text-brand-yellow" />
                  <h3 className="text-xl font-bold uppercase tracking-tight">{REPORT_TITLE}</h3>
                </div>
                <ul className="space-y-3">
                  {REPORT_IN.map((r) => (
                    <li key={r} className="flex gap-3 text-brand-white/90">
                      <CircleCheck className="w-5 h-5 text-brand-yellow shrink-0 mt-0.5" />{r}
                    </li>
                  ))}
                </ul>
              </div>
              <div data-anim style={{ ...anim, transitionDelay: '90ms' }} className="glass-gold rounded-3xl p-7 sm:p-9">
                <div className="flex items-center gap-3 mb-6">
                  <Target className="w-5 h-5 text-brand-yellow" />
                  <h3 className="text-xl font-bold uppercase tracking-tight">{PIPELINE.title}</h3>
                </div>
                <p className="text-3xl font-bold gold-text leading-tight mb-4">{PIPELINE.big}</p>
                <p className="text-brand-gray leading-relaxed">{PIPELINE.body}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" className="relative py-28 border-t border-brand-white/8 overflow-hidden">
          <div className="spill w-[36rem] h-[36rem] left-1/3 top-0 opacity-40" />
          <div className="relative max-w-7xl mx-auto px-6 sm:px-8">
            <SectionHead head={HEADS.build} className="max-w-3xl mb-16" />

            <div data-anim style={anim} className="mb-24">
              <Timeline />
            </div>

            <div data-anim style={anim} className="mb-24">
              <h3 className="text-2xl md:text-4xl font-bold uppercase mb-4 tracking-tight">{HEADS.response.title}</h3>
              <p className="text-brand-gray mb-9 max-w-3xl leading-relaxed">{HEADS.response.lede}</p>
              {/* A row on a phone (figure left, copy right), a card from sm up. */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                {RESPONSE.map((r, i) => (
                  <div key={r.t} data-anim style={{ ...anim, transitionDelay: `${i * 80}ms` }} className="glass-gold lift rounded-3xl p-6 sm:p-7 flex gap-5 sm:block">
                    <div className="flex flex-col items-center sm:flex-row sm:items-baseline gap-2 w-16 sm:w-auto shrink-0 sm:mb-4 text-center sm:text-left">
                      <span className="text-5xl font-bold gold-text leading-none tabular-nums">{r.d}</span>
                      <span className="text-[10px] uppercase tracking-[0.2em] leading-snug text-brand-gray">working {r.d === '1' ? 'day' : 'days'}</span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold uppercase mb-2 sm:mb-2.5 leading-tight tracking-tight">{r.t}</h4>
                      <p className="text-brand-gray text-sm leading-relaxed">{r.b}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div data-anim style={anim}>
              <h3 className="text-2xl md:text-4xl font-bold uppercase mb-4 tracking-tight">{HEADS.terms.title}</h3>
              <p className="text-brand-gray mb-9 max-w-3xl leading-relaxed">{HEADS.terms.lede}</p>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                {TERMS.map((t, i) => {
                  const Icon = t.icon
                  return (
                    <div key={t.t} data-anim style={{ ...anim, transitionDelay: `${(i % 3) * 80}ms` }} className="glass lift rounded-3xl p-8 hover:border-brand-yellow/45">
                      <Icon className="w-5 h-5 text-brand-yellow mb-5" />
                      <h4 className="text-lg font-bold uppercase mb-2.5 leading-tight tracking-tight">{brandCase(t.t)}</h4>
                      <p className="text-brand-gray text-sm leading-relaxed">{t.b}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── BRIEF BUILDER ── */}
        {/* overflow-clip, not overflow-hidden: a hidden section is a scroll
            container, which pinned the sticky brief summary to it (it never stuck). */}
        <section id="brief" tabIndex={-1} className="relative py-28 bg-brand-ink/70 border-t border-brand-white/8 overflow-clip outline-none">
          <div className="spill w-[32rem] h-[32rem] -right-32 top-10 opacity-50" />
          <div className="relative max-w-7xl mx-auto px-6 sm:px-8">
            <SectionHead head={HEADS.brief} />
            <BriefBuilder brief={brief} setBrief={setBrief} chooseSummit={chooseSummit} chooseFormat={chooseFormat} />
          </div>
        </section>

        {/* ── FAQ ── */}
        {/* Heading on the page's left edge like every other section, with the
            questions beside it from lg up (it used to sit in a centred column). */}
        <section className="relative py-28 border-t border-brand-white/8">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 grid lg:grid-cols-12 gap-x-16">
            <div data-anim style={anim} className="lg:col-span-4 mb-12 lg:mb-0">
              <Eyebrow>{HEADS.faq.eyebrow}</Eyebrow>
              <Headline head={HEADS.faq} inline />
              <p className="text-brand-gray text-lg">{HEADS.faq.lede}</p>
            </div>
            <div className="lg:col-span-8 space-y-3">
              {FAQS.map((f, i) => (
                <FaqItem
                  key={f.q}
                  f={f}
                  open={openFaq === i}
                  onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                  data-anim
                  style={{ ...anim, transitionDelay: `${i * 60}ms` }}
                />
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
              <Headline head={HEADS.cta} className="text-4xl md:text-7xl font-bold uppercase tracking-[-0.03em] mb-7 leading-[0.95]" />
              <p className="text-brand-gray text-lg max-w-2xl mx-auto mb-11 leading-relaxed">{HEADS.cta.lede}</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                <a href="#brief" className="w-full sm:w-auto justify-center bg-brand-yellow text-brand-dark px-9 py-4 rounded-full font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-brand-champagne transition-colors flex items-center gap-2 shadow-[0_18px_50px_-18px_rgba(255,207,51,0.8)]">
                  Build your brief <ArrowRight className="w-4 h-4" />
                </a>
                {/* An address keeps its own case: set in capitals it read NEXT.IO. */}
                <a href="mailto:sales@next.io?subject=NEXT.io External Projects 2027 - Event Enquiry" className="w-full sm:w-auto justify-center border border-brand-white/20 px-9 py-4 rounded-full font-bold text-[11px] uppercase tracking-[0.2em] hover:border-brand-yellow hover:text-brand-yellow transition-colors flex items-center gap-2">
                  <Mail className="w-4 h-4" /> <span className="normal-case text-[13px] leading-none tracking-[0.03em]">sales@next.io</span>
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
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm">
            <a href="mailto:sales@next.io" className="flex items-center gap-2 min-h-10 text-brand-gray hover:text-brand-yellow transition-colors">
              <Mail className="w-4 h-4" /> sales@next.io
            </a>
            <a href="https://next.io" target="_blank" rel="noreferrer" className="flex items-center gap-2 min-h-10 text-brand-gray hover:text-brand-yellow transition-colors">
              <Globe className="w-4 h-4" /> next.io
            </a>
            <button onClick={downloadBrochurePDF} className="flex items-center gap-2 min-h-10 text-brand-gray hover:text-brand-yellow transition-colors">
              <Download className="w-4 h-4" /> Print the brochure
            </button>
          </div>
        </div>
        <p className="max-w-7xl mx-auto px-6 sm:px-8 text-brand-gray/70 text-xs mt-9 leading-relaxed">
          {SHOW_INVESTMENT && 'Fees cover the format as specified and exclude VAT. Guest numbers, cities and dates beyond the scope set out here are quoted on the brief. '}
          Summit dates are as published by the organisers and are confirmed before anything is booked. Availability subject to change.
        </p>
      </footer>

      {/* ── PRESENT MODE ── portalled to <body>; the page behind goes inert */}
      {present !== null && (
        <PresentMode
          slides={slides}
          startId={present}
          onClose={closePresent}
          title="External Projects 2027"
          logo={<img alt="NEXT.io" src={`${base}logos/next-io.png`} className="h-6 sm:h-7 w-auto object-contain shrink-0" />}
          renderSlide={(slide, nav) => (
            <DeckSlide
              slide={slide}
              nav={nav}
              slides={slides}
              brief={brief}
              chooseFormat={chooseFormat}
              chooseSummit={chooseSummit}
              landOn={landOn}
            />
          )}
        />
      )}
    </div>
  )
}
