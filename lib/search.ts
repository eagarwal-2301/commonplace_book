import { Pool } from '@neondatabase/serverless'

export type SearchResult = {
  id: number
  quote: string
  logged_date: string
  source_label: string | null
  resolved_link: string | null
  score: number
  sem_dist: number
  published: boolean
  tags: string[]
}

const RRF_SQL = `
WITH
  lex AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY ts_rank_cd(search_tsv, q) DESC) AS rn
    FROM entries CROSS JOIN websearch_to_tsquery('english', $1) q
    WHERE NOT archived
      AND search_tsv @@ q
      AND ($3::text[] IS NULL OR tags && $3::text[])
      AND ($4::text   IS NULL OR medium = $4)
    ORDER BY ts_rank_cd(search_tsv, q) DESC
    LIMIT 60
  ),
  sem AS (
    SELECT id,
           ROW_NUMBER() OVER (ORDER BY embedding <=> $2::vector) AS rn,
           embedding <=> $2::vector AS dist
    FROM entries
    WHERE NOT archived
      AND ($3::text[] IS NULL OR tags && $3::text[])
      AND ($4::text   IS NULL OR medium = $4)
    ORDER BY embedding <=> $2::vector
    LIMIT 60
  ),
  rrf AS (
    SELECT COALESCE(l.id, s.id) AS id,
           COALESCE(1.0/(60+l.rn), 0) + COALESCE(1.0/(60+s.rn), 0) AS score
    FROM lex l FULL OUTER JOIN sem s ON l.id = s.id
  )
SELECT e.id, e.quote, e.logged_date::text, e.source_label, e.resolved_link,
       r.score, COALESCE(s.dist, 1.0) AS sem_dist, e.published, e.tags
FROM rrf r JOIN entries e ON e.id = r.id
LEFT JOIN sem s ON s.id = r.id
ORDER BY r.score DESC
LIMIT 5
`

let _pool: Pool | null = null
function getPool() {
  if (!_pool) _pool = new Pool({ connectionString: process.env.DATABASE_URL! })
  return _pool
}

export async function search(
  q: string,
  embedding: number[],
  tags?: string[],
  medium?: string
): Promise<SearchResult[]> {
  const vecStr = `[${embedding.join(',')}]`
  const tagsParam = tags && tags.length > 0 ? tags : null
  const mediumParam = medium || null

  const { rows } = await getPool().query<SearchResult>(RRF_SQL, [
    q,
    vecStr,
    tagsParam,
    mediumParam,
  ])
  return rows
}
