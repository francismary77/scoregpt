# 9ja Football AI

## Supabase development foundation

Batch 4A database setup is documented in [DATABASE.md](./DATABASE.md). The application remains in mock persistence mode by default. Copy `.env.example` to `.env.local` only when working with the ScoreGPT Development Supabase project; never commit real values.

9ja Football AI is an AI-powered football predictions and intelligence platform by FABRO TECH LIMITED. Its canonical production URL is https://9jafootballai.com.ng.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL shown in the terminal. For a production check, run `npm run build`.

## Architecture

- `app/` — App Router pages and global design system
- `components/` — shared branding, navigation, footer, cards, headings and placeholder layout
- `config/brand.ts` — central white-label brand configuration
- `data/mock-data.ts` — clearly separated demonstration content
- `lib/types.ts` — shared domain types

External football data, AI, Supabase, authentication, memberships, payments, admin tools, and production pricing are intentionally deferred beyond Foundation Batch 1.
