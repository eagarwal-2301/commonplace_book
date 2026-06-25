import { NextRequest, NextResponse } from 'next/server'
import { embedQuery } from '@/lib/embed'
import { search } from '@/lib/search'

export async function POST(req: NextRequest) {
  try {
    const { q, tags, medium } = await req.json()
    if (!q || typeof q !== 'string' || !q.trim()) {
      return NextResponse.json({ results: [] })
    }

    const embedding = await embedQuery(q.trim())
    const results = await search(q.trim(), embedding, tags, medium)
    return NextResponse.json({ results })
  } catch (err) {
    console.error('[search]', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
