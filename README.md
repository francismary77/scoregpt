# ScoreGPT

Foundation Batch 1 for ScoreGPT.com.ng, an AI-powered football intelligence platform by FABRO TECH LIMITED.

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
