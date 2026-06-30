import { Pool } from 'pg'

let _pool: Pool | null = null
function getPool() {
  if (!_pool) _pool = new Pool({ connectionString: process.env.DATABASE_URL })
  return _pool
}

export type ExistingEntry = {
  notion_last_edited: string
  manual_override: boolean
  raw_source: string
  quote: string
}

export type FullEntry = {
  notion_page_id: string
  notion_last_edited: string
  logged_date: string
  raw_source: string
  quote: string
  published: boolean
  dedicated_to: string | null
  medium: string | null
  source_label: string | null
  resolved_link: string | null
  notes: string | null
  tags: string[]
  embedding: number[]
}


export async function getExistingEntries(): Promise<Map<string, ExistingEntry>> {
  const { rows } = await getPool().query<{ notion_page_id: string; notion_last_edited: string; manual_override: boolean; raw_source: string; quote: string }>(
    'SELECT notion_page_id, notion_last_edited, manual_override, raw_source, quote FROM entries'
  )
  return new Map(rows.map(r => [r.notion_page_id, {
    notion_last_edited: r.notion_last_edited,
    manual_override: r.manual_override,
    raw_source: r.raw_source,
    quote: r.quote,
  }]))
}

export async function upsertEntry(entry: FullEntry): Promise<void> {
  await getPool().query(
    `INSERT INTO entries
       (notion_page_id, notion_last_edited, logged_date, raw_source, quote,
        published, dedicated_to, medium, source_label, resolved_link, notes, tags, embedding, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::vector, now())
     ON CONFLICT (notion_page_id) DO UPDATE SET
       notion_last_edited = EXCLUDED.notion_last_edited,
       logged_date        = EXCLUDED.logged_date,
       raw_source         = EXCLUDED.raw_source,
       quote              = EXCLUDED.quote,
       published          = EXCLUDED.published,
       dedicated_to       = EXCLUDED.dedicated_to,
       medium             = EXCLUDED.medium,
       source_label       = EXCLUDED.source_label,
       resolved_link      = EXCLUDED.resolved_link,
       notes              = EXCLUDED.notes,
       tags               = EXCLUDED.tags,
       embedding          = EXCLUDED.embedding,
       updated_at         = now()`,
    [
      entry.notion_page_id,
      entry.notion_last_edited,
      entry.logged_date,
      entry.raw_source,
      entry.quote,
      entry.published,
      entry.dedicated_to,
      entry.medium,
      entry.source_label,
      entry.resolved_link,
      entry.notes,
      entry.tags,
      JSON.stringify(entry.embedding),
    ]
  )
}

export async function upsertNotionOnlyCols(entry: {
  notion_page_id: string
  notion_last_edited: string
  logged_date: string
  raw_source: string
  quote: string
  published: boolean
}): Promise<void> {
  await getPool().query(
    `UPDATE entries SET
       notion_last_edited = $2,
       logged_date        = $3,
       raw_source         = $4,
       quote              = $5,
       published          = $6,
       updated_at         = now()
     WHERE notion_page_id = $1`,
    [entry.notion_page_id, entry.notion_last_edited, entry.logged_date, entry.raw_source, entry.quote, entry.published]
  )
}

export async function archiveMissing(seenIds: Set<string>): Promise<void> {
  if (seenIds.size === 0) return
  const ids = Array.from(seenIds)
  await getPool().query(
    `UPDATE entries SET archived = true WHERE notion_page_id != ALL($1::text[]) AND archived = false`,
    [ids]
  )
}

