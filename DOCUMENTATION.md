# Beyond the Veil — TCG Lord of the Mysteries

## Visão Geral

TCG (Trading Card Game) inspirado no universo de **Lord of the Mysteries** (LOTM), com mecânicas baseadas em Hearthstone, jogável em navegador como PWA (Progressive Web App) mobile-first. Suporta partidas contra NPC e multiplayer online.

---

## Regras do Jogo

### Objetivo

Reduzir a vida do herói adversário de **30 para 0**.

### Recursos

| Recurso | Descrição |
|---------|-----------|
| **Spirituality** | Mana do jogo. Começa em 1 e aumenta em 1 a cada turno (máx 10). Regenera totalmente no início de cada turno. |
| **Health** | Vida do herói. Inicia em 30. Ao chegar em 0, perde. |
| **Deck** | 30 cartas. Quando acaba, recebe dano de fatigue crescente a cada compra. |
| **Mão** | Máximo 10 cartas na mão. |
| **Board** | Máximo 7 minions em campo por jogador. |

### Fluxo de Turno

1. **Início do turno**: +1 Spirituality máximo (até 10), regenera toda Spirituality, compra 1 carta.
2. **Ações** (qualquer ordem, quantas vezes tiver recurso):
   - Jogar cartas da mão (gasta Spirituality igual ao custo)
   - Atacar com minions (cada minion ataca 1x por turno, exceto se tiver Frenzy)
   - Usar Hero Power (1x por turno, custa 2 Spirituality)
   - Atacar com arma (se equipada)
3. **Finalizar turno**: passa a vez ao oponente.

### Primeiro Turno

- O primeiro jogador começa com 3 cartas.
- O segundo jogador começa com 4 cartas + **Fate Coin** (moeda que dá +1 Spirituality temporário).

### Mulligan

Fase inicial onde cada jogador pode trocar cartas indesejadas da mão inicial por novas do deck.

---

## Tipos de Cartas

### Beyonder (Minion)

Criaturas com **Attack** e **Health** que ficam no campo de batalha.
- Precisam esperar 1 turno para atacar (exceto se tiverem Haste).
- Morrem quando Health chega a 0.

### Sealed Artifact (Arma)

Armas equipadas no herói com **Attack** e **Durability**.
- O herói pode atacar diretamente.
- Perde 1 durabilidade por ataque.
- Apenas 1 arma por vez.

### Ritual (Spell)

Efeitos instantâneos (dano, cura, buff, etc.) que são descartados após uso.

### Mystical Item (Secret)

Cartas jogadas face-down que ativam automaticamente quando uma condição é cumprida:
- `on-hero-attacked`: quando o herói é atacado
- `on-minion-played`: quando o oponente joga um minion
- `on-spell-cast`: quando o oponente usa um ritual
- `on-minion-death`: quando um minion morre
- `on-turn-start`: no início do turno

---

## Keywords (Habilidades)

| Keyword | Efeito |
|---------|--------|
| **Stealth** | Não pode ser alvo de ataques até atacar pela primeira vez |
| **Provoke** (Taunt) | Inimigos DEVEM atacar este minion antes de outros |
| **Divination** (Divine Shield) | Ignora o primeiro dano recebido, depois some |
| **Corruption** (Poisonous) | Destrói qualquer minion que danificar, independente da vida |
| **Frenzy** (Windfury) | Pode atacar 2 vezes por turno |
| **Haste** (Charge) | Pode atacar no turno em que é jogado |
| **Madness** (Overload) | Após jogar, trava X Spirituality no próximo turno |
| **Sequence Ascend** | Ao cumprir condição, transforma em versão evoluída da carta |

---

## Pathways (Classes)

Cada jogador escolhe um Pathway, que define seu Hero Power e o pool de cartas específicas disponíveis.

| Pathway | Identidade | Hero Power | Efeito |
|---------|-----------|------------|--------|
| **Fool** | Control / Trickery | Faceless | Invoca uma 1/1 Marionette com Stealth |
| **Red Priest** | Aggro / Burn | Purify | Causa 1 de dano em qualquer alvo |
| **Tyrant** | Midrange / Tempo | Tempest | Dá +1 Attack a um minion aliado neste turno |
| **Sun** | Healing / Board | Illuminate | Restaura 2 de vida ao herói ou minion aliado |
| **Door** | Combo / Steal | Trespass | Descobre uma carta do Pathway do oponente |
| **Demoness** | Tempo / Removal | Bewitch | Dá -1 Attack a um minion inimigo até próximo turno |

