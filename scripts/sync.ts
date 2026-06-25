import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { queryNotionEntries } from '../lib/notion'
import { getExistingEntries, upsertEntry, upsertNotionOnlyCols, archiveMissing } from '../lib/db'
import { enrich } from './enrich'
import { embed } from '../lib/embed'

async function main() {
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
        console.log(`[insert] ${raw.notion_page_id} — ${enriched.source_label}`)
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
          console.log(`[update] ${raw.notion_page_id} — ${enriched.source_label}`)
        } else {
          await upsertNotionOnlyCols(raw)
          updated++
          console.log(`[update-notion-only] ${raw.notion_page_id}`)
        }
      }
    } catch (err) {
      errors++
      console.error(`[error] ${raw.notion_page_id}:`, err)
    }
  }

  await archiveMissing(seenIds)

  console.log(`\nDone — inserted: ${inserted}, updated: ${updated}, skipped: ${skipped}, errors: ${errors}`)
  process.exit(0)
}

main()
