'use client'

import { useCallback, useMemo, useRef, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'
import type { Entry } from '@/app/page'
import { formatDate } from '@/lib/formatDate'
import { useDarkMode } from '@/lib/useDarkMode'
import SearchOverlay from './SearchOverlay'
import Contents from './Contents'

type Props = { entries: Entry[] }

const NOTE_COLORS = ['#FFF9C4', '#FFE0B2', '#E8F5E9', '#E3F0FF', '#FDE8E8', '#F0EBFF']
const ROTATIONS = [-2.5, 1.5, -1, 2, -1.8, 0.8, -0.5, 2.5, -2, 1]

async function checkPassword(pw: string): Promise<boolean> {
  const res = await fetch('/api/unlock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pw }),
  })
  const { ok } = await res.json()
  return ok
}

function MoonIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function UnlockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  )
}

export default function StickyBoard({ entries }: Props) {
  const transformRef = useRef<ReactZoomPanPinchRef>(null)
  const noteRefs = useRef(new Map<number, HTMLDivElement>())
  const pendingEntryIdRef = useRef<number | null>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)

  const [dark, toggleDark] = useDarkMode()
  const [unlocked, setUnlocked] = useState(false)
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)

  const visibleEntries = useMemo(
    () => unlocked ? entries : entries.filter(e => e.published),
    [entries, unlocked]
  )
  const reversedEntries = useMemo(() => [...visibleEntries].reverse(), [visibleEntries])

  useEffect(() => {
    if (!transformRef.current) return
    transformRef.current.setTransform(-window.innerWidth / 4, 0, 1.5, 0)
  }, [])

  // Focus the password input when the prompt opens
  useEffect(() => {
    if (showPasswordPrompt) setTimeout(() => passwordInputRef.current?.focus(), 50)
  }, [showPasswordPrompt])

  // Clear error after 1.5s
  useEffect(() => {
    if (!passwordError) return
    const t = setTimeout(() => setPasswordError(false), 1500)
    return () => clearTimeout(t)
  }, [passwordError])

  // After unlock, navigate to any pending entry from a search result click
  useEffect(() => {
    if (!unlocked || pendingEntryIdRef.current === null) return
    const entryId = pendingEntryIdRef.current
    pendingEntryIdRef.current = null
    const timer = setTimeout(() => {
      const el = noteRefs.current.get(entryId)
      if (el && transformRef.current) {
        transformRef.current.zoomToElement(el, 2.2, 400, 'easeOut')
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [unlocked])

  // Silently check password 400ms after each keystroke
  useEffect(() => {
    if (!passwordInput.trim()) return
    const timer = setTimeout(async () => {
      try {
        const ok = await checkPassword(passwordInput)
        if (ok) {
          setUnlocked(true)
          setShowPasswordPrompt(false)
          setPasswordInput('')
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
      setShowPasswordPrompt(false)
      setPasswordInput('')
    } else {
      setPasswordError(true)
    }
  }

  function dismissPassword() {
    setShowPasswordPrompt(false)
    setPasswordInput('')
    setPasswordError(false)
  }

  // For Contents — index is into visibleEntries
  const focusNote = useCallback((idx: number) => {
    const entry = visibleEntries[idx]
    const el = entry ? noteRefs.current.get(entry.id) : undefined
    if (el && transformRef.current) {
      transformRef.current.zoomToElement(el, 2.2, 400, 'easeOut')
    }
  }, [visibleEntries])

  // For SearchOverlay — index is into full entries array
  const focusNoteFromAll = useCallback((idx: number) => {
    const entry = entries[idx]
    const el = entry ? noteRefs.current.get(entry.id) : undefined
    if (el && transformRef.current) {
      transformRef.current.zoomToElement(el, 2.2, 400, 'easeOut')
    }
  }, [entries])

  return (
    <div className="sticky-board-root">
      <TransformWrapper
        ref={transformRef}
        initialScale={1}
        initialPositionX={0}
        initialPositionY={0}
        minScale={0.85}
        maxScale={3}
        limitToBounds={true}
        panning={{ velocityDisabled: false }}
      >
        <TransformComponent
          wrapperStyle={{ width: '100vw', height: '100svh' }}
          contentStyle={{ width: '100vw' }}
        >
          <div className="sticky-grid">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dark ? '/mobile-title-dark.png' : '/mobile-title.png'}
              alt=""
              className="sticky-heading"
              draggable={false}
            />
            <div className="sticky-columns">
              {(() => {
                const third = Math.ceil(reversedEntries.length / 3)
                const cols = [
                  reversedEntries.slice(0, third),
                  reversedEntries.slice(third, third * 2),
                  reversedEntries.slice(third * 2),
                ]
                const offsets = [0, third, third * 2]
                return cols.map((colEntries, colIdx) => (
                  <div key={colIdx} className={colIdx === 0 ? 'sticky-col sticky-col--offset-left' : colIdx === 2 ? 'sticky-col sticky-col--offset-right' : 'sticky-col'}>
                    {colEntries.map((entry, j) => {
                      const i = offsets[colIdx] + j
                      const color = NOTE_COLORS[i % NOTE_COLORS.length]
                      const rotation = ROTATIONS[Number(entry.id) % ROTATIONS.length]
                      return (
                        <div
                          key={entry.id}
                          ref={el => { if (el) noteRefs.current.set(entry.id, el) }}
                          className="sticky-note"
                          style={{ background: color, transform: `rotate(${rotation}deg)` }}
                          onDoubleClick={() => {
                            const el = noteRefs.current.get(entry.id)
                            if (el && transformRef.current) {
                              transformRef.current.zoomToElement(el, 2.2, 400, 'easeOut')
                            }
                          }}
                        >
                          <div className="sticky-note-quote">{entry.quote}</div>
                          <div className="sticky-note-meta">
                            <span>{formatDate(entry.logged_date, 'short')}</span>
                            {entry.source_label && (
                              <>
                                {' · '}
                                {entry.resolved_link
                                  ? <a href={entry.resolved_link} target="_blank" rel="noopener noreferrer">{entry.source_label}</a>
                                  : <span>{entry.source_label}</span>
                                }
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))
              })()}
            </div>
          </div>
        </TransformComponent>
      </TransformWrapper>

      <div className="mobile-icon-tray">
        <Contents entries={visibleEntries} flipTo={focusNote} mobile />
        <SearchOverlay
          entries={entries}
          flipTo={focusNoteFromAll}
          unlocked={unlocked}
          maxResults={7}
          onLockClick={(entryId) => {
            pendingEntryIdRef.current = entryId
            setShowPasswordPrompt(true)
          }}
        />
        <button
          className="mobile-icon-btn"
          onClick={() => unlocked ? setUnlocked(false) : setShowPasswordPrompt(p => !p)}
          style={{ color: unlocked ? 'var(--accent)' : undefined }}
          aria-label={unlocked ? 'Lock private entries' : 'Unlock private entries'}
        >
          {unlocked ? <UnlockIcon /> : <LockIcon />}
        </button>
        <button
          className="mobile-icon-btn"
          onClick={toggleDark}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>

      {showPasswordPrompt && !unlocked && createPortal(
        <div
          className="overlay-scrim"
          onClick={e => { if (e.target === e.currentTarget) dismissPassword() }}
          role="dialog"
          aria-modal="true"
          aria-label="Unlock private entries"
        >
          <div
            style={{ width: 'min(88vw, 540px)', padding: '0 1rem' }}
          >
            <form onSubmit={submitPassword} style={{ display: 'flex' }}>
              <input
                ref={passwordInputRef}
                type="password"
                value={passwordInput}
                onChange={e => { setPasswordInput(e.target.value); setPasswordError(false) }}
                onKeyDown={e => { if (e.key === 'Escape') dismissPassword() }}
                placeholder="password"
                style={{
                  flex: 1,
                  background: 'var(--page-bg)',
                  border: 'none',
                  borderBottom: passwordError
                    ? '1px solid rgba(192,24,42,0.6)'
                    : '1px solid rgba(0,0,0,0.12)',
                  padding: '0.9rem 1rem',
                  fontFamily: 'var(--font-hand)',
                  fontSize: '1.05rem',
                  color: 'var(--ink)',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{
                  background: 'var(--page-bg)',
                  border: 'none',
                  borderBottom: passwordError
                    ? '1px solid rgba(192,24,42,0.6)'
                    : '1px solid rgba(0,0,0,0.12)',
                  padding: '0.9rem 1.4rem',
                  fontFamily: 'var(--font-hand)',
                  fontSize: '1rem',
                  color: 'var(--text-date)',
                  cursor: 'pointer',
                }}
              >
                go
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
