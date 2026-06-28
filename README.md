# Eesha's Commonplace Book

---

## What is a commonplace book?

> *"For it would be of little purpose to spend our time in the reading of books, if we could not apply what we read to our use. It would be just for all the world as serviceable as a great deal of household-stuff, when if we wanted any particular Thing we could not tell where to find it."*
> — John Locke

You learn either through your own experiences (empiricism) or through the experiences of others. A commonplace book is how you hold onto the second kind. The things you agree or disagree with, the things that confuse you, the things you want to remember — they all go in. And the point is that you actually sit with them. Reading gives you the raw material; the collection is where the thinking happens.

> *"Reading provides the mind only with the materials of knowledge; thinking makes what we read ours."* — John Locke

A commonplace book is **a personal repository for quotes, ideas, anecdotes, and observations gathered from reading and everyday life**. Unlike a diary, which records original thoughts, it's an external memory bank — other people's words, the ones worth keeping.

---

## This one

Mine is chronological and sprawling. It's not just books — it's films, shows, YouTube, articles, things I read on Instagram, and the occasional thing someone around me says that I know will shift how I see something. My Things to Remember lists from 2025/26 live here too.

The website is the reading surface. It looks like a classic marbled composition notebook — the cover reads *Eesha's Commonplace Book (2025–)* — and you open it and flip through the pages. Each entry is a quote, set as if handwritten, dated, with its source linked. There's a search that understands meaning, not just keywords. Private entries exist (prefixed with `dp` in Notion) and unlock with a password. Dark mode for reading at night.

The whole thing is built so that adding a new entry means one action in Notion — everything else (classification, source resolution, embedding, storage) happens automatically when you run the sync.

---

## Codebase structure

| File | What it does |
|---|---|
| `app/page.tsx` | Server component; fetches entries from Neon and renders the notebook |
| `app/layout.tsx` | Font declarations (all five typefaces live here) |
| `app/globals.css` | All design tokens — colours, dark mode, CSS classes |
| `lib/config.ts` | Non-env constants: Claude model, Notion API version, embed model |
| `lib/notion.ts` | Paginates through the Notion database and yields raw entries |
| `lib/db.ts` | Postgres helpers for the sync scripts (`pg` driver) |
| `lib/search.ts` | RRF hybrid search query (`@neondatabase/serverless`) |
| `lib/embed.ts` | Voyage AI embedding calls + retry logic |
| `lib/paginate.ts` | Packs entries into notebook pages given line budgets |
| `lib/formatDate.ts` | Date formatting utility |
| `scripts/sync.ts` | Main sync pipeline: Notion → enrich → embed → Neon |
| `scripts/enrich.ts` | Claude enrichment: classifies medium, resolves source, corrects quote |
| `components/Notebook.tsx` | Page-flip book, all UI state (dark mode, lock, search, navigation) |
| `components/Page.tsx` | Renders one lined notebook page of entries |
| `components/Contents.tsx` | Table-of-contents overlay |
| `components/SearchOverlay.tsx` | Semantic + lexical search overlay |

---

## Making it your own

### 1. Environment variables

Create a `.env.local` file in the project root with the following:

```bash
# Notion
NOTION_TOKEN=secret_...          # Your Notion internal integration secret
NOTION_DATA_SOURCE_ID=...        # The Notion database ID

# Anthropic (for enrichment)
ANTHROPIC_API_KEY=sk-ant-...

# Voyage AI (for embeddings)
EMBEDDINGS_API_KEY=pa-...
EMBED_MODEL=voyage-3-large       # Optional — this is the default
EMBED_DIM=1024                   # Optional — matches voyage-3-large

# Neon (Postgres)
DATABASE_URL=postgresql://...    # Pooled connection string from Neon dashboard

# Private entries
DP_PASSWORD=your-chosen-password
```

---

### 2. Notion setup

#### Create the database

In Notion, create a new database (full-page or inline) with these exact property names and types:

| Property name | Type | Notes |
|---|---|---|
| `Quote` | **Title** | The quote text |
| `Source` | **Text** | Vague is fine — Claude resolves it |
| `Date` | **Date** | When you logged the entry |

