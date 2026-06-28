import { neon } from '@neondatabase/serverless'
import Notebook from '@/components/Notebook'

export const dynamic = 'force-dynamic'

export type Entry = {
  id: number
  logged_date: string
  quote: string
  source_label: string | null
  resolved_link: string | null
  notes: string | null
  medium: string | null
  tags: string[]
  published: boolean
}

async function getEntries(): Promise<Entry[]> {
  if (!process.env.DATABASE_URL) return []
  const sql = neon(process.env.DATABASE_URL)
  const rows = await sql`
    SELECT id, logged_date::text, quote, source_label, resolved_link, notes, medium, tags, published
    FROM entries
    WHERE NOT archived
    ORDER BY logged_date ASC
  `
  return rows as Entry[]
}

export default async function Home() {
  const entries = await getEntries()
  return <Notebook entries={entries} />
}
