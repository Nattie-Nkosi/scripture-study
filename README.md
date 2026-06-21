<p align="center">
  <img src="public/logo.svg" alt="Scripture Study logo" width="96" height="96" />
</p>

<h1 align="center">Scripture Study</h1>

<p align="center">
  A clean, modern reader for the LDS standard works <strong>and</strong> General
  Conference talks — with AI study tools, highlights and notes, and full-text search.
</p>

<br />

## Features

**Reading**

- The standard works — Old Testament, New Testament, Book of Mormon, Doctrine
  and Covenants, and Pearl of Great Price — in a calm serif reader with an
  adjustable text size.
- **General Conference** talks from 1971 to today: browse by conference or by
  speaker, and read each talk in the same reader.
- Multiple reading themes — Paper, Sepia, Dark, and a true-black Night — plus
  System.

**AI study tools** (via Groq)

- **Simple English** — a per-chapter toggle that rewrites King James verses into
  plain modern English (cached so each verse is only translated once).
- **Study assistant** — a grounded chat panel that answers questions about the
  chapter or conference talk you're reading, streaming its response. When the
  answer lives elsewhere (e.g. who someone's father was), it searches the app's
  own scriptures and talks and answers from the verses it finds, citing the
  reference — rather than relying on the model's memory.

**In the reader**

- Highlights and per-verse notes.
- Footnotes with parsed scripture cross-references and inline verse previews.
- Full-text search across both scripture and conference talks.

## Tech stack

- Next.js (App Router, TypeScript) · Tailwind CSS v4 · shadcn/ui (Base UI
  primitives) · lucide icons · next-themes
- Neon (serverless Postgres) for the translation cache, chat history, and notes
- Groq for the AI features (free, no credit card)
- Text from the [Open Scripture API](https://openscriptureapi.org) — both the
  scripture and General Conference endpoints (no key)
- Deploys to Vercel

All Groq, database, and external API calls happen on the server. No secret key
is ever exposed to the browser.

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the env template and fill it in:
   ```bash
   cp .env.example .env.local
   ```
   - `GROQ_API_KEY` — from <https://console.groq.com/keys>
   - `DATABASE_URL` — a Neon connection string (see below)
   - The two `OPENSCRIPTURE_*` base URLs are already defaulted; no key needed
3. Create the database tables:
   ```bash
   npm run db:migrate
   ```
4. Run the app:
   ```bash
   npm run dev
   ```
   Open <http://localhost:3000>.

## Database (Neon)

Create a Neon Postgres database (directly at [neon.tech](https://neon.tech) or
via **Vercel → Storage → Neon**) and put its pooled connection string in
`DATABASE_URL`. Then run `npm run db:migrate` to apply everything in
`/migrations`:

- `0001_ai_translations` — Simple English cache
- `0002_chat_messages` — scripture study-assistant history
- `0003_verse_annotations` — highlights and notes
- `0004_talk_chat_messages` — conference study-assistant history

The app degrades gracefully without a database: Simple English still translates
(just uncached) and both assistants still stream (just not saved).

## Speaker photos (optional)

Speaker portraits aren't provided by the API. To add your own, drop images named
by speaker id into `public/speakers/` (e.g. `dallinhoaks.jpg`) and set
`NEXT_PUBLIC_SPEAKER_PHOTO_URL="/speakers/{id}.jpg"`. Any speaker without an
image shows a monogram avatar instead. See `public/speakers/README.md` for
details (including remote/CDN sources).

## Deploying to Vercel

1. Push to a Git repo and import it in Vercel.
2. If you created Neon through Vercel Storage, `DATABASE_URL` is added
   automatically. Otherwise add it under **Settings → Environment Variables**.
3. Add **`GROQ_API_KEY`** (and optionally `GROQ_TRANSLATION_MODEL` /
   `GROQ_ASSISTANT_MODEL`) under Environment Variables.
4. Apply migrations to the production database once (the same Neon DB used in
   `.env.local` is fine): `npm run db:migrate`.
5. Deploy.

## Notes

The Simple English paraphrase and the study assistants are study aids — not an
official or authoritative source of Church doctrine.
