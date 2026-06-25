CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE entries (
  id                 BIGSERIAL PRIMARY KEY,
  notion_page_id     TEXT UNIQUE NOT NULL,
  notion_last_edited TIMESTAMPTZ NOT NULL,
  logged_date        DATE NOT NULL,
  raw_source         TEXT NOT NULL,
  quote              TEXT NOT NULL,
  medium             TEXT CHECK (medium IN ('book','film','tv','article','video','social','spoken')),
  source_label       TEXT,
  resolved_link      TEXT,
  tags               TEXT[],
  embedding          VECTOR(1024),
  published          BOOLEAN NOT NULL DEFAULT true,
  archived           BOOLEAN NOT NULL DEFAULT false,
  notes              TEXT,
  manual_override    BOOLEAN NOT NULL DEFAULT false,
  search_tsv         TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english'::regconfig,
      coalesce(quote, '') || ' ' ||
      coalesce(source_label, ''))
  ) STORED,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON entries USING GIN (search_tsv);
CREATE INDEX ON entries USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON entries (logged_date);
CREATE INDEX ON entries (published, archived);
