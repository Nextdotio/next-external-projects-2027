import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Mail, Globe, CalendarDays, MapPin, Users, Sparkles, CircleCheck, X, Download,
  ArrowRight, Clock, ShieldCheck, FileText, Wine, Trophy, Building2, Check,
  Target, MessageCircle, Send, Coffee, UtensilsCrossed, PartyPopper, Ban,
  ClipboardList, BadgeCheck, Crown, Route, Gauge, UserCheck, Eye, ChevronDown,
} from 'lucide-react'

const base = import.meta.env.BASE_URL

// ─────────────────────────────────────────────────────────────────────────
// SALES DESK
//
// SHOW_INVESTMENT controls whether the indicative "from" bands appear on the
// format cards, in the brief builder and in the printable brochure. Set it to
// false to ship the brochure with no numbers at all — every other section
// keeps working. See README.md for where the bands came from.
// ─────────────────────────────────────────────────────────────────────────
const SHOW_INVESTMENT = true

const fmtPrice = (n) => '€' + n.toLocaleString('en-US')

// ─── 2027 calendar ────────────────────────────────────────────────────────
// status: 'open' | 'interest' | 'tbc' | 'open-slot'
const SUMMITS = [
  {
    id: 'ice',
    name: 'ICE Barcelona',
    city: 'Barcelona',
    dates: '18–20 January 2027',
    month: 'JAN',
    status: 'open',
    note: 'The year opens here. Anything at ICE is sold and built during 2026 — briefs want to be with us by October.',
  },
  {
    id: 'igb',
    name: 'iGB Live',
    city: 'London',
    dates: '7–8 July 2027',
    month: 'JUL',
    status: 'open',
    note: 'British market focus, and the best central London venues are gone by spring. Early briefs get the short list.',
  },
  {
    id: 'sbc',
    name: 'SBC Summit',
    city: 'Lisbon',
    dates: '21–23 September 2027',
    month: 'SEP',
    status: 'interest',
    note: 'The largest gathering on the calendar, and the slot with interest already registered against it.',
  },
  {
    id: 'sigma',
    name: 'SiGMA World',
    city: 'Rome',
    dates: 'Dates to be confirmed',
    month: 'Q4',
    status: 'tbc',
    note: 'Edition dates are not published yet. Register interest and we will come back to you the day they are.',
  },
  {
    id: 'open',
    name: 'Your summit',
    city: 'Tell us where',
    dates: 'One slot unallocated',
    month: 'TBC',
    status: 'open-slot',
    note: 'One slot in the 2027 calendar is deliberately open. If your buyers gather somewhere we have not listed, put it to us.',
  },
]

const STATUS_STYLE = {
  open: { label: 'Open', cls: 'bg-brand-yellow text-brand-dark' },
  interest: { label: 'Interest registered', cls: 'bg-brand-white/15 text-brand-white border border-brand-white/25' },
  tbc: { label: 'Dates TBC', cls: 'bg-brand-white/10 text-brand-gray border border-brand-white/20' },
  'open-slot': { label: 'Open brief', cls: 'bg-brand-yellow/20 text-brand-yellow border border-brand-yellow/50' },
}

