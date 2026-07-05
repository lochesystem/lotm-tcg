# Beyond the Veil — LOTM TCG

Trading card game inspirado em *Lord of the Mysteries*. Monorepo com client React (PWA), motor de regras compartilhado e servidor Socket.IO para PvP.

**Jogar online:** https://lochesystem.github.io/lotm-tcg/

**Documentação completa (deploy, multiplayer, troubleshooting, roadmap):** [docs/GUIA-PROJETO.md](docs/GUIA-PROJETO.md)

---

## O que o jogo tem hoje

| Modo | Descrição |
|------|-----------|
| **Modo História** | Sequência de chefes por pathway; vitórias desbloqueiam Sun, Door e Demoness |
| **PvP com amigo** | Sala por código de 4 letras; cada jogador escolhe pathway/deck antes da partida |
| **Coleção & decks** | 30 cartas por deck; até 3 slots na nuvem (com Supabase) |
| **PWA / mobile** | Instalável no celular; scroll touch, mão horizontal, setas de ataque |

### Pathways

Fool, Red Priest, Tyrant (iniciais) · Sun, Door, Demoness (desbloqueáveis na história)

Cada pathway tem cartas exclusivas, identidade de jogo e **Pathway Power** (custo 2, 1× por turno).

### Produção

| Serviço | URL |
|---------|-----|
| Client (GitHub Pages) | https://lochesystem.github.io/lotm-tcg/ |
| Servidor (Render) | https://lotm-tcg.onrender.com |
| Health check | https://lotm-tcg.onrender.com/health |

O multiplayer **precisa** do servidor Render (WebSocket). O free tier pode levar ~30–60 s para “acordar” após inatividade.

---

## Desenvolvimento local

**Pré-requisitos:** Node.js 20+, pnpm 9+

```bash
git clone https://github.com/lochesystem/lotm-tcg.git
cd lotm-tcg
pnpm install

# Client + servidor juntos
pnpm dev

# Ou separado:
pnpm dev:client   # http://localhost:5173/lotm-tcg/
pnpm dev:server   # http://localhost:3001
```

### Variáveis de ambiente (opcional)

```bash
cp packages/client/.env.example packages/client/.env
```

| Variável | Uso |
|----------|-----|
| `VITE_SUPABASE_URL` | Login, coleção e decks na nuvem |
| `VITE_SUPABASE_ANON_KEY` | Chave pública do Supabase |
| `VITE_SERVER_URL` | URL do servidor multiplayer (default: `http://localhost:3001`) |

Sem Supabase, o jogo roda em **modo offline** (coleção em `localStorage`, sem login).

Setup do banco: [supabase/README.md](supabase/README.md)

---

## Monorepo

```
lotm-tcg/
├── packages/client/       # React + Vite + Tailwind + PWA
├── packages/game-engine/  # Regras, cartas, batalha (TypeScript puro)
├── packages/server/       # Express + Socket.IO (salas PvP)
├── docs/                  # Guia do projeto
└── .github/workflows/     # Deploy automático → GitHub Pages
```

| Pacote | Papel |
|--------|--------|
| `game-engine` | Fonte da verdade: `createGame`, `applyAction`, cartas, pathways, história |
| `client` | UI, animações, Zustand, Socket.IO, Supabase |
| `server` | Salas, sincronização PvP, validação server-side |

```bash
pnpm build   # game-engine + client + server
```

---

## Multiplayer (resumo)

1. Menu → **Jogar com Amigos**
2. **Host:** criar sala → compartilhar código
3. **Guest:** entrar com o código
4. **Ambos:** escolher pathway na sala → **Confirmar e jogar**
5. Partida inicia quando os dois confirmarem o deck

- Deck salvo de 30 cartas do pathway escolhido, ou **starter** se não houver
- Mulligan automático no início (sem UI de troca por enquanto)
- Regras e IDs (`host` / `guest`) rodam no servidor Render

Detalhes, arquivos e limitações: [seção 7 do guia](docs/GUIA-PROJETO.md#7-multiplayer--como-funciona).

---

## Deploy

### Client → GitHub Pages

- Workflow: `.github/workflows/deploy-pages.yml` (push em `master`)
- **Settings → Pages → Source:** GitHub Actions
- Secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `VITE_SERVER_URL` já aponta para Render no workflow

### Server → Render

- Build: `pnpm install && pnpm --filter game-engine build && pnpm --filter server build`
- Start: `pnpm --filter server start`
- Env: `NODE_VERSION=20`

Passo a passo e troubleshooting: [seções 5–6 e 12 do guia](docs/GUIA-PROJETO.md).

---

## Dados do jogador

- **Com Supabase:** conta, coleção, decks, histórico (Postgres + RLS)
- **Sem Supabase:** progresso e coleção só no navegador

---

## Stack

React 18 · Vite · Tailwind · Framer Motion · Zustand · Socket.IO · Supabase · TypeScript · pnpm workspaces

---

## Licença

Projeto privado / uso do repositório conforme política do maintainer.