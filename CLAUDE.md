# Eesha's Commonplace Book — Project Reference

A digital commonplace book: quotes from books, films, shows, YouTube, articles, Instagram, and spoken words, displayed as a handwritten composition notebook. Captured in Notion, enriched by Claude, stored in Postgres, read on the web.

## Key decisions

| Thing | Decision |
|---|---|
| Embeddings | Voyage `voyage-3-large`, dim=1024 |
| Host | Neon (managed serverless Postgres + pgvector) |
| Claude model | `claude-sonnet-4-6` with `web_search_20250305` tool |
| Font | Cedarville Cursive (Google Fonts) |
| Notion API | Version `2025-09-03`, data sources endpoint, raw `fetch` |
| Script runner | `tsx` |
| Neon drivers | `@neondatabase/serverless` in app; `pg` in scripts |

## Env vars

```
NOTION_TOKEN               # Internal integration secret
NOTION_DATA_SOURCE_ID      # Data source ID from Notion database settings
ANTHROPIC_API_KEY
EMBEDDINGS_API_KEY         # Voyage AI key
DATABASE_URL               # Neon pooled connection string
EMBED_MODEL=voyage-3-large
EMBED_DIM=1024
```

## Notion conventions

- Property names: `Date` (date field), `Source` (rich text), `Quote` (rich text)
- A quote prefixed with `/^\s*dp\b/i` is private: strip the prefix, set `published=false`
- Sources are vague by design; Claude resolves them with web search

## §1 — Schema

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE entries (
  id                 BIGSERIAL PRIMARY KEY,
  notion_page_id     TEXT        UNIQUE NOT NULL,
  notion_last_edited TIMESTAMPTZ NOT NULL,
  logged_date        DATE        NOT NULL,
  raw_source         TEXT        NOT NULL,
  quote              TEXT        NOT NULL,
  medium             TEXT        CHECK (medium IN ('book','film','tv','article','video','social','spoken')),
  source_label       TEXT,
  resolved_link      TEXT,
  tags               TEXT[],
  embedding          VECTOR(1024),
  published          BOOLEAN     NOT NULL DEFAULT true,
  archived           BOOLEAN     NOT NULL DEFAULT false,
  manual_override    BOOLEAN     NOT NULL DEFAULT false,
  search_tsv         TSVECTOR    GENERATED ALWAYS AS (
    to_tsvector('english'::regconfig,
      coalesce(quote, '') || ' ' ||
      coalesce(source_label, ''))
  ) STORED,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON entries USING GIN  (search_tsv);
CREATE INDEX ON entries USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON entries (logged_date);
CREATE INDEX ON entries (published, archived);
```

## §2 — Enrichment system prompt

```
You receive a raw_source string and a quote from a commonplace book.
Return ONLY valid JSON — no markdown, no prose, nothing else:

{
  "medium": "<book|film|tv|article|video|social|spoken>",
  "source_label": "<human-readable label>",
  "resolved_link": "<URL or null>",
  "tags": ["tag1", "tag2"]
}

Classification rules:
- book    → novel, non-fiction, poetry. resolved_link = Goodreads or publisher page.
- film    → movie. resolved_link = IMDb page.
- tv      → TV show or podcast episode. resolved_link = IMDb or podcast page.
- article → news article or blog post. resolved_link = the article URL.
- video   → YouTube or other video. resolved_link = the video URL.
- social  → "insta", "instagram", Twitter, TikTok, etc. resolved_link = null.
- spoken  → a person's name with no associated published work. resolved_link = null.

Link rules:
- Links attach to works, not people. "Brené Brown" alone → spoken, null. "Brené Brown, Daring Greatly" → book, link to that book.
- If raw_source contains a URL, use it verbatim as resolved_link; do not search for a different one.
- "insta" or "instagram" with no more detail → social, null.
- A bare person name (no title) → spoken, null.

source_label: concise human label. Examples: "Gabor Maté, In the Realm of Hungry Ghosts", "The Social Network (2010)", "Reply All #150", "David Foster Wallace".

tags: 3–6 descriptive tags. Include the author/creator name if a specific person. Include theme words. Keep them lowercase.

Use web search to resolve ambiguous sources and find the correct link.
```

## §3 — RRF search SQL

```sql
-- $1 = search query (text)   $2 = query embedding (vector)
-- $3 = tags filter (text[])  $4 = medium filter (text)
WITH
  lex AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY ts_rank_cd(search_tsv, q) DESC) AS rn
    FROM entries CROSS JOIN websearch_to_tsquery('english', $1) q
    WHERE published AND NOT archived
      AND search_tsv @@ q
      AND ($3::text[] IS NULL OR tags && $3::text[])
      AND ($4::text   IS NULL OR medium = $4)
    ORDER BY ts_rank_cd(search_tsv, q) DESC
    LIMIT 60
  ),
  sem AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY embedding <=> $2::vector) AS rn
    FROM entries
    WHERE published AND NOT archived
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
SELECT e.id, e.quote, e.logged_date, e.source_label, e.resolved_link, r.score
FROM rrf r JOIN entries e ON e.id = r.id
ORDER BY r.score DESC
LIMIT 20;
```