// ─── The six formats ──────────────────────────────────────────────────────
const FORMATS = [
  {
    id: 'reception',
    name: 'Drinks Reception',
    icon: Wine,
    img: 'networking-drinks.jpg',
    tagline: 'The widest room, the shortest build.',
    guests: '60–120 guests',
    min: 60, max: 120, def: 90,
    duration: 'One evening · 3–4 hours',
    notice: '8 weeks minimum',
    from: 35000,
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
  {
    id: 'dinner',
    name: 'Private Dinner',
    icon: UtensilsCrossed,
    img: 'gala-dinner.jpg',
    tagline: 'One table. The right forty people.',
    guests: '20–40 guests',
    min: 20, max: 40, def: 30,
    duration: 'One evening · 3–4 hours',
    notice: '8 weeks minimum',
    from: 45000,
    bestFor: 'Senior relationship work, where the value is in the conversation rather than the headcount.',
    included: [
      'Private dining room chosen for the room itself, not for the address',
      'Set menu and wine pairing agreed with you in advance',
      'Seating plan built around who you want talking to whom',
      'Branded menus, place cards and room dressing',
      'Curated guest list, personally invited and personally chased',
      'Host briefing pack — who is coming, why they matter, what to ask them',
      'A NEXT.io host on the night to make the introductions',
      'Photography and a post-event attendance report',
    ],
    excluded: [
      'Standing reception overflow beyond the table plan',
      'Large-scale AV or stage production',
      'Guest travel, transfers or accommodation',
    ],
  },
  {
    id: 'lounge',
    name: 'Private Lounge',
    icon: Coffee,
    img: 'tech-hub.jpg',
    tagline: 'Somewhere better than a hotel lobby.',
    guests: '80–200 guests across the week',
    min: 80, max: 200, def: 140,
    duration: 'One to three days',
    notice: '10 weeks minimum',
    from: 55000,
    bestFor: 'Teams running back-to-back meetings all week who need a base with their name on it.',
    included: [
      'A dedicated space held for the full duration, close to the summit floor',
      'Branded fit-out — furniture, signage, screens and printed collateral',
      'Barista service through the day, bar service from late afternoon',
      'Meeting pods or private corners for scheduled conversations',
      'Scheduled guest flow, so the room is never empty and never overrun',
      'Meeting-booking support against your target account list',
      'Concierge and reception staffing throughout',
      'Daily footfall and attendance reporting while the lounge is live',
    ],
    excluded: [
      'Exhibition space or stand rights on the summit floor itself',
      'An evening entertainment programme',
      'Guest travel, transfers or accommodation',
    ],
  },
  {
    id: 'hospitality',
    name: 'Hospitality Day',
    icon: Trophy,
    img: 'golf-tournament.jpg',
    tagline: 'Six hours beats six minutes on a stand.',
    guests: '30–80 guests',
    min: 30, max: 80, def: 50,
    duration: 'Full day · off site',
    notice: '12 weeks minimum',
    from: 70000,
    bestFor: 'Long-form relationship time away from the show floor — golf, padel, sailing, track or wellness.',
    included: [
      'Activity and venue chosen with you and booked exclusively',
      'Return transfers from the summit or the partner hotels',
      'Full-day food and beverage, including a closing dinner or reception',
      'Branded kit, prizes and on-site signage',
      'Guest list matched to the activity as well as to the seniority brief',
      'Host briefing pack with pairings or team sheets',
      'Photography and video across the day',
      'A NEXT.io event manager and crew on site throughout',
    ],
    excluded: [
      'Flights and accommodation',
      'Equipment hire beyond the standard package',
      'An evening programme beyond the closing dinner',
    ],
  },
  {
    id: 'vip',
    name: 'VIP Side Event',
    icon: PartyPopper,
    img: 'nextworking-day1.jpg',
    tagline: 'The night they talk about the next morning.',
    guests: '150–300 guests',
    min: 150, max: 300, def: 220,
    duration: 'One evening · full production',
    notice: '12 weeks minimum',
    from: 85000,
    bestFor: 'The headline moment of a summit week, running under your name and nobody else’s.',
    included: [
      'A signature venue — rooftop, waterfront, gallery or club — held exclusively',
      'Full production: stage, AV, lighting, sound and scenography',
      'Talent and entertainment booking and management',
      'Full-service food and beverage across the evening',
      'A branded environment end to end, starting at guest arrival',
      'Curated guest list up to 300, invited and chased individually',
      'Hosted event page, RSVP system and the full WhatsApp invite journey',
      'Door, guest list and VIP arrival management',
      'A dedicated NEXT.io event manager and on-site crew',
      'Photography, video and a full post-event report',
    ],
    excluded: [
      'Summit sponsorship rights or delegate passes',
      'Guest travel, transfers or accommodation',
      'Media buying or paid promotion beyond the guest journey',
    ],
  },
  {
    id: 'flagship',
    name: 'Flagship Build',
    icon: Crown,
    img: 'leadership-stage-crowd.jpg',
    tagline: 'When the format does not exist yet.',
    guests: 'Brief-led',
    min: 100, max: 300, def: 200,
    duration: 'One to several days',
    notice: '16 weeks minimum',
    from: null,
    bestFor: 'Anniversaries, launches and city takeovers where the answer is not on this page.',
    included: [
      'Concept development from your objectives, not from a template',
      'Venue search and a shortlist across the host city',
      'Custom build and scenography designed for the brief',
      'Multi-day programming across formats where the brief calls for it',
      'A dedicated NEXT.io project team from first brief to final review',
      'Measurement designed around what you told us success looks like',
      'Everything in the standard formats, wherever the brief needs it',
    ],
    excluded: [
      'Standard turnaround times — bespoke work is scoped before it is quoted',
      'Anything agreed after signature without a priced change note',
    ],
  },
]

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
  { w: 'Week 12', t: 'Brief and qualification', b: 'Objectives, guest criteria, format and budget. We tell you then and there whether we can deliver it.' },
  { w: 'Week 10', t: 'Proposal and venues', b: 'Three researched venues sized to your guest count, with a costed proposal against your brief.' },
  { w: 'Week 8', t: 'Contract and deposit', b: 'Signature and deposit. Only then do we hold the venue and commit to suppliers.' },
  { w: 'Week 6', t: 'Design and build', b: 'Branding, menus, production design and run of show, all signed off by you.' },
  { w: 'Week 4', t: 'Invitations go out', b: 'Event page live, invitations issued, RSVP tracking open and visible to you.' },
  { w: 'Week 2', t: 'Reminders and review', b: 'WhatsApp reminder wave, and a guest list review with you while there is still time to act on it.' },
  { w: 'Week 1', t: 'Final numbers', b: 'Confirmed headcount, seating and flow, and a briefing pack for your team.' },
  { w: 'Event day', t: 'We run it', b: 'A NEXT.io team on site from load-in to load-out, managing the door, the room and the schedule.' },
  { w: 'Week +1', t: 'Report and review', b: 'The post-event report, a debrief, and what we would change for the next one.' },
]

