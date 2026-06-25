import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { enrich } from './enrich'
import { embed } from '../lib/embed'

const SAMPLE_SOURCE = 'Gabor Maté'
const SAMPLE_QUOTE = 'The attempt to escape from pain is what creates more pain.'

async function main() {
  console.log('Enriching...')
  const result = await enrich(SAMPLE_SOURCE, SAMPLE_QUOTE)
  console.log('Enrich result:', JSON.stringify(result, null, 2))

  console.log('\nEmbedding...')
  const vec = await embed(SAMPLE_QUOTE, result.source_label, result.tags)
  console.log(`Embedding length: ${vec.length}`)
  console.log(`First 5 values: [${vec.slice(0, 5).join(', ')}]`)
}

main().catch(console.error)
