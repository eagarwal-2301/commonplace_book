'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Entry } from '@/app/page'
import type { SearchResult } from '@/lib/search'
import { formatDate } from '@/lib/formatDate'

type Props = {
  entries: Entry[]
  flipTo: (index: number) => void
  unlocked: boolean
  onLockClick: (entryId: number) => void
  maxResults?: number
}

export default function SearchOverlay({ entries, flipTo, unlocked, onLockClick, maxResults }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setResults([])
    setSearched(false)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [close])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  async function runSearch() {
    if (!query.trim()) return
    setLoading(true)
    setSearched(false)
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query }),
      })
      const data = await res.json()
      const all: SearchResult[] = data.results ?? []
      const display = (all.length <= 1 || all[0].sem_dist < 0.20
        ? all.slice(0, 1)
        : all
      ).slice(0, maxResults ?? all.length)
      setResults(display)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }

  function handleResultClick(result: SearchResult) {
    if (!result.published && !unlocked) {
      onLockClick(result.id)
      close()
      return
    }
    const idx = entries.findIndex(e => e.id === result.id)
    if (idx !== -1) flipTo(idx)
    close()
  }

  return (
    <>
      <button className="icon-btn icon-btn-search" onClick={() => setOpen(true)} aria-label="Search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>

      {open && (
        <div
          className="overlay-scrim"
          onClick={e => { if (e.target === e.currentTarget) close() }}
          role="dialog"
          aria-modal="true"
          aria-label="Search entries"
        >
          <div
            style={{ width: 'min(88vw, 540px)', padding: '0 1rem' }}
          >
            <div style={{ display: 'flex' }}>
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setSearched(false); setResults([]) }}
                onKeyDown={e => { if (e.key === 'Enter') runSearch() }}
                style={{
                  flex: 1,
                  background: 'var(--page-bg)',
                  border: 'none',
                  borderBottom: '1px solid rgba(0,0,0,0.12)',
                  padding: '0.9rem 1rem',
                  fontFamily: 'var(--font-hand)',
                  fontSize: '1.05rem',
                  color: 'var(--ink)',
                  outline: 'none',
                }}
              />
              <button
                onClick={runSearch}
                style={{
                  background: 'var(--page-bg)',
                  border: 'none',
                  borderBottom: '1px solid rgba(0,0,0,0.12)',
                  padding: '0.9rem 1.4rem',
                  fontFamily: 'var(--font-hand)',
                  fontSize: '1rem',
                  color: 'var(--text-date)',
                  cursor: 'pointer',
                }}
              >
                go
              </button>
            </div>

            {loading && (
              <div style={{ color: 'rgba(255,255,255,0.4)', padding: '1rem', fontFamily: 'var(--font-hand)', fontSize: '0.9rem' }}>
                searching…
              </div>
            )}

            {!loading && searched && results.length === 0 && (
              <div style={{ color: 'rgba(255,255,255,0.3)', padding: '1rem', fontFamily: 'var(--font-hand)', fontSize: '0.9rem' }}>
                nothing found
              </div>
            )}

            {results.length > 0 && (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, marginTop: '0.5rem', maxHeight: 'calc(70vh - 60px)', overflowY: 'auto' }}>
                {results.map(r => {
                  const isLocked = !r.published && !unlocked
                  if (isLocked) {
                    const words = r.quote.split(' ')
                    const clear = words.slice(0, 3).join(' ')
                    const blurred = words.slice(3).join(' ')
                    return (
                      <li key={r.id}>
                        <button
                          onClick={() => handleResultClick(r)}
                          className="cursor-key"
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            background: 'rgba(255,255,255,0.04)',
                            border: 'none',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            padding: '0.9rem 1rem',
                            cursor: undefined,
                          }}
                        >
                          <div style={{ fontFamily: 'var(--font-cursive)', fontSize: '1.1rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.7)' }}>
                            {clear}{blurred && (
                              <span style={{ filter: 'blur(5px)', userSelect: 'none', color: 'rgba(255,255,255,0.6)' }}>
                                {' '}{blurred}
                              </span>
                            )}
                          </div>
                          <div style={{ fontFamily: 'var(--font-hand)', fontSize: '0.9rem', color: 'rgba(255,255,255,0.25)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            private
                          </div>
                        </button>
                      </li>
                    )
                  }

                  return (
                    <li key={r.id}>
                      <button
                        onClick={() => handleResultClick(r)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          background: 'rgba(255,255,255,0.06)',
                          border: 'none',
                          borderBottom: '1px solid rgba(255,255,255,0.06)',
                          padding: '0.9rem 1rem',
                          cursor: 'pointer',
                          color: 'rgba(255,255,255,0.85)',
                        }}
                      >
                        <div style={{ fontFamily: 'var(--font-cursive)', fontSize: '1.1rem', marginBottom: '0.35rem', lineHeight: 1.6 }}>
                          {r.quote.slice(0, 80)}{r.quote.length > 80 ? '…' : ''}
                        </div>
                        <div style={{ fontFamily: 'var(--font-hand)', fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', display: 'flex', gap: '1rem' }}>
                          <span>{formatDate(r.logged_date, 'short')}</span>
                          {r.source_label && <span>{r.source_label}</span>}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  )
}
