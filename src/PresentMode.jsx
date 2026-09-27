// ─── Present mode (26 Sep 2026) ───────────────────────────────────────────
// A full-screen walk-through for a screen share: cover, what it is, the
// format, every calendar slot, how it works, questions, then how to start.
// App builds the slides from the page's own arrays (buildSlides in App.jsx),
// so a new slot appears in the deck automatically and nothing on a slide is a
// new claim. This file is the shell only: the URL, the keys, swipe, focus,
// scroll locking, reduced motion and the slide list. It follows the shared
// reference behaviour; the classes are this brochure's low-lit gold look
// (glass, spill, grain, gold-text).
//
// Open:   ?present             -> the first slide
//         ?present=<slide id>  -> that slide (a product slide's id is its card
//                                 anchor: formats, slot-<id>)
// Keys:   → Space PageDown = next · ← PageUp = back · Home End · G = all
//         slides · Esc = close (closes the slide list first when it is open)
// Touch:  swipe left or right; the slide itself scrolls vertically.

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight, LayoutGrid, Link2, Check } from 'lucide-react'

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// The URL carries the open slide, so the address bar can be copied to send the
// exact slide. replaceState only: opening and moving through the deck are not
// navigations, and Back should not step through slides.
export function readPresentParam() {
  try {
    const p = new URLSearchParams(window.location.search)
    return p.has('present') ? (p.get('present') || '') : null
  } catch { return null }
}
export function writePresentParam(id) {
  try {
    const url = new URL(window.location.href)
    if (id === null) url.searchParams.delete('present')
    else url.searchParams.set('present', id)
    window.history.replaceState(window.history.state, '', url)
  } catch { /* no URL access: the deck still works */ }
}

// App-side state: `present` is null (closed), '' (first slide) or a slide id.
export function usePresent() {
  const [present, setPresent] = useState(readPresentParam)
  const open = useCallback((id = '') => { writePresentParam(id); setPresent(id) }, [])
  const close = useCallback(() => { writePresentParam(null); setPresent(null) }, [])
  return { present, open, close }
}

// ─── Copy link ──────────────────────────────────────────────────────────────
// This page and the card's anchor. Never the present parameter.
export function linkTo(id) {
  const url = new URL(window.location.href)
  url.searchParams.delete('present')
  url.hash = id
  return url.href
}
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch { /* fall back below */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '-1000px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch { return false }
}

// Quiet by default: small tracked capitals in grey that turn gold on hover, so
// it never competes with a price or an Add to brief button. `getLink` copies
// something other than a card anchor (the brief link).
export const QUIET_ACTION = 'inline-flex items-center gap-1.5 min-h-10 rounded-full px-3 text-[10px] font-bold uppercase tracking-[0.2em] whitespace-nowrap text-brand-gray hover:text-brand-yellow focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-yellow transition-colors'

export function CopyLinkButton({ id, getLink, label = 'Copy link', title = 'Copy a link to this', className = QUIET_ACTION }) {
  const [state, setState] = useState(null) // null | 'ok' | 'fail'
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const onClick = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    const ok = await copyText(getLink ? getLink() : linkTo(id))
    setState(ok ? 'ok' : 'fail')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setState(null), 1800)
  }
  return (
    <button type="button" onClick={onClick} title={title} className={className}>
      {state === 'ok' ? <Check className="w-3.5 h-3.5 shrink-0" aria-hidden /> : <Link2 className="w-3.5 h-3.5 shrink-0" aria-hidden />}
      <span aria-live="polite">{state === 'ok' ? 'Link copied' : state === 'fail' ? 'Copy failed' : label}</span>
    </button>
  )
}