---

## Deck Building

- **30 cartas** por deck
- Máximo **2 cópias** de qualquer carta (1 cópia se Legendary)
- Pode usar cartas **Neutral** + cartas do **Pathway escolhido**
- Starter Deck automático para cada Pathway

---

## Raridades

| Raridade | Cor | Max cópias | Drop rate (Ordinary Pack) |
|----------|-----|-----------|--------------------------|
| Common | Cinza | 2 | 60% |
| Rare | Azul | 2 | 30% |
| Epic | Roxo | 2 | 8% |
| Legendary | Dourado | 1 | 2% |

---

## Sistema de Packs / Recompensas

### Tipos de Pack

| Pack | Cartas | Garantido | Como obter |
|------|--------|-----------|------------|
| **Ordinary** | 3 | ≥1 Rare | Vitória contra NPC tier 1-2 |
| **Beyonder** | 5 | ≥1 Epic | NPC tier 3-4, ou 3+ vitórias seguidas |
| **Sealed** | 5 | ≥1 Legendary | NPC tier 5, ou 5+ vitórias seguidas |

### NPCs

12 NPCs organizados em 5 tiers de dificuldade crescente. Deck automático baseado no pathway do NPC.

---

## Combate

- Minions atacam **outros minions** ou **o herói inimigo**.
- Ao atacar um minion, ambos trocam dano (Attack → Health do oponente).
- Minions com **Provoke** devem ser atacados primeiro.
- Minions com **Stealth** não podem ser alvo (até atacarem).
- **Divination** absorve o primeiro hit sem perder vida.
- **Corruption** mata instantaneamente qualquer minion danificado.
- **Frenzy** permite atacar 2x no turno.

---

## Multiplayer

- Criar sala → compartilhar código de 6 caracteres com amigo
- Amigo entra com o código → ambos escolhem deck → jogo começa
- Game state sincronizado via Socket.io com validação server-side
- Desconexão: 30s para reconectar, senão derrota

---

## Arquitetura Técnica

### Stack

| Componente | Tecnologia |
|-----------|-----------|
| **Game Engine** | TypeScript puro, determinístico |
| **Client** | React 18, Vite, Tailwind CSS, Framer Motion, Zustand |
| **Server** | Node.js, Express, Socket.io, SQLite |
| **Monorepo** | pnpm workspaces |

### Estrutura de Pacotes

```
lotm-tcg/
├── packages/
│   ├── game-engine/        # Lógica pura, compartilhada entre client/server
│   │   └── src/
│   │       ├── types.ts    # Todos os tipos (Card, GameState, Action, etc.)
│   │       ├── battle.ts   # createGame, applyAction, validação
│   │       ├── deck.ts     # Validação e starter decks
│   │       ├── pathways.ts # Definição dos 6 pathways
│   │       ├── packs.ts    # Sistema de packs e recompensas
│   │       └── cards/      # Definição de todas as cartas por pathway
│   │           ├── index.ts
│   │           ├── neutral.ts
│   │           ├── fool.ts
│   │           ├── red-priest.ts
│   │           ├── tyrant.ts
│   │           ├── sun.ts
│   │           ├── door.ts
│   │           └── demoness.ts
│   ├── client/             # PWA React
│   │   ├── public/
│   │   │   └── cards/      # Card art PNGs (nomeados por card ID)
│   │   └── src/
│   │       ├── App.tsx
│   │       ├── stores/
│   │       │   └── gameStore.ts    # Zustand: game state + NPC AI
│   │       ├── screens/
│   │       │   ├── HomeScreen.tsx
│   │       │   ├── BattleScreen.tsx
│   │       │   ├── CollectionScreen.tsx
│   │       │   ├── DeckBuilderScreen.tsx
│   │       │   └── LobbyScreen.tsx
│   │       └── components/
│   │           ├── Card.tsx           # Render de carta (com suporte a art)
│   │           ├── MinionSlot.tsx     # Minion no campo
│   │           ├── AnimatedBoard.tsx  # Board com animações
│   │           ├── HeroPortrait.tsx   # Retrato do herói
│   │           ├── AttackLine.tsx     # Efeito visual de ataque
│   │           ├── TurnBanner.tsx     # Banner "Seu Turno"
│   │           ├── DamageNumber.tsx   # Números flutuantes
│   │           ├── KeywordTooltip.tsx # Tooltips de keywords
│   │           ├── HowToPlay.tsx     # Tutorial in-game
│   │           └── PackOpening.tsx   # Abertura de packs
│   └── server/             # Backend multiplayer
│       └── src/
│           ├── index.ts            # Express + Socket.io setup
│           ├── rooms/
│           │   └── RoomManager.ts  # Gerenciamento de salas
│           ├── game/
│           │   └── socketHandlers.ts  # Handlers Socket.io
│           ├── npc/
│           │   └── NpcEngine.ts    # IA do NPC
│           └── db/
│               └── database.ts     # SQLite (jogadores, coleção)
└── pnpm-workspace.yaml
```

