import fs from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { withRetry } from '../lib/embed'

let _client: Anthropic | null = null
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

export type EnrichResult = {
  medium: 'book' | 'film' | 'tv' | 'article' | 'video' | 'social' | 'spoken'
  source_label: string
  resolved_link: string | null
  notes: string | null
  tags: string[]
  corrected_quote: string
}

const PROMPTS_DIR = path.join(__dirname, '..', 'prompts')
const SYSTEM_PROMPT = fs.readFileSync(path.join(PROMPTS_DIR, 'enrich-system.txt'), 'utf-8').trim()
const QUOTE_CORRECTION_PROMPT = fs.readFileSync(path.join(PROMPTS_DIR, 'quote-correction.txt'), 'utf-8').trim()

const VALID_MEDIA = new Set(['book', 'film', 'tv', 'article', 'video', 'social', 'spoken'])

const RELATIONSHIP_WORDS = new Set([
  'mom','dad','mama','papa','bhai','didi','dadi','nani','nana',
  'amma','abba','ammi','abu','chacha','chachi','maasi','mamu',
])

function isPersonalSource(raw: string): boolean {
  const s = raw.trim()
  if (!s) return true
  return RELATIONSHIP_WORDS.has(s.toLowerCase())
}

async function correctQuoteOnly(quote: string): Promise<string> {
  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: QUOTE_CORRECTION_PROMPT,
    messages: [{ role: 'user', content: quote }],
  })
  const block = response.content.find(b => b.type === 'text')
  return block?.type === 'text' ? block.text.trim() : quote
}

function extractJson(text: string): any {
  let start = -1
  let depth = 0
  let inString = false
  let escape = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (escape) { escape = false; continue }
    if (inString) {
      if (ch === '\\') escape = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') { inString = true; continue }
    if (ch === '{') { if (depth === 0) start = i; depth++ }
    else if (ch === '}') {
      depth--
      if (depth === 0 && start !== -1) {
        return JSON.parse(text.slice(start, i + 1))
      }
    }
  }
  throw new Error(`No JSON object found in: ${text.slice(0, 80)}`)
}

export async function enrich(raw_source: string, quote: string): Promise<EnrichResult> {
  if (isPersonalSource(raw_source)) {
    const corrected = await correctQuoteOnly(quote)
    const trimmed = raw_source.trim()
    const label = trimmed ? '— ' + trimmed.replace(/\b\w/g, c => c.toUpperCase()) : ''
    return { medium: 'spoken', source_label: label, resolved_link: null, notes: null, tags: [], corrected_quote: corrected }
  }

  return withRetry(async () => {
    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [{ type: 'web_search_20250305', name: 'web_search' } as any],
      messages: [
        {
          role: 'user',
          content: `raw_source: ${raw_source || '(none)'}\nquote: ${quote}`,
        },
      ],
    })

    const textBlock = response.content.findLast(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text block in enrichment response')
    }

    const text = textBlock.text.trim()
    const parsed = extractJson(text)

    if (!VALID_MEDIA.has(parsed.medium)) {
      throw new Error(`Invalid medium: ${parsed.medium}`)
    }

    return {
      medium: parsed.medium,
      source_label: String(parsed.source_label ?? raw_source ?? ''),
      resolved_link: parsed.resolved_link ?? null,
      notes: parsed.notes ? String(parsed.notes) : null,
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
      corrected_quote: String(parsed.corrected_quote ?? ''),
    }
  })
}