// ─── The deck ───────────────────────────────────────────────────────────────
// slides: [{ id, label, group, ...anything renderSlide needs }]
//   id     unique; product slides use the card anchor
//   label  short title, shown on the Next button and in the slide list
//   group  heading the slide sits under in the slide list
// renderSlide(slide, { go, goId, close, index }) returns the slide body.
export function PresentMode({ slides, startId, onClose, renderSlide, title, logo = null }) {
  const [i, setI] = useState(() => {
    const at = slides.findIndex((s) => s.id === startId)
    return at >= 0 ? at : 0
  })
  const [listOpen, setListOpen] = useState(false)
  const [dir, setDir] = useState(0)
  const boxRef = useRef(null)
  const bodyRef = useRef(null)
  const touch = useRef(null)
  const last = slides.length - 1
  const slide = slides[Math.min(i, last)]

  const go = useCallback((n) => {
    setI((cur) => {
      const next = Math.max(0, Math.min(last, typeof n === 'function' ? n(cur) : n))
      setDir(next > cur ? 1 : next < cur ? -1 : 0)
      return next
    })
    setListOpen(false)
  }, [last])
  const goId = useCallback((id) => {
    const at = slides.findIndex((s) => s.id === id)
    if (at >= 0) go(at)
  }, [slides, go])

  // The deck can gain a slide while it is open (Your brief appears once the
  // brief has a slot or a format). Stay on the slide that is showing: adjusted
  // during render, so the wrong slide never paints for a frame.
  const [prevSlides, setPrevSlides] = useState(slides)
  if (slides !== prevSlides) {
    const showingId = prevSlides[Math.min(i, prevSlides.length - 1)]?.id
    setPrevSlides(slides)
    const at = slides.findIndex((s) => s.id === showingId)
    if (at >= 0 && at !== i) setI(at)
  }

  // the address bar follows the slide
  const slideId = slide ? slide.id : null
  useEffect(() => { if (slideId !== null) writePresentParam(slideId) }, [slideId])
  // a new slide starts at its top
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = 0 }, [i])

  // keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = (e.target && e.target.tagName) || ''
      const typing = /INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable)
      if (e.key === 'Escape') { e.preventDefault(); if (listOpen) setListOpen(false); else onClose(); return }
      if (typing) return
      // Space on a focused button presses it; only an unfocused Space turns the page
      const onControl = tag === 'BUTTON' || tag === 'A'
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !onControl)) { e.preventDefault(); go((c) => c + 1) }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go((c) => c - 1) }
      else if (e.key === 'Home') { e.preventDefault(); go(0) }
      else if (e.key === 'End') { e.preventDefault(); go(last) }
      else if (e.key === 'g' || e.key === 'G') { e.preventDefault(); setListOpen((v) => !v) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, last, listOpen, onClose])

  // Back or Forward to an address without ?present closes the deck
  useEffect(() => {
    const onPop = () => { if (readPresentParam() === null) onClose() }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [onClose])

  // the page behind stays still and out of the tab order; focus returns to
  // whatever opened the deck
  useEffect(() => {
    const root = document.getElementById('root')
    const html = document.documentElement
    const prevOverflow = html.style.overflow
    const opener = document.activeElement
    html.style.overflow = 'hidden'
    if (root) root.setAttribute('inert', '')
    boxRef.current?.focus()
    return () => {
      html.style.overflow = prevOverflow
      if (root) root.removeAttribute('inert')
      if (opener && typeof opener.focus === 'function') opener.focus()
    }
  }, [])

  const onTouchStart = (e) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY } }
  const onTouchEnd = (e) => {
    const s = touch.current
    touch.current = null
    if (!s) return
    const t = e.changedTouches[0]
    const dx = t.clientX - s.x
    const dy = t.clientY - s.y
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go((c) => c + (dx < 0 ? 1 : -1))
  }

  if (!slide) return null
  const next = slides[i + 1]
  const groups = slides.reduce((acc, s, n) => {
    const g = acc[acc.length - 1]
    if (g && g.group === s.group) g.items.push([s, n])
    else acc.push({ group: s.group, items: [[s, n]] })
    return acc
  }, [])

  return createPortal(
    <div ref={boxRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`${title}, presentation`}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      className="grain fixed inset-0 z-[300] flex flex-col bg-brand-dark text-brand-white font-sans outline-none"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* low, warm light: the page's gold spills and vignette */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="spill w-[42rem] h-[42rem] -top-72 -left-56 opacity-70" />
        <div className="spill w-[36rem] h-[36rem] -bottom-72 -right-48 opacity-45" />
      </div>

      {/* top bar: what this is, where you are, the way out */}
      <header className="relative z-10 flex items-center gap-3 border-b border-brand-white/8 bg-brand-dark/60 backdrop-blur-xl px-4 sm:px-8 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {logo}
          <span className="hidden sm:block truncate text-[11px] font-bold uppercase tracking-[0.3em] text-brand-gray">{title}</span>
        </div>
        <button type="button" onClick={() => setListOpen((v) => !v)} aria-expanded={listOpen}
          className="inline-flex items-center gap-2 min-h-11 rounded-full border border-brand-white/15 px-3.5 sm:px-4 text-[11px] font-bold uppercase tracking-[0.18em] tabular-nums hover:border-brand-yellow hover:text-brand-yellow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow transition-colors">
          <LayoutGrid className="w-4 h-4" aria-hidden />{i + 1} / {slides.length}
          <span className="sr-only">, show all slides</span>
        </button>
        <button type="button" onClick={onClose} aria-label="Close the presentation"
          className="inline-flex items-center gap-2 min-h-11 min-w-11 justify-center rounded-full px-3 text-brand-white/80 hover:bg-brand-white/10 hover:text-brand-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow transition-colors">
          <X className="w-5 h-5" aria-hidden /><span className="hidden md:inline text-[10px] font-bold uppercase tracking-[0.2em] text-brand-gray">Esc</span>
        </button>
      </header>

      {/* the slide */}
      <main ref={bodyRef} className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        <div key={slide.id}
          className="mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center px-5 sm:px-10 py-6 sm:py-9 sm:short:py-5"
          style={reducedMotion() ? undefined : { animation: `pm-in-${dir < 0 ? 'back' : 'fwd'} .28s ease-out both` }}>
          {renderSlide(slide, { go, goId, close: onClose, index: i })}
        </div>
      </main>

      {/* bottom bar: back, how far along, next */}
      <footer className="relative z-10 border-t border-brand-white/8 bg-brand-dark/60 backdrop-blur-xl">
        <div className="h-0.5 bg-brand-white/10" aria-hidden>
          <div className="h-full bg-gradient-to-r from-brand-gold via-brand-yellow to-brand-champagne shadow-[0_0_12px_rgba(255,207,51,0.6)] transition-[width] duration-300" style={{ width: `${((i + 1) / slides.length) * 100}%` }} />
        </div>
        <div className="flex items-center gap-3 px-4 sm:px-8 py-2.5">
          <button type="button" onClick={() => go((c) => c - 1)} disabled={i === 0} aria-label="Previous slide"
            className="inline-flex items-center justify-center gap-1.5 min-h-11 min-w-11 rounded-full border border-brand-white/15 px-3 sm:px-5 text-[11px] font-bold uppercase tracking-[0.2em] disabled:opacity-30 enabled:hover:border-brand-yellow enabled:hover:text-brand-yellow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow transition-colors">
            <ChevronLeft className="w-5 h-5" aria-hidden /><span className="hidden sm:inline">Back</span>
          </button>
          <p className="min-w-0 flex-1 truncate text-center text-[10px] font-bold uppercase tracking-[0.25em] text-brand-gray">{slide.group}</p>
          <button type="button" onClick={() => go((c) => c + 1)} disabled={!next}
            className="inline-flex max-w-[62%] items-center justify-center gap-1.5 min-h-11 rounded-full bg-brand-yellow px-4 sm:px-6 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-dark disabled:opacity-30 enabled:hover:bg-brand-champagne focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow shadow-[0_18px_50px_-22px_rgba(255,207,51,0.8)] transition-colors">
            <span className="truncate">{next ? <><span className="hidden md:inline opacity-70">Next: </span>{next.label}</> : 'End'}</span>
            <ChevronRight className="w-5 h-5 shrink-0" aria-hidden />
          </button>
        </div>
      </footer>

      {/* every slide, grouped: jump straight to whatever the buyer asks about */}
      {listOpen && (
        <div className="absolute inset-0 z-20 flex flex-col bg-brand-dark/[0.97] backdrop-blur-md" role="dialog" aria-label="All slides">
          <div className="flex items-center justify-between gap-3 border-b border-brand-white/8 px-4 sm:px-8 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-brand-yellow">All slides</p>
            <button type="button" onClick={() => setListOpen(false)} aria-label="Close the slide list"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-brand-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow"><X className="w-5 h-5" aria-hidden /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
            <div className="mx-auto max-w-6xl sm:columns-2 lg:columns-3 gap-8">
              {groups.map((g, gi) => (
                <div key={`${g.group}-${gi}`} className="mb-6 break-inside-avoid">
                  <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.3em] text-brand-yellow/90">{g.group}</p>
                  <ul>
                    {g.items.map(([s, n]) => (
                      <li key={s.id}>
                        <button type="button" onClick={() => go(n)} aria-current={n === i ? 'step' : undefined}
                          className={`flex w-full min-h-11 items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-brand-yellow ${n === i ? 'bg-brand-yellow text-brand-dark font-bold' : 'text-brand-white/85 hover:bg-brand-white/[0.06] hover:text-brand-yellow'}`}>
                          <span className={`w-7 shrink-0 text-right text-xs tabular-nums ${n === i ? 'text-brand-dark/70' : 'text-brand-gray'}`}>{n + 1}</span>
                          <span className="min-w-0">{s.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}
