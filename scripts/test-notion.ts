import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { queryNotionEntries } from '../lib/notion'

async function main() {
  let count = 0
  for await (const entry of queryNotionEntries()) {
    console.log(JSON.stringify(entry, null, 2))
    if (++count >= 5) break
  }
  console.log(`\nShowed ${count} entries`)
}

main().catch(console.error)
