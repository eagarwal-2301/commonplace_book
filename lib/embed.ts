import { EMBED_MODEL_DEFAULT } from './config'

export async function withRetry<T>(fn: () => Promise<T>, retries = 5, baseMs = 1000): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn()
    } catch (err: any) {
      if (attempt === retries - 1) throw err
      const is429 = err?.message?.includes('429')
      const delay = is429 ? 60_000 : baseMs * 2 ** attempt
      if (is429) console.log(`[embed] rate limited — waiting 60s before retry ${attempt + 1}`)
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw new Error('unreachable')
}

async function voyageEmbed(texts: string[]): Promise<number[][]> {
  return withRetry(async () => {
    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.EMBEDDINGS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.EMBED_MODEL ?? EMBED_MODEL_DEFAULT,
        input: texts,
      }),
    })
    if (!res.ok) {
      const msg = await res.text()
      throw new Error(`Voyage API error ${res.status}: ${msg}`)
    }
    const data = await res.json()
    return (data.data as any[]).map(d => d.embedding as number[])
  })
}

export async function embed(quote: string, source_label: string, tags: string[]): Promise<number[]> {
  const text = [quote, source_label, tags.join(', ')].filter(Boolean).join('\n')
  const [embedding] = await voyageEmbed([text])
  return embedding
}

export async function embedQuery(q: string): Promise<number[]> {
  const [embedding] = await voyageEmbed([q])
  return embedding
}
