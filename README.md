# Beyond the Veil — LOTM TCG

Trading card game (Lord of the Mysteries) — React client + shared game engine.

## Live demo

After enabling GitHub Pages: **https://lochesystem.github.io/lotm-tcg/**

## Local development

```bash
fnm use 22
pnpm install
cp .env.example packages/client/.env
# Edit packages/client/.env with your Supabase URL and anon key

pnpm --filter game-engine build
pnpm --filter client dev
```

Without Supabase env vars, the app runs in offline mode (localStorage only, no login).

## Supabase setup

See [supabase/README.md](supabase/README.md). Run `supabase/migrations/001_initial.sql` in your new project, then configure Auth redirect URLs for localhost and GitHub Pages.

## GitHub Pages deploy

1. Repository **Settings → Pages → Build and deployment → GitHub Actions**
2. Add secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
3. Push to `master` — workflow `.github/workflows/deploy-pages.yml` publishes `packages/client/dist`

## Monorepo

| Package | Role |
|---------|------|
| `packages/client` | React SPA (deployed to Pages) |
| `packages/game-engine` | Shared rules, cards, packs |
| `packages/server` | Socket.IO server (optional; not used on Pages) |

## Player data

- **With Supabase:** account, collection, decks, match history in Postgres (RLS)
- **Without Supabase:** collection in browser `localStorage` only
