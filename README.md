# Scripture Study

A clean, modern reader for the LDS standard works, with two AI features:

- **Simple English** — a per-chapter toggle that rewrites King James verses into
  plain modern English (cached so each verse is only translated once).
- **Study assistant** — a grounded chat panel that answers questions about the
  chapter you're reading, streaming its response.

Plus highlights, per-verse notes, and full-text search.

## Tech stack

- Next.js (App Router, TypeScript) · Tailwind CSS v4 · shadcn/ui
- Neon (serverless Postgres) for the translation cache, chat history, and notes
- Groq for the AI features (free, no credit card)
- Scripture text from the [Open Scripture API](https://openscriptureapi.org) (no key)
- Deploys to Vercel

All Groq, database, and scripture calls happen on the server. No secret key is
ever exposed to the browser.

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
   - `OPENSCRIPTURE_API_BASE_URL` — already defaulted; no key needed
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
`/migrations`.

The app degrades gracefully without a database: Simple English still translates
(just uncached) and chat still streams (just not saved).

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

The study assistant is a study aid, not an official source of Church doctrine.