### Determinismo

O game engine usa **mulberry32 PRNG** (seeded) para garantir que:
- O mesmo seed produz o mesmo resultado
- Servidor pode validar ações do cliente sem ambiguidade

### Fluxo de Dados

```
1. Cliente envia GameAction via Socket.io
2. Server valida a ação (validateAction)
3. Server aplica (applyAction) e obtém novo GameState
4. Server broadcast novo estado para ambos os jogadores
5. Clientes atualizam UI
```

Para jogo local (vs NPC), o fluxo é simplificado:
```
1. Cliente aplica ação localmente (applyAction no gameStore)
2. Após end-turn, NPC planeja ações (npcPlayTurn)
3. Ações do NPC são executadas com delay (700ms entre cada) para visibilidade
```

### NPC AI

Lógica simples mas funcional:
1. Joga cartas da mão (mais caras primeiro, respeitando mana)
2. Ataca com minions (prioridade: provoke → kills garantidos → herói)
3. Usa hero power se sobrar mana
4. Finaliza turno

### Card Art System

Imagens são carregadas de `/public/cards/{card-id}.png`.
- Se a imagem existir, é renderizada a 60% opacity sobre o gradiente de fundo.
- Se não existir (404), o fallback graceful mostra apenas o gradiente do pathway.
- Ver `packages/client/public/cards/README.md` para lista completa de IDs e specs.

### Animações

| Componente | Animações |
|-----------|-----------|
| Cartas na mão | Hover: scale 1.08 + y -8; entrada: spring from bottom |
| Jogar carta | Exit: scale down + y up; board entry: scale from 0 |
| Ataque | Lunge (atacante avança), shake (alvo treme), AttackLine (slash + flash) |
| Morte de minion | Exit: scale 0 + rotation aleatória |
| Turno | Banner slide-in + scale + exit fade |
| Dano | DamageNumber float up + fade |
| Minion board | AnimatePresence layout com spring |

### PWA

- `manifest.json` configurado para standalone mobile
- Service Worker para cache offline
- Mobile-first responsive design

---

## Como Rodar

```bash
# Instalar dependências
cd lotm-tcg
pnpm install

# Dev (client)
cd packages/client
pnpm dev
# → http://localhost:5173

# Dev (server, para multiplayer)
cd packages/server
pnpm dev
# → http://localhost:3001

# Build
pnpm build
```

---

## Como Adicionar Card Art

1. Gere/desenhe imagens em formato PNG, ratio 2:3 (ex: 200x300px ou 400x600px)
2. Nomeie cada arquivo com o ID da carta (ex: `f-gray-fog-wisp.png`)
3. Coloque na pasta `packages/client/public/cards/`
4. A imagem será automaticamente detectada e exibida na carta

Lista completa de IDs: `packages/client/public/cards/README.md`

---

## Roadmap Futuro

- [ ] Ranqueado online com matchmaking
- [ ] Sistema de crafting/disenchant para cartas duplicadas
- [ ] Novos Pathways (Prisoner, Justiciar, etc.)
- [ ] Eventos narrativos (lore LOTM entre partidas)
- [ ] Efeitos sonoros e música temática
- [ ] Replay de partidas
- [ ] Torneios entre amigos
