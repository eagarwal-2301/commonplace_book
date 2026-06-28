import { NextRequest, NextResponse } from 'next/server'
import { queryNotionEntries } from '@/lib/notion'
import { getExistingEntries, upsertEntry, upsertNotionOnlyCols, archiveMissing } from '@/lib/db'
import { enrich } from '@/scripts/enrich'
import { embed } from '@/lib/embed'

export const maxDuration = 300

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const existing = await getExistingEntries()
  const seenIds = new Set<string>()
  let inserted = 0, updated = 0, skipped = 0, errors = 0

  for await (const raw of queryNotionEntries()) {
    seenIds.add(raw.notion_page_id)
    const known = existing.get(raw.notion_page_id)

    try {
      if (!known) {
        const enriched = await enrich(raw.raw_source, raw.quote)
        const quote = enriched.corrected_quote || raw.quote
        const embedding = await embed(quote, enriched.source_label, enriched.tags)
        await upsertEntry({ ...raw, ...enriched, quote, embedding })
        inserted++
      } else if (new Date(known.notion_last_edited).getTime() === new Date(raw.notion_last_edited).getTime()) {
        skipped++
      } else {
        const contentChanged = raw.raw_source !== known.raw_source || raw.quote !== known.quote
        if (!known.manual_override && contentChanged) {
          const enriched = await enrich(raw.raw_source, raw.quote)
          const quote = enriched.corrected_quote || raw.quote
          const embedding = await embed(quote, enriched.source_label, enriched.tags)
          await upsertEntry({ ...raw, ...enriched, quote, embedding })
          updated++
        } else {
          await upsertNotionOnlyCols(raw)
          updated++
        }
      }
    } catch (err) {
      errors++
      console.error(`[sync error] ${raw.notion_page_id}:`, err)
    }
  }

  await archiveMissing(seenIds)

  return NextResponse.json({ inserted, updated, skipped, errors })
}
