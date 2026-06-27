'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Entry } from '@/app/page'
import { formatDate } from '@/lib/formatDate'

type Props = {
  entries: Entry[]
  flipTo: (index: number) => void
  dark: boolean
}

function groupByMonth(entries: Entry[]) {
  const groups = new Map<string, { entry: Entry; index: number }[]>()
  entries.forEach((entry, index) => {
    const d = new Date(entry.logged_date + 'T12:00:00')
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push({ entry, index })
  })
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }))
}

export default function Contents({ entries, flipTo, dark }: Props) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [close])

  const groups = groupByMonth(entries)

  return (
    <>
      <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Table of contents">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open && (
        <div
          className="overlay-scrim"
          style={{ alignItems: 'flex-start', padding: '6vh 1rem' }}
          onClick={e => { if (e.target === e.currentTarget) close() }}
          role="dialog"
          aria-modal="true"
          aria-label="Table of contents"
        >
          <div style={{ width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto', background: dark ? '#1e1a16' : '#fff' }}>
            <div style={{
              padding: '1rem 1.4rem',
              borderBottom: `1px solid ${dark ? '#2a2520' : '#eee'}`,
              fontFamily: 'var(--font-hand)',
              fontSize: '0.7rem',
              color: '#aaa',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span>Contents</span>
              <button onClick={close} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '1.1rem', lineHeight: 1 }}>×</button>
            </div>

            {groups.length === 0 && (
              <div style={{ padding: '2rem', fontFamily: 'var(--font-hand)', color: '#aaa', fontSize: '0.85rem' }}>No entries yet.</div>
            )}

            {groups.map(group => (
              <div key={group.label}>
                <div style={{
                  padding: '0.7rem 1.4rem 0.3rem',
                  fontFamily: 'var(--font-hand)',
                  fontSize: '0.62rem',
                  color: '#bbb',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  background: dark ? '#171310' : '#fafafa',
                }}>
                  {group.label}
                </div>
                {group.items.map(({ entry, index }) => (
                  <button
                    key={entry.id}
                    onClick={() => { flipTo(index); close() }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      borderBottom: `1px solid ${dark ? '#272320' : '#f0f0f0'}`,
                      padding: '0.6rem 1.4rem',
                      cursor: 'pointer',
                      display: 'flex',
                      gap: '1rem',
                      alignItems: 'baseline',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-hand)', fontSize: '0.65rem', color: '#bbb', flexShrink: 0, minWidth: 24 }}>
                      {formatDate(entry.logged_date)}
                    </span>
                    <span style={{ fontFamily: 'var(--font-hand)', fontSize: '0.82rem', color: dark ? '#c0b8ac' : '#333', lineHeight: 1.4 }}>
                      {entry.source_label || entry.quote.slice(0, 60)}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