const RESPONSE = [
  { d: '1', t: 'First response', b: 'A named person replies, with the questions we need answered.' },
  { d: '2', t: 'Indicative range', b: 'A budget range for any standard format, so you can take a number into a meeting.' },
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
    q: 'Can you run one at a summit you have not listed?',
    a: 'One 2027 slot is deliberately unallocated for exactly this. Tell us where your buyers gather and we will tell you honestly whether we can staff it to the standard on this page.',
  },
  {
    q: 'How quickly can you turn one around?',
    a: 'Standard formats need eight to twelve weeks depending on the build. If you have hosted with us before, eight weeks is usually enough because we already know how you work.',
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
  const lines = [
    'Hi,',
    '',
    "We'd like to host an event with NEXT.io in 2027. Outline brief below:",
    '',
    `  Summit:        ${smt ? `${smt.name}, ${smt.city} (${smt.dates})` : 'To be discussed'}`,
    `  Format:        ${fmt ? fmt.name : 'To be discussed'}`,
    `  Guests:        ${brief.guests ? `approx. ${brief.guests}` : 'To be discussed'}`,
    fmt ? `  Lead time:     ${fmt.notice}` : null,
    SHOW_INVESTMENT && fmt ? `  Indicative:    ${fmt.from ? `from ${fmtPrice(fmt.from)}` : 'quoted on brief'}` : null,
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
    .header{background:#1a1a1a;color:#fff;padding:44px 48px 36px}
    .logo{font-size:26px;font-weight:900;text-transform:uppercase;letter-spacing:-0.5px}
    .logo span{color:#ffcf33}
    .sub{color:#999;font-size:13px;margin-top:6px}
    .body{padding:36px 48px}
    .label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#999;margin:28px 0 12px}
    .label:first-child{margin-top:0}
    table{width:100%;border-collapse:collapse}
    th{text-align:left;padding:11px 16px;background:#f6f6f6;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#777;width:180px;border-bottom:1px solid #e8e8e8;vertical-align:top}
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
      ${row('Summit', smt ? `${smt.name} — ${smt.city}` : 'To be discussed')}
      ${row('Dates', smt ? smt.dates : 'To be discussed')}
      ${row('Format', fmt ? fmt.name : 'To be discussed')}
      ${row('Guest numbers', brief.guests ? `approx. ${brief.guests}` : 'To be discussed')}
      ${row('Minimum lead time', fmt ? fmt.notice : '8–16 weeks depending on format')}
      ${SHOW_INVESTMENT ? row('Indicative investment', fmt ? (fmt.from ? `from ${'€' + fmt.from.toLocaleString('en-US')}` : 'Quoted on brief') : 'Quoted on brief') : ''}
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
    <strong>Send this back and the clock starts.</strong> First response in one working day, an indicative range in two, a straight answer on deliverability in three, and a full proposal in five once we have everything we have asked for.<br>
    <strong>sales@next.io</strong> &nbsp;&middot;&nbsp; next.io<br>
    Indicative figures are for planning only and exclude VAT. Every event is quoted against its own brief.
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
  const formats = FORMATS.map((f) => `<div class="fmt">
      <div class="fhead">
        <div><h3>${esc(f.name)}</h3><div class="mut">${esc(f.tagline)}</div></div>
        <div class="price">${SHOW_INVESTMENT ? (f.from ? 'from ' + '€' + f.from.toLocaleString('en-US') : 'POA') : ''}</div>
      </div>
      <div class="meta">${esc(f.guests)} &nbsp;&middot;&nbsp; ${esc(f.duration)} &nbsp;&middot;&nbsp; ${esc(f.notice)}</div>
      <p class="best"><strong>Best for:</strong> ${esc(f.bestFor)}</p>
      <div class="cols">
        <div><p class="ch">Included</p><ul>${f.included.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>
        <div><p class="ch">Not included</p><ul class="out">${f.excluded.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>
      </div>
    </div>`).join('')
  const terms = TERMS.map((t) => `<li><strong>${esc(t.t)}.</strong> ${esc(t.b)}</li>`).join('')
  const steps = TIMELINE.map((s) => `<tr><td class="mth">${esc(s.w)}</td><td><strong>${esc(s.t)}</strong><div class="mut">${esc(s.b)}</div></td></tr>`).join('')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>NEXT.io External Projects 2027</title>
  <script>window.addEventListener('load',function(){setTimeout(function(){window.print()},600)});<\/script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;background:#fff;font-size:11.5px;line-height:1.55}
    .cover{background:#1a1a1a;color:#fff;padding:56px 48px}
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
    .price{font-size:14px;font-weight:900;white-space:nowrap}
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
    <p>Partner-funded VIP events, built and run by NEXT.io alongside the summits your buyers already attend. You host it and it carries your brand alone. We find the venue, build it, fill the room from our network, run it on the night and report on who was actually there.</p>
  </div>
  <section><h2>The 2027 calendar</h2><table>${cal}</table>
  <p class="mut">Summit dates are as published by the organisers and are confirmed with them before anything is booked.</p></section>
  <section><h2>Six formats</h2>${formats}</section>
  <section><h2>How the room gets built</h2>
  <p style="margin-bottom:10px">Up to 300 guests per event. We target three quarters of the room at C-level or head-of, and at least eighty per cent matching the criteria you set in writing. Your own list is merged in and de-duplicated. No blanket mailshots.</p>
  <p class="ch">Your post-event report covers</p><ul>${REPORT_IN.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
  <p style="margin-top:10px"><strong>What it does not cover:</strong> your pipeline. We can tell you exactly who walked in, how senior they were and who they met. What that becomes commercially is your process, not our KPI.</p></section>
  <section><h2>From brief to event in twelve weeks</h2><table>${steps}</table>
  <p class="mut">Eight weeks is usually enough if you have hosted with us before.</p></section>
  <section><h2>How we work with you</h2><ol>${terms}</ol></section>
  <div class="foot">
    <strong>Start a brief:</strong> sales@next.io &nbsp;&middot;&nbsp; next.io<br>
    First response in one working day &middot; indicative range in two &middot; a straight answer on deliverability in three &middot; full proposal in five.<br>
    ${SHOW_INVESTMENT ? 'Indicative investment levels are for planning only, exclude VAT, and are based on events we have delivered. Every event is quoted against its own brief.<br>' : ''}
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

const anim = { opacity: 0, transform: 'translateY(20px)', transition: 'opacity .6s ease, transform .6s ease' }

// ─── Format card ──────────────────────────────────────────────────────────
function FormatCard({ f, onSelect, selected, delay }) {
  const [open, setOpen] = useState(false)
  const Icon = f.icon
  return (
    <div
      data-anim
      style={{ ...anim, transitionDelay: `${delay}ms` }}
      className={`rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col ${
        selected ? 'border-brand-yellow bg-brand-yellow/5' : 'border-brand-white/10 bg-brand-white/5 hover:border-brand-yellow/40'
      }`}
    >
      <div className="relative h-48 shrink-0">
        <img alt={f.name} src={`${base}images/${f.img}`} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Icon className="w-5 h-5 text-brand-yellow" />
            <h3 className="text-2xl font-bold uppercase tracking-tight">{f.name}</h3>
          </div>
          <p className="text-brand-yellow text-sm font-medium italic">{f.tagline}</p>
        </div>
      </div>

      <div className="p-6 flex flex-col grow">
        <div className="flex flex-wrap gap-2 mb-4 text-[11px] uppercase tracking-widest font-bold">
          <span className="flex items-center gap-1.5 bg-brand-white/8 border border-brand-white/10 rounded-full px-3 py-1.5">
            <Users className="w-3.5 h-3.5 text-brand-yellow" />{f.guests}
          </span>
          <span className="flex items-center gap-1.5 bg-brand-white/8 border border-brand-white/10 rounded-full px-3 py-1.5">
            <Clock className="w-3.5 h-3.5 text-brand-yellow" />{f.notice}
          </span>
        </div>

        <p className="text-brand-gray text-sm leading-relaxed mb-5">
          <span className="text-brand-white font-semibold">Best for: </span>{f.bestFor}
        </p>

        {SHOW_INVESTMENT && (
          <div className="mb-5 pb-5 border-b border-brand-white/10">
            <p className="text-[10px] uppercase tracking-widest text-brand-gray mb-1">Indicative investment</p>
            <p className="text-3xl font-bold text-brand-yellow leading-none">
              {f.from ? <>from {fmtPrice(f.from)}</> : 'Quoted on brief'}
            </p>
            <p className="text-[11px] text-brand-gray mt-2">{f.duration} · quoted bespoke against your brief</p>
          </div>
        )}

        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center justify-between w-full text-left text-xs uppercase tracking-widest font-bold text-brand-white hover:text-brand-yellow transition-colors mb-3"
        >
          {open ? 'Hide what you get' : 'See what you get'}
          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="mb-5 space-y-4">
            <ul className="space-y-2">
              {f.included.map((i) => (
                <li key={i} className="flex gap-2.5 text-sm text-brand-white/90 leading-snug">
                  <Check className="w-4 h-4 text-brand-yellow shrink-0 mt-0.5" />{i}
                </li>
              ))}
            </ul>
            <div className="rounded-xl bg-brand-dark/60 border border-brand-white/10 p-4">
              <p className="text-[10px] uppercase tracking-widest text-brand-gray mb-2">Not included</p>
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
          className={`mt-auto w-full rounded-full py-3 font-bold text-sm uppercase tracking-widest transition-colors ${
            selected ? 'bg-brand-yellow text-brand-dark' : 'bg-brand-white/10 text-brand-white hover:bg-brand-yellow hover:text-brand-dark'
          }`}
        >
          {selected ? <span className="flex items-center justify-center gap-2"><CircleCheck className="w-4 h-4" />In your brief</span> : 'Add to brief'}
        </button>
      </div>
    </div>
  )
}

// ─── Brief builder ────────────────────────────────────────────────────────
function BriefBuilder({ brief, setBrief }) {
  const fmt = FORMATS.find((f) => f.id === brief.format)

  // Keep the guest count if it still fits the newly chosen format; otherwise drop
  // to that format's typical size rather than pinning to its floor.
  useEffect(() => {
    if (!fmt) return
    setBrief((b) => ({
      ...b,
      guests: b.guests >= fmt.min && b.guests <= fmt.max ? b.guests : fmt.def,
    }))
  }, [brief.format]) // eslint-disable-line react-hooks/exhaustive-deps

  const ready = Boolean(brief.summit && brief.format)

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-6">
        <div data-anim style={anim} className="rounded-2xl bg-brand-white/5 border border-brand-white/10 p-6">
          <p className="text-[11px] uppercase tracking-widest text-brand-gray mb-4">1 · Which summit</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {SUMMITS.map((s) => (
              <button
                key={s.id}
                onClick={() => setBrief((b) => ({ ...b, summit: s.id }))}
                className={`text-left rounded-xl px-4 py-3 border transition-colors ${
                  brief.summit === s.id
                    ? 'border-brand-yellow bg-brand-yellow/10'
                    : 'border-brand-white/10 bg-brand-dark/40 hover:border-brand-yellow/40'
                }`}
              >
                <span className="block font-bold text-sm">{s.name}</span>
                <span className="block text-xs text-brand-gray mt-0.5">{s.city} · {s.dates}</span>
              </button>
            ))}
          </div>
        </div>

        <div data-anim style={anim} className="rounded-2xl bg-brand-white/5 border border-brand-white/10 p-6">
          <p className="text-[11px] uppercase tracking-widest text-brand-gray mb-4">2 · Which format</p>
          <div className="grid sm:grid-cols-3 gap-2">
            {FORMATS.map((f) => {
              const Icon = f.icon
              return (
                <button
                  key={f.id}
                  onClick={() => setBrief((b) => ({ ...b, format: f.id }))}
                  className={`text-left rounded-xl px-4 py-3 border transition-colors ${
                    brief.format === f.id
                      ? 'border-brand-yellow bg-brand-yellow/10'
                      : 'border-brand-white/10 bg-brand-dark/40 hover:border-brand-yellow/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-1.5 ${brief.format === f.id ? 'text-brand-yellow' : 'text-brand-gray'}`} />
                  <span className="block font-bold text-sm leading-tight">{f.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div data-anim style={anim} className="rounded-2xl bg-brand-white/5 border border-brand-white/10 p-6">
          <p className="text-[11px] uppercase tracking-widest text-brand-gray mb-4">3 · Roughly how many guests</p>
          {fmt ? (
            <>
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-5xl font-bold text-brand-yellow leading-none">{brief.guests}</span>
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
              <div className="flex justify-between text-[11px] uppercase tracking-widest text-brand-gray mt-2">
                <span>{fmt.min}</span><span>{fmt.max}</span>
              </div>
            </>
          ) : (
            <p className="text-brand-gray text-sm">Pick a format and the guest range for it appears here.</p>
          )}
        </div>
      </div>

      <div className="lg:col-span-2">
        <div data-anim style={anim} className="rounded-2xl bg-brand-yellow/5 border border-brand-yellow/30 p-6 lg:sticky lg:top-28">
          <p className="text-[11px] uppercase tracking-widest text-brand-gray mb-5">Your outline brief</p>

          <dl className="space-y-4 mb-6">
            {[
              ['Summit', brief.summit ? (() => { const s = SUMMITS.find((x) => x.id === brief.summit); return `${s.name} · ${s.city}` })() : 'Not chosen yet'],
              ['Dates', brief.summit ? SUMMITS.find((x) => x.id === brief.summit).dates : '—'],
              ['Format', fmt ? fmt.name : 'Not chosen yet'],
              ['Guests', fmt ? `approx. ${brief.guests}` : '—'],
              ['Lead time', fmt ? fmt.notice : '8–16 weeks by format'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-brand-white/10 pb-3">
                <dt className="text-xs uppercase tracking-widest text-brand-gray shrink-0">{k}</dt>
                <dd className="text-sm font-semibold text-right">{v}</dd>
              </div>
            ))}
          </dl>

          {SHOW_INVESTMENT && (
            <div className="rounded-xl bg-brand-dark/60 border border-brand-white/10 p-4 mb-6">
              <p className="text-[10px] uppercase tracking-widest text-brand-gray mb-1">Indicative investment</p>
              <p className="text-3xl font-bold text-brand-yellow leading-none">
                {fmt ? (fmt.from ? <>from {fmtPrice(fmt.from)}</> : 'Quoted on brief') : '—'}
              </p>
              <p className="text-[11px] text-brand-gray mt-2 leading-relaxed">
                For planning only, excluding VAT. Your number comes from your brief, not from this page.
              </p>
            </div>
          )}

          <a
            href={buildMailto(brief)}
            className={`flex items-center justify-center gap-2 w-full rounded-full py-3.5 font-bold text-sm uppercase tracking-widest transition-colors mb-3 ${
              ready ? 'bg-brand-yellow text-brand-dark hover:bg-white' : 'bg-brand-white/10 text-brand-gray hover:bg-brand-white/20'
            }`}
          >
            <Mail className="w-4 h-4" />{ready ? 'Send this brief' : 'Email the team'}
          </a>
          <button
            onClick={() => downloadBriefPDF(brief)}
            className="flex items-center justify-center gap-2 w-full rounded-full py-3.5 font-bold text-sm uppercase tracking-widest border border-brand-white/20 hover:border-brand-yellow hover:text-brand-yellow transition-colors"
          >
            <Download className="w-4 h-4" />Print the brief
          </button>
          <p className="text-[11px] text-brand-gray mt-4 leading-relaxed">
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

  const navLinks = useMemo(() => ['What It Is', 'Calendar', 'Formats', 'The Room', 'How It Works', 'Brief'], [])

  return (
    <div className="min-h-screen bg-brand-dark text-brand-white font-sans selection:bg-brand-yellow selection:text-brand-dark">

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-brand-dark/95 backdrop-blur-md py-4 shadow-lg border-b border-brand-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex justify-between items-center gap-3">
          <a href="#" className="flex items-center gap-3 shrink-0">
            <img alt="NEXT.io" className="h-7 sm:h-8 object-contain" src={`${base}logos/next-io.png`} />
            <span className="hidden sm:block text-xs uppercase tracking-[0.2em] text-brand-gray border-l border-brand-white/20 pl-3">
              External Projects
            </span>
          </a>
          <div className="flex items-center gap-6">
            <a href="#formats" className="text-sm font-bold uppercase tracking-widest hover:text-brand-yellow transition-colors hidden md:block">Formats</a>
            <a href="#brief" className="text-sm font-bold uppercase tracking-widest hover:text-brand-yellow transition-colors hidden md:block">Build a Brief</a>
            <a
              href="mailto:sales@next.io?subject=NEXT.io External Projects 2027 - Event Enquiry"
              className="bg-brand-yellow text-brand-dark px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm uppercase tracking-widest hover:bg-white transition-colors whitespace-nowrap"
            >
              Contact Sales
            </a>
          </div>
        </div>
      </nav>

      <main>
        {/* ── HERO ── */}
        <section className="relative min-h-[88vh] flex flex-col items-center justify-center overflow-hidden pt-24 pb-16">
          <div className="absolute inset-0 z-0">
            <img alt="A NEXT.io partner-hosted CxO dinner" src={`${base}images/cxo-event.jpg`} className="w-full h-full object-cover opacity-35" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/85 to-brand-dark/60" />
          </div>
          <div className="z-10 text-center max-w-5xl px-6 sm:px-8 w-full">
            <p className="text-brand-yellow font-bold uppercase tracking-[0.3em] text-xs sm:text-sm mb-6">NEXT.io External Projects · 2027</p>
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tighter uppercase leading-[0.9] mb-6">
              Your Event.<br /><span className="text-brand-yellow">Our Room.</span>
            </h1>
            <p className="text-brand-white/80 text-base sm:text-xl max-w-3xl mx-auto leading-relaxed mb-10">
              Partner-funded VIP events, built and run by NEXT.io alongside the summits your buyers already attend.
              You host it and it carries your brand alone. We find the venue, build it, fill the room from our network,
              run it on the night, and tell you honestly who was there.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mb-12 text-xs sm:text-sm uppercase tracking-widest font-medium">
              {[
                [CalendarDays, 'Five slots in 2027'],
                [Crown, 'One host per event'],
                [Users, 'Up to 300 curated guests'],
                [BadgeCheck, '75% C-level target'],
              ].map(([Icon, label]) => (
                <span key={label} className="flex items-center gap-2 bg-brand-white/5 border border-brand-white/10 rounded-full py-2.5 px-5">
                  <Icon className="w-4 h-4 text-brand-yellow" />{label}
                </span>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <a href="#brief" className="bg-brand-yellow text-brand-dark px-8 py-4 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-white transition-colors flex items-center gap-2">
                Build your brief <ArrowRight className="w-4 h-4" />
              </a>
              <button onClick={downloadBrochurePDF} className="border border-brand-white/25 px-8 py-4 rounded-full font-bold text-sm uppercase tracking-widest hover:border-brand-yellow hover:text-brand-yellow transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" /> Print the brochure
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {navLinks.map((s) => (
                <a
                  key={s}
                  href={`#${s.toLowerCase().replace(/\s+/g, '-')}`}
                  className="text-brand-white hover:text-brand-yellow font-bold uppercase tracking-widest text-xs transition-colors border border-brand-white/15 hover:border-brand-yellow px-5 py-2.5 rounded-full bg-brand-dark/50 backdrop-blur-sm"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHAT IT IS ── */}
        <section id="what-it-is" className="py-24 border-t border-brand-white/10">
          <div className="max-w-7xl mx-auto px-6 sm:px-8">
            <div data-anim style={anim} className="max-w-3xl mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-brand-yellow uppercase mb-4">What This Actually Is</h2>
              <p className="text-brand-gray text-lg leading-relaxed">
                Not a sponsorship. Not a logo on someone else’s banner. An event of your own, in a city where the
                industry has already booked its flights — run end to end by the team that runs the NEXT.io summits.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-20">
              {[
                [Crown, 'You host it', 'It is your event, your brand and your guests. One host per event — no co-sponsors, no shared billing and no competitor standing in the same room.'],
                [Building2, 'We build and run it', 'Venue, food and drink, production, branding, staffing and on-site management. NEXT.io is the organiser of record and carries the operational risk.'],
                [Users, 'We fill the room', 'The guest list comes out of the NEXT.io network and is built against your written brief — then invited, chased and managed on the door.'],
              ].map(([Icon, t, b], i) => (
                <div key={t} data-anim style={{ ...anim, transitionDelay: `${i * 90}ms` }} className="rounded-2xl bg-brand-white/5 border border-brand-white/10 p-8 hover:border-brand-yellow/40 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-brand-yellow/15 flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6 text-brand-yellow" />
                  </div>
                  <h3 className="text-2xl font-bold uppercase mb-3">{t}</h3>
                  <p className="text-brand-gray leading-relaxed">{b}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[
                ['13', 'Events delivered since 2024'],
                ['5', 'Host cities across Europe and the US'],
                ['300', 'Guests at the largest format'],
                ['75%', 'Of the room at C-level or head-of'],
              ].map(([n, l], i) => (
                <div key={l} data-anim style={{ ...anim, transitionDelay: `${i * 80}ms` }} className="text-center px-4 py-8 rounded-xl bg-brand-white/5 border border-brand-white/10 group hover:border-brand-yellow/40 transition-all">
                  <p className="text-4xl md:text-5xl font-bold group-hover:text-brand-yellow transition-colors mb-2 leading-none">{n}</p>
                  <p className="text-brand-gray text-xs md:text-sm uppercase tracking-widest leading-snug">{l}</p>
                </div>
              ))}
            </div>
            <p data-anim style={anim} className="text-brand-gray text-sm mt-6 max-w-3xl leading-relaxed">
              Rome, Barcelona, Malta, London and SBC Summit Americas in Florida. Our longest-standing host has run
              seven of these with us across four cities — which is the number we would rather be judged on than any
              of the others.
            </p>
          </div>
        </section>

        {/* ── CALENDAR ── */}
        <section id="calendar" className="py-24 bg-brand-white/[0.03] border-t border-brand-white/10">
          <div className="max-w-7xl mx-auto px-6 sm:px-8">
            <div data-anim style={anim} className="max-w-3xl mb-14">
              <h2 className="text-4xl md:text-5xl font-bold text-brand-yellow uppercase mb-4">The 2027 Calendar</h2>
              <p className="text-brand-gray text-lg leading-relaxed">
                Five slots, planned against the summits rather than invented on request. Pick the week your buyers are
                already travelling to — one slot is deliberately left open for a summit we have not listed.
              </p>
            </div>

            <div className="space-y-3">
              {SUMMITS.map((s, i) => {
                const st = STATUS_STYLE[s.status]
                const chosen = brief.summit === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => { setBrief((b) => ({ ...b, summit: s.id })); document.getElementById('brief')?.scrollIntoView({ behavior: 'smooth' }) }}
                    data-anim
                    style={{ ...anim, transitionDelay: `${i * 70}ms` }}
                    className={`w-full text-left rounded-2xl border p-6 md:p-7 transition-all duration-300 grid md:grid-cols-12 gap-4 md:gap-6 items-center ${
                      chosen ? 'border-brand-yellow bg-brand-yellow/10' : 'border-brand-white/10 bg-brand-dark/40 hover:border-brand-yellow/40 hover:bg-brand-white/5'
                    }`}
                  >
                    <div className="md:col-span-1">
                      <span className="text-2xl font-bold text-brand-yellow tracking-tight">{s.month}</span>
                    </div>
                    <div className="md:col-span-3">
                      <h3 className="text-xl font-bold uppercase leading-tight">{s.name}</h3>
                      <p className="text-brand-gray text-sm flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-brand-yellow" />{s.city}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm font-semibold">{s.dates}</p>
                    </div>
                    <div className="md:col-span-4">
                      <p className="text-brand-gray text-sm leading-snug">{s.note}</p>
                    </div>
                    <div className="md:col-span-2 md:text-right">
                      <span className={`inline-block text-[10px] font-bold uppercase tracking-widest rounded-full px-3 py-1.5 ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
            <p data-anim style={anim} className="text-brand-gray text-sm mt-6">
              Summit dates are as published by the organisers and are confirmed with them before anything is booked.
            </p>
          </div>
        </section>

        {/* ── FORMATS ── */}
        <section id="formats" className="py-24 border-t border-brand-white/10">
          <div className="max-w-7xl mx-auto px-6 sm:px-8">
            <div data-anim style={anim} className="max-w-3xl mb-14">
              <h2 className="text-4xl md:text-5xl font-bold text-brand-yellow uppercase mb-4">Six Formats, Not a Blank Page</h2>
              <p className="text-brand-gray text-lg leading-relaxed">
                Every one of these has been built and run before, which is why we can tell you what it includes, what
                it does not, and how much notice it needs before you have signed anything.
                {SHOW_INVESTMENT && ' The figures are indicative bands from events we have delivered — your number comes from your brief.'}
              </p>
            </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {FORMATS.map((f, i) => (
                <FormatCard key={f.id} f={f} delay={i * 60} selected={brief.format === f.id} onSelect={selectFormat} />
              ))}
            </div>
          </div>
        </section>

        {/* ── THE ROOM ── */}
        <section id="the-room" className="py-24 bg-brand-white/[0.03] border-t border-brand-white/10">
          <div className="max-w-7xl mx-auto px-6 sm:px-8">
            <div data-anim style={anim} className="max-w-3xl mb-14">
              <h2 className="text-4xl md:text-5xl font-bold text-brand-yellow uppercase mb-4">The Room Is the Product</h2>
              <p className="text-brand-gray text-lg leading-relaxed">
                Any agency can find you a venue. The reason to do this with NEXT.io is the guest list — and the fact
                that we will tell you afterwards how close we got to the one you asked for.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-16">
              {[
                ['300', 'Guests at the largest format'],
                ['75%', 'Target C-level and head-of'],
                ['80%', 'Of your written guest criteria'],
                ['1', 'Host per event — always'],
              ].map(([n, l], i) => (
                <div key={l} data-anim style={{ ...anim, transitionDelay: `${i * 80}ms` }} className="px-5 py-8 rounded-xl bg-brand-white/5 border border-brand-white/10 hover:border-brand-yellow/40 transition-colors">
                  <p className="text-5xl font-bold text-brand-yellow mb-2 leading-none">{n}</p>
                  <p className="text-brand-gray text-xs uppercase tracking-widest leading-snug">{l}</p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-5 gap-6 mb-16">
              {ROOM_STEPS.map((s, i) => {
                const Icon = s.icon
                return (
                  <div key={s.title} data-anim style={{ ...anim, transitionDelay: `${i * 80}ms` }} className="rounded-2xl bg-brand-dark/50 border border-brand-white/10 p-6 hover:border-brand-yellow/40 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="w-9 h-9 rounded-full bg-brand-yellow text-brand-dark font-bold text-sm flex items-center justify-center shrink-0">{i + 1}</span>
                      <Icon className="w-5 h-5 text-brand-yellow" />
                    </div>
                    <h3 className="font-bold uppercase text-lg mb-2 leading-tight">{s.title}</h3>
                    <p className="text-brand-gray text-sm leading-relaxed">{s.body}</p>
                  </div>
                )
              })}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div data-anim style={anim} className="rounded-2xl bg-brand-white/5 border border-brand-white/10 p-8">
                <div className="flex items-center gap-3 mb-5">
                  <Eye className="w-5 h-5 text-brand-yellow" />
                  <h3 className="text-xl font-bold uppercase">What your report covers</h3>
                </div>
                <ul className="space-y-3">
                  {REPORT_IN.map((r) => (
                    <li key={r} className="flex gap-3 text-brand-white/90">
                      <CircleCheck className="w-5 h-5 text-brand-yellow shrink-0 mt-0.5" />{r}
                    </li>
                  ))}
                </ul>
              </div>
              <div data-anim style={{ ...anim, transitionDelay: '90ms' }} className="rounded-2xl bg-brand-yellow/5 border border-brand-yellow/30 p-8">
                <div className="flex items-center gap-3 mb-5">
                  <Target className="w-5 h-5 text-brand-yellow" />
                  <h3 className="text-xl font-bold uppercase">What it does not cover</h3>
                </div>
                <p className="text-brand-white/90 text-lg leading-relaxed mb-4">
                  Your pipeline.
                </p>
                <p className="text-brand-gray leading-relaxed">
                  We can tell you exactly who walked in, how senior they were, who they met and what they thought of
                  the evening. What that becomes commercially is your process, not our KPI — and we would rather say
                  that now than dress an attendance number up as revenue in three months’ time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" className="py-24 border-t border-brand-white/10">
          <div className="max-w-7xl mx-auto px-6 sm:px-8">
            <div data-anim style={anim} className="max-w-3xl mb-14">
              <h2 className="text-4xl md:text-5xl font-bold text-brand-yellow uppercase mb-4">Brief to Event in Twelve Weeks</h2>
              <p className="text-brand-gray text-lg leading-relaxed">
                Twelve weeks is the standard build for a first event. If you have hosted with us before, eight is
                usually enough, because we already know how you work.
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 mb-20">
              {TIMELINE.map((s, i) => (
                <div key={s.w} data-anim style={{ ...anim, transitionDelay: `${(i % 3) * 80}ms` }} className="rounded-2xl bg-brand-white/5 border border-brand-white/10 p-6 hover:border-brand-yellow/40 transition-colors">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-brand-yellow mb-2">{s.w}</p>
                  <h3 className="text-xl font-bold uppercase mb-2 leading-tight">{s.t}</h3>
                  <p className="text-brand-gray text-sm leading-relaxed">{s.b}</p>
                </div>
              ))}
            </div>

            <div data-anim style={anim} className="mb-20">
              <h3 className="text-2xl md:text-3xl font-bold uppercase mb-3">What You Get Back, and How Fast</h3>
              <p className="text-brand-gray mb-8 max-w-3xl">
                Waiting three weeks for a number is what kills these conversations. These are working days, from the
                point we have what we have asked you for.
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {RESPONSE.map((r, i) => (
                  <div key={r.t} data-anim style={{ ...anim, transitionDelay: `${i * 80}ms` }} className="rounded-2xl bg-brand-yellow/5 border border-brand-yellow/25 p-6">
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-5xl font-bold text-brand-yellow leading-none">{r.d}</span>
                      <span className="text-[11px] uppercase tracking-widest text-brand-gray">working {r.d === '1' ? 'day' : 'days'}</span>
                    </div>
                    <h4 className="font-bold uppercase mb-2 leading-tight">{r.t}</h4>
                    <p className="text-brand-gray text-sm leading-relaxed">{r.b}</p>
                  </div>
                ))}
              </div>
            </div>

            <div data-anim style={anim}>
              <h3 className="text-2xl md:text-3xl font-bold uppercase mb-3">How We Work With You</h3>
              <p className="text-brand-gray mb-8 max-w-3xl">
                The rules below exist because they keep events profitable for you and deliverable for us. None of them
                are negotiable at the last minute, which is the whole point of writing them here.
              </p>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {TERMS.map((t, i) => {
                  const Icon = t.icon
                  return (
                    <div key={t.t} data-anim style={{ ...anim, transitionDelay: `${(i % 3) * 80}ms` }} className="rounded-2xl bg-brand-white/5 border border-brand-white/10 p-7 hover:border-brand-yellow/40 transition-colors">
                      <Icon className="w-6 h-6 text-brand-yellow mb-4" />
                      <h4 className="text-lg font-bold uppercase mb-2 leading-tight">{t.t}</h4>
                      <p className="text-brand-gray text-sm leading-relaxed">{t.b}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── BRIEF BUILDER ── */}
        <section id="brief" className="py-24 bg-brand-white/[0.03] border-t border-brand-white/10">
          <div className="max-w-7xl mx-auto px-6 sm:px-8">
            <div data-anim style={anim} className="max-w-3xl mb-14">
              <h2 className="text-4xl md:text-5xl font-bold text-brand-yellow uppercase mb-4">Build Your Brief</h2>
              <p className="text-brand-gray text-lg leading-relaxed">
                Three choices and you have something to send us. It is not a booking — it is the first two emails,
                already written.
              </p>
            </div>
            <BriefBuilder brief={brief} setBrief={setBrief} />
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-24 border-t border-brand-white/10">
          <div className="max-w-4xl mx-auto px-6 sm:px-8">
            <div data-anim style={anim} className="mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-brand-yellow uppercase mb-4">Straight Answers</h2>
              <p className="text-brand-gray text-lg">The questions that come up in the first call, answered before it.</p>
            </div>
            <div className="space-y-3">
              {FAQS.map((f, i) => (
                <div key={f.q} data-anim style={{ ...anim, transitionDelay: `${i * 60}ms` }} className="rounded-2xl border border-brand-white/10 bg-brand-white/5 overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between gap-4 text-left p-6 hover:text-brand-yellow transition-colors"
                    aria-expanded={openFaq === i}
                  >
                    <span className="font-bold text-lg leading-snug">{f.q}</span>
                    <ChevronDown className={`w-5 h-5 shrink-0 text-brand-yellow transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === i && <p className="px-6 pb-6 -mt-1 text-brand-gray leading-relaxed">{f.a}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-24 border-t border-brand-white/10">
          <div className="max-w-5xl mx-auto px-6 sm:px-8 text-center">
            <div data-anim style={anim}>
              <Sparkles className="w-8 h-8 text-brand-yellow mx-auto mb-6" />
              <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tight mb-6 leading-tight">
                Five slots.<br /><span className="text-brand-yellow">One of them is yours.</span>
              </h2>
              <p className="text-brand-gray text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
                Tell us the summit, the format and roughly how many people you want in the room. You will hear back
                from a named person inside one working day.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href="#brief" className="bg-brand-yellow text-brand-dark px-8 py-4 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-white transition-colors flex items-center gap-2">
                  Build your brief <ArrowRight className="w-4 h-4" />
                </a>
                <a href="mailto:sales@next.io?subject=NEXT.io External Projects 2027 - Event Enquiry" className="border border-brand-white/25 px-8 py-4 rounded-full font-bold text-sm uppercase tracking-widest hover:border-brand-yellow hover:text-brand-yellow transition-colors flex items-center gap-2">
                  <Mail className="w-4 h-4" /> sales@next.io
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-brand-white/10 py-12">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <img alt="NEXT.io" className="h-7 object-contain" src={`${base}logos/next-io.png`} />
            <span className="text-xs uppercase tracking-[0.2em] text-brand-gray border-l border-brand-white/20 pl-3">
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
        <p className="max-w-7xl mx-auto px-6 sm:px-8 text-brand-gray/70 text-xs mt-8 leading-relaxed">
          {SHOW_INVESTMENT && 'Indicative investment levels are for planning only, exclude VAT, and are based on events NEXT.io has delivered. Every event is quoted against its own brief. '}
          Summit dates are as published by the organisers and are confirmed before anything is booked. Availability subject to change.
        </p>
      </footer>
    </div>
  )
}
