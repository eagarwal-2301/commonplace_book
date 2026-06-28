'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import type { Entry } from '@/app/page'
import { paginate } from '@/lib/paginate'
import { useDarkMode } from '@/lib/useDarkMode'
import PageComponent from './Page'
import SearchOverlay from './SearchOverlay'
import Contents from './Contents'

type Props = { entries: Entry[] }

async function checkPassword(pw: string): Promise<boolean> {
  const res = await fetch('/api/unlock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pw }),
  })
  const { ok } = await res.json()
  return ok
}

const PAGE_W = 440
const PAGE_H = 600

function CoverPage() {
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <img
        src="/front.png"
        alt="Eesha's Commonplace Notebook"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </div>
  )
}

function BackCover() {
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <img
        src="/back.png"
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </div>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
    </svg>
  )
}

function KeyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="M21 2l-9.6 9.6" />
      <path d="M15.5 7.5l3 3L22 7l-3-3" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function UnlockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  )
}

export default function Notebook({ entries }: Props) {
  const bookRef = useRef<HTMLDivElement>(null)
  const flipperRef = useRef<any>(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [ready, setReady] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)

  const [dark, toggleDark] = useDarkMode()

  // Lock state
  const [unlocked, setUnlocked] = useState(false)
  const [justUnlocked, setJustUnlocked] = useState(false)
  const pendingEntryIdRef = useRef<number | null>(null)
  const unlockNavigateRef = useRef(false)

  const SPARKLES = useMemo(() =>
    Array.from({ length: 28 }, (_, i) => {
      const angle = (i / 28) * Math.PI * 2
      const ring = 0.15 + (i % 5) * 0.09
      return {
        id: i,
        x: 50 + Math.cos(angle) * ring * 55,
        y: 50 + Math.sin(angle) * ring * 55,
        size: 7 + (i % 5) * 2.5,
        delay: `${(i * 0.055) % 1.3}s`,
        dur: `${0.55 + (i % 4) * 0.14}s`,
      }
    }),
  [])
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [lineUnlocking, setLineUnlocking] = useState(false)
  const passwordInputRef = useRef<HTMLInputElement>(null)

  const visibleEntries = useMemo(
    () => unlocked ? entries : entries.filter(e => e.published),
    [entries, unlocked]
  )

  const { pages, entryPageMap } = useMemo(() => paginate(visibleEntries), [visibleEntries])

  const flipToNext = useCallback(() => {
    flipperRef.current?.flipNext()
  }, [])

  const flipToPrev = useCallback(() => {
    flipperRef.current?.flipPrev()
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (reducedMotion || !bookRef.current) return
    let pf: any

    import('page-flip').then(({ PageFlip }) => {
      if (!bookRef.current) return
      pf = new PageFlip(bookRef.current, {
        width: PAGE_W,
        height: PAGE_H,
        size: 'fixed',
        showCover: true,
        useMouseEvents: true,
        drawShadow: true,
        flippingTime: 600,
        usePortrait: true,
        startPage: 0,
      })
      pf.loadFromHTML(bookRef.current.querySelectorAll('.page-element'))
      pf.on('flip', (e: any) => {
        setCurrentPage(typeof e.data === 'number' ? e.data : 0)
      })
      flipperRef.current = pf
      setReady(true)
    })

    return () => { setReady(false); try { pf?.destroy() } catch {} }
  }, [reducedMotion, pages.length, unlocked])

  useEffect(() => {
    if (reducedMotion) return
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight') flipToNext()
      if (e.key === 'ArrowLeft') flipToPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [reducedMotion, flipToNext, flipToPrev])

  const flipTo = useCallback((entryIndex: number) => {
    const pageIndex = entryPageMap.get(entryIndex) ?? 0
    if (reducedMotion) {
      document.getElementById(`page-${pageIndex}`)?.scrollIntoView({ behavior: 'smooth' })
    } else {
      flipperRef.current?.flip(pageIndex + 1)
    }
  }, [reducedMotion, entryPageMap])

  useEffect(() => {
    if (showPasswordPrompt) setTimeout(() => passwordInputRef.current?.focus(), 50)
  }, [showPasswordPrompt])

  useEffect(() => {
    if (!passwordError) return
    const t = setTimeout(() => setPasswordError(false), 1500)
    return () => clearTimeout(t)
  }, [passwordError])

  // Reset page position when lock state changes
  useEffect(() => { setCurrentPage(0) }, [unlocked])

  // After unlock reinit: flip to pending search result, or to first page if none
  useEffect(() => {
    if (!ready) return
    if (pendingEntryIdRef.current !== null) {
      const entryIdx = visibleEntries.findIndex(e => e.id === pendingEntryIdRef.current)
      if (entryIdx < 0) { pendingEntryIdRef.current = null; return }
      const timer = setTimeout(() => {
        flipTo(entryIdx)
        pendingEntryIdRef.current = null
      }, 800)
      return () => clearTimeout(timer)
    }
    if (unlockNavigateRef.current) {
      unlockNavigateRef.current = false
      const timer = setTimeout(() => {
        flipperRef.current?.flip(1)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [ready, visibleEntries, entryPageMap, flipTo])

  // Silently check password 400ms after each keystroke — unlock immediately if correct, do nothing if wrong
  useEffect(() => {
    if (!passwordInput.trim()) return
    const timer = setTimeout(async () => {
      try {
        const ok = await checkPassword(passwordInput)
        if (ok) {
          setUnlocked(true)
          setJustUnlocked(true)
          unlockNavigateRef.current = true
          setLineUnlocking(true)
          setTimeout(() => { setShowPasswordPrompt(false); setPasswordInput(''); setLineUnlocking(false) }, 350)
        }
      } catch {}
    }, 400)
    return () => clearTimeout(timer)
  }, [passwordInput])

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!passwordInput.trim()) return
    const ok = await checkPassword(passwordInput).catch(() => false)
    if (ok) {
      setUnlocked(true)
      setJustUnlocked(true)
      unlockNavigateRef.current = true
      setLineUnlocking(true)
      setTimeout(() => { setShowPasswordPrompt(false); setPasswordInput(''); setLineUnlocking(false) }, 350)
    } else {
      setPasswordError(true)
    }
  }

  function dismissPassword() {
    setShowPasswordPrompt(false)
    setPasswordInput('')
    setPasswordError(false)
  }

  const icons = (
    <>
      <div className="icon-nav">
        <Contents entries={visibleEntries} flipTo={flipTo} />
        <SearchOverlay entries={entries} flipTo={flipTo} unlocked={unlocked} onLockClick={(entryId) => {
          pendingEntryIdRef.current = entryId
          setShowPasswordPrompt(true)
        }} />
        <button
          className={`icon-btn icon-btn-lock${!unlocked ? ' cursor-key' : ''}`}
          onClick={() => unlocked ? setUnlocked(false) : setShowPasswordPrompt(p => !p)}
          aria-label={unlocked ? 'Lock private entries' : 'Unlock private entries'}
        >
          {unlocked ? <UnlockIcon /> : <LockIcon />}
        </button>
        <button
          className="icon-btn"
          onClick={toggleDark}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </>
  )

  if (reducedMotion) {
    return (
      <>
        {icons}
        <div
          className="scroll-fallback"
          style={{ maxWidth: PAGE_W, margin: '0 auto', padding: '2rem 0' }}
          role="document"
          aria-label="Commonplace book entries"
        >
          <div style={{ height: PAGE_H, marginBottom: '1rem', overflow: 'hidden' }}>
            <img
              src="/front.png"
              alt="Eesha's Commonplace Notebook"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
          {pages.map((page, i) => (
            <div key={i} id={`page-${i}`} style={{ height: PAGE_H, marginBottom: '1rem', boxShadow: '2px 2px 12px rgba(0,0,0,0.4)' }}>
              <PageComponent page={page} pageIndex={i} />
            </div>
          ))}
        </div>
      </>
    )
  }

  const contentPages = pages.map((page, i) => (
    <div key={i} className="page-element" style={{ width: PAGE_W, height: PAGE_H }}>
      <PageComponent page={page} pageIndex={i} />
    </div>
  ))
  if (contentPages.length % 2 !== 0) {
    contentPages.push(
      <div key="blank" className="page-element" style={{ width: PAGE_W, height: PAGE_H }}>
        <div className="lined-page" style={{ width: '100%', height: '100%' }} />
      </div>
    )
  }

  const allPages = [
    <div key="cover" className="page-element" style={{ width: PAGE_W, height: PAGE_H }}>
      <CoverPage />
    </div>,
    ...contentPages,
    <div key="back" className="page-element" style={{ width: PAGE_W, height: PAGE_H }}>
      <BackCover />
    </div>,
  ]

  function closeToFront() {
    if (!flipperRef.current || currentPage <= 0) return
    if (currentPage > 3) {
      flipperRef.current.flip(Math.floor(currentPage * 0.3))
      setTimeout(() => flipperRef.current?.flip(0), 280)
    } else {
      flipperRef.current.flip(0)
    }
  }

  function closeToBack() {
    if (!flipperRef.current) return
    const last = allPages.length - 1
    if (currentPage >= last) return
    const remaining = last - currentPage
    if (remaining > 3) {
      flipperRef.current.flip(currentPage + Math.floor(remaining * 0.7))
      setTimeout(() => flipperRef.current?.flip(last), 280)
    } else {
      flipperRef.current.flip(last)
    }
  }

  return (
    <>
      {icons}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
      <div
        role="document"
        aria-label="Eesha's Commonplace Book"
        style={{
          position: 'relative',
          width: PAGE_W * 2,
          height: PAGE_H,
          transform: currentPage === 0
            ? `translateX(-${PAGE_W / 2}px)`
            : currentPage >= allPages.length - 1
              ? `translateX(${PAGE_W / 2}px)`
              : 'translateX(0)',
          transition: 'transform 0.5s ease',
        }}
        onDoubleClick={(e) => {
          const x = e.clientX - e.currentTarget.getBoundingClientRect().left
          if (x < PAGE_W) closeToFront(); else closeToBack()
        }}
      >
        <div key={`pf-${unlocked}`} ref={bookRef} className="page-flip-container" style={{ width: '100%', height: '100%' }}>
          {allPages}
        </div>
        <div className="book-depth-overlay" />
        {justUnlocked && (
          <>
            <div className="unlock-glow" onAnimationEnd={() => setJustUnlocked(false)} />
            <div className="unlock-shimmer" />
            {SPARKLES.map(s => (
              <div
                key={s.id}
                className="sparkle-dot"
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  width: s.size,
                  height: s.size,
                  '--delay': s.delay,
                  '--dur': s.dur,
                } as React.CSSProperties}
              />
            ))}
          </>
        )}

        {ready && (
          <>
            <button
              onClick={flipToPrev}
              onDoubleClick={(e) => { e.stopPropagation(); closeToFront() }}
              aria-label="Previous page"
              className="page-nav-btn"
              style={{ position: 'absolute', left: -44, top: '50%', transform: 'translateY(-50%)' }}
            >
              ‹
            </button>
            <button
              onClick={flipToNext}
              onDoubleClick={(e) => { e.stopPropagation(); closeToBack() }}
              aria-label="Next page"
              className="page-nav-btn"
              style={{ position: 'absolute', right: -44, top: '50%', transform: 'translateY(-50%)' }}
            >
              ›
            </button>
            {currentPage >= allPages.length - 1 && (
              <button
                onClick={() => flipperRef.current?.flip(0)}
                aria-label="Back to front cover"
                className="back-to-start-btn"
                style={{ position: 'absolute', bottom: -36, left: '50%', transform: 'translateX(-50%)' }}
              >
                ↩ back to start
              </button>
            )}
          </>
        )}
      </div>
      {showPasswordPrompt && !unlocked && (
        <form onSubmit={submitPassword} style={{ width: 320, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input
            ref={passwordInputRef}
            type="password"
            value={passwordInput}
            className={`password-input${passwordError ? ' error' : ''}${lineUnlocking ? ' unlock-line-input' : ''}`}
            onChange={e => { setPasswordInput(e.target.value); setPasswordError(false) }}
            onKeyDown={e => { if (e.key === 'Escape') dismissPassword() }}
          />
          <button
            type="submit"
            aria-label="Unlock"
            className="page-nav-btn"
            style={{ position: 'static', fontSize: '1rem', padding: 0, lineHeight: 0 }}
          >
            <KeyIcon />
          </button>
        </form>
      )}
      </div>
    </>
  )
}
