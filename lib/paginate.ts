import type { Entry } from '@/app/page'

export type PageSlot = {
  entry: Entry
  quotePart: string
  isContinuation: boolean
  hasMore: boolean
}

export type NotebookPage = { slots: PageSlot[] }

const USABLE_LINES = 20
const HEADER_LINES = 1
const GAP_LINES = 1
const CHARS_PER_LINE = 50

function estimateLines(text: string) {
  return Math.max(1, Math.ceil(text.length / CHARS_PER_LINE))
}

function splitAtWord(text: string, maxChars: number): [string, string] {
  if (text.length <= maxChars) return [text, '']
  const cut = text.lastIndexOf(' ', maxChars)
  return cut > 0
    ? [text.slice(0, cut), text.slice(cut + 1)]
    : [text.slice(0, maxChars), text.slice(maxChars)]
}

export function paginate(entries: Entry[]): {
  pages: NotebookPage[]
  entryPageMap: Map<number, number>
} {
  const pages: NotebookPage[] = []
  const entryPageMap = new Map<number, number>()
  let currentSlots: PageSlot[] = []
  let linesUsed = 0

  function flush() {
    if (currentSlots.length > 0) pages.push({ slots: currentSlots })
    currentSlots = []
    linesUsed = 0
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    let remaining = entry.quote
    let isFirst = true

    while (remaining.length > 0) {
      const gap = currentSlots.length > 0 ? GAP_LINES : 0
      const headerLines = isFirst ? (entry.notes ? HEADER_LINES + 1 : HEADER_LINES) : 0
      const available = USABLE_LINES - linesUsed - gap - headerLines

      if (available <= 0) {
        flush()
        continue
      }

      const maxChars = available * CHARS_PER_LINE
      const [part, rest] = splitAtWord(remaining, maxChars)
      const hasMore = rest.length > 0

      if (isFirst) entryPageMap.set(i, pages.length)

      currentSlots.push({ entry, quotePart: part, isContinuation: !isFirst, hasMore })
      linesUsed += gap + headerLines + estimateLines(part)
      remaining = rest
      isFirst = false

      if (hasMore) flush()
    }
  }

  flush()
  if (pages.length === 0) pages.push({ slots: [] })

  return { pages, entryPageMap }
}
