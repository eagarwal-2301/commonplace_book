import type { NotebookPage } from '@/lib/paginate'
import { formatDate } from '@/lib/formatDate'

const LINE_H = 26

type Props = {
  page: NotebookPage
  pageIndex: number
}

export default function Page({ page, pageIndex }: Props) {
  return (
    <div
      className="lined-page"
      style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}
      aria-label={`Page ${pageIndex + 1}`}
    >
      {/* red margin line */}
      <div style={{ position: 'absolute', left: 44, top: 0, bottom: 0, width: 1, background: 'var(--margin-color)', zIndex: 1, pointerEvents: 'none' }} />
      <div
        style={{
          marginLeft: 52,
          marginRight: 12,
          paddingTop: LINE_H,
          paddingBottom: LINE_H,
          height: '100%',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {page.slots.length === 0 ? (
          <div style={{ fontFamily: 'var(--font-hand)', fontSize: '0.85rem', color: 'var(--text-source)', lineHeight: `${LINE_H}px` }}>
            No entries yet.
          </div>
        ) : (
          page.slots.map((slot, i) => (
            <div key={`${slot.entry.id}-${i}`}>
              {i > 0 && <div style={{ height: LINE_H }} />}

              <div style={!slot.entry.published ? {
                backgroundImage: [
                  'radial-gradient(ellipse 130% 40% at 10% 25%, rgba(185,148,82,0.22) 0%, transparent 70%)',
                  'radial-gradient(ellipse 80% 65% at 88% 12%, rgba(168,128,64,0.18) 0%, transparent 65%)',
                  'radial-gradient(ellipse 60% 75% at 42% 88%, rgba(178,142,70,0.16) 0%, transparent 62%)',
                  'radial-gradient(ellipse 95% 30% at 62% 52%, rgba(155,118,50,0.13) 0%, transparent 75%)',
                  'repeating-linear-gradient(-20deg, transparent 0px, transparent 9px, rgba(160,130,70,0.05) 9px, rgba(160,130,70,0.05) 10px)',
                ].join(', '),
                marginLeft: -6,
                paddingLeft: 6,
                borderRadius: 2,
              } : undefined}>

              {!slot.isContinuation && (
                <>
                  <div
                    style={{
                      fontFamily: 'var(--font-hand)',
                      fontSize: '0.72rem',
                      color: 'var(--text-date)',
                      lineHeight: `${LINE_H}px`,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {formatDate(slot.entry.logged_date)}
                    {slot.entry.source_label && (() => {
                      const sep = slot.entry.source_label.startsWith('—') ? '' : '· '
                      return slot.entry.resolved_link ? (
                        <a
                          href={slot.entry.resolved_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ marginLeft: '0.6em', color: 'var(--text-source)', textDecoration: 'none' }}
                        >
                          {sep}{slot.entry.source_label}
                        </a>
                      ) : (
                        <span style={{ marginLeft: '0.6em', color: 'var(--text-source)' }}>{sep}{slot.entry.source_label}</span>
                      )
                    })()}
                  </div>
                  {slot.entry.notes && (
                    <div
                      style={{
                        fontFamily: 'var(--font-notes)',
                        fontSize: '0.82rem',
                        color: 'var(--text-note)',
                        lineHeight: `${LINE_H}px`,
                      }}
                    >
                      *{slot.entry.notes}
                    </div>
                  )}
                </>
              )}

              <div style={{ position: 'relative' }}>
                <QuoteText text={slot.quotePart} font={!slot.entry.published ? 'var(--font-annie)' : undefined} />
                {slot.hasMore && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      fontFamily: 'var(--font-hand)',
                      fontSize: '0.7rem',
                      color: 'var(--text-subtle)',
                    }}
                  >
                    →
                  </span>
                )}
              </div>

              </div>
            </div>
          ))
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 8,
          right: 10,
          fontFamily: 'var(--font-hand)',
          fontSize: '0.6rem',
          color: 'var(--text-subtle)',
          zIndex: 2,
        }}
      >
        {pageIndex + 1}
      </div>
    </div>
  )
}

function QuoteText({ text, font = 'var(--font-cursive)' }: { text: string; font?: string }) {
  return (
    <div
      style={{
        fontFamily: font,
        fontSize: '1.05rem',
        lineHeight: `${LINE_H}px`,
        color: 'var(--ink)',
      }}
    >
      {text}
    </div>
  )
}