Property names are case-sensitive. The sync reads `Quote`, `Source`, and `Date` (with lowercase fallbacks).

#### Get your Notion integration token

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **New integration**, give it a name, select your workspace
3. Copy the **Internal Integration Secret** — this is your `NOTION_TOKEN`
4. In your Notion database, click **...** → **Connections** → connect your integration

#### Get the data source ID

The database ID is the 32-character string in its URL:
```
notion.so/your-workspace/THIS-IS-THE-ID?v=...
```
Format it with hyphens: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` — this is your `NOTION_DATA_SOURCE_ID`.

#### Private entries

Prefix any quote with `dp ` (case-insensitive) to mark it private:
```
dp This is something only unlocked users will see.
```
The prefix is stripped before storage. Private entries are visible on the site only after entering the `DP_PASSWORD`.

---

### 3. Running the sync

Once your env vars and Notion database are set up:

```bash
npx tsx scripts/sync.ts
```

This fetches all Notion entries, enriches new/changed ones via Claude (classifies medium, resolves source link, corrects quote text), generates Voyage embeddings, and upserts to Neon. Entries deleted from Notion are soft-archived.

Run this on a schedule (e.g. a cron job or Vercel cron) to keep the site current.

---

### 4. Fonts

All five typefaces are declared at the top of `app/layout.tsx`:

```ts
const cursive  = Cedarville_Cursive(...)   // --font-cursive  (main quote text)
const handlee  = Handlee(...)              // --font-hand     (UI, dates, labels)
const coverFont = Liu_Jian_Mao_Cao(...)   // --font-cover    (cover page)
const notesFont = Nanum_Pen_Script(...)   // --font-notes    (margin notes)
const caveat   = Caveat(...)              // --font-annie    (private entries)
```

Swap any of these for any other Google Font — just change the import and the variable name. The CSS variables propagate everywhere automatically.

---

### 5. Accent colour

The single accent colour (the lock-icon red, and the notebook cover colour) is defined in one place in `app/globals.css`:

```css
:root {
  --accent: #c0182a;
}
```

Change this value to retheme all accent elements at once.

---

### 6. Page dimensions and layout

Two constants in `components/Notebook.tsx` control the physical size of each page:

```ts
const PAGE_W = 440   // pixels
const PAGE_H = 600   // pixels
```

If you change these, also tune the layout constants in `lib/paginate.ts`:

```ts
const USABLE_LINES  = 20   // lines of text per page
const CHARS_PER_LINE = 50  // characters per line (affects word-wrap estimates)
```

These two sets of values are coupled — if the page gets wider, `CHARS_PER_LINE` should go up.

---

### 7. Cover images

Place two files in the `/public` folder:
- `front.png` — the front cover
- `back.png` — the back cover

Both should be portrait-oriented and sized to `PAGE_W × PAGE_H` (or a 2× retina version). The images are displayed with `object-fit: cover` so exact dimensions aren't critical.

**GPT prompt used to generate the originals:**

> I'm building a digital commonplace notebook website styled like a real physical notebook. Generate a cover page image — large, portrait-oriented, suitable for a website. Style: a red marbled composition notebook. The title reads "Eesha's Commonplace Notebook (2025 —)": the name in slightly messy, handwritten cursive; the year range in neater, smaller block letters.

Adapt the name and year range for your own version.

---

### 8. Database schema

Run this once against your Neon database to set up the schema:

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
  notes              TEXT,
  tags               TEXT[],
  embedding          VECTOR(1024),
  published          BOOLEAN     NOT NULL DEFAULT true,
  archived           BOOLEAN     NOT NULL DEFAULT false,
  manual_override    BOOLEAN     NOT NULL DEFAULT false,
  search_tsv         TSVECTOR    GENERATED ALWAYS AS (
    to_tsvector('english'::regconfig,
      coalesce(quote, '') || ' ' || coalesce(source_label, ''))
  ) STORED,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON entries USING GIN  (search_tsv);
CREATE INDEX ON entries USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON entries (logged_date);
CREATE INDEX ON entries (published, archived);
```
