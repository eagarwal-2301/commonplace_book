export type RawEntry = {
  notion_page_id: string
  notion_last_edited: string
  logged_date: string
  raw_source: string
  quote: string
  published: boolean
}

function extractRichText(value: any): string {
  if (!value) return ''
  if (value.type === 'rich_text') {
    return (value.rich_text as any[]).map((t: any) => t.plain_text).join('').trim()
  }
  if (value.type === 'title') {
    return (value.title as any[]).map((t: any) => t.plain_text).join('').trim()
  }
  return ''
}

function extractDate(value: any): string {
  if (!value || value.type !== 'date' || !value.date) return ''
  return value.date.start ?? ''
}

function mapNotionPage(page: any): RawEntry | null {
  const props = page.properties ?? {}
  const rawQuote = extractRichText(props['Quote'] ?? props['quote'])
  if (!rawQuote) return null

  const dpMatch = /^\s*dp\b\s*/i.exec(rawQuote)
  const published = !dpMatch
  const quote = dpMatch ? rawQuote.slice(dpMatch[0].length).trim() : rawQuote

  const raw_source = extractRichText(props['Source'] ?? props['source']) || ''
  const logged_date = extractDate(props['Date'] ?? props['date']) || page.created_time?.slice(0, 10) || ''

  return {
    notion_page_id: page.id,
    notion_last_edited: page.last_edited_time ?? '',
    logged_date,
    raw_source,
    quote,
    published,
  }
}

import { NOTION_API_VERSION } from './config'

export async function* queryNotionEntries(): AsyncGenerator<RawEntry> {
  const dataSourceId = process.env.NOTION_DATA_SOURCE_ID!
  const token = process.env.NOTION_TOKEN!
  let cursor: string | undefined

  while (true) {
    const body: Record<string, any> = { page_size: 100 }
    if (cursor) body.start_cursor = cursor

    const res = await fetch(
      `https://api.notion.com/v1/databases/${dataSourceId}/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Notion-Version': NOTION_API_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Notion API error ${res.status}: ${text}`)
    }

    const data = await res.json()
    const pages: any[] = data.results ?? []

    for (const page of pages) {
      const entry = mapNotionPage(page)
      if (entry) yield entry
    }

    if (!data.has_more || !data.next_cursor) break
    cursor = data.next_cursor
  }
}
