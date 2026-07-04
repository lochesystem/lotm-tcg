# Beyond the Veil - Lord of the Mysteries TCG

Trading Card Game multiplayer online ambientado no universo de **Lord of the Mysteries** (诡秘之主), com mecânicas inspiradas em Hearthstone.

## Stack

- **Game Engine**: TypeScript puro, compartilhado client/server
- **Client**: React 18 + Vite + Tailwind CSS + Framer Motion (PWA)
- **Server**: Node.js + Express + Socket.io + SQLite

## Estrutura

```
packages/
  game-engine/   → Regras, tipos, cartas, validação, packs
  client/        → React PWA (mobile-first)
  server/        → Multiplayer, NPC AI, persistência
```

## Como Rodar

```bash
# Instalar dependências
pnpm install

# Dev (client + server)
pnpm dev

# Apenas client
pnpm dev:client

# Apenas server
pnpm dev:server
```

## Regras

### Recursos
- **Spirituality** (mana): começa em 1, +1 por turno, cap 10
- **Deck**: 30 cartas (max 2 cópias, 1 para Legendary)
- **Mão inicial**: 3 cartas (1º jogador) / 4 + Fate Coin (2º jogador)

### Pathways (Classes)
| Pathway | Estilo | Hero Power |
|---------|--------|-----------|
| Fool | Control/Trickery | Summon 1/1 Marionette com Stealth |
| Red Priest | Aggro/Burn | 1 dano a qualquer alvo |
| Tyrant | Midrange/Tempo | +1 ATK a um aliado neste turno |
| Sun | Heal/Board | Restaura 2 HP |
| Door | Combo/Steal | Discover 1 carta do Pathway inimigo |
| Demoness | Tempo/Removal | -1 ATK a um inimigo |

### Keywords
- **Stealth** → Invisível até atacar
- **Provoke** → Inimigos devem atacar este
- **Corruption** → Destrói qualquer minion que danificar
- **Divination** → Ignora primeiro dano
- **Frenzy** → Ataca minions no turno que entra
- **Haste** → Ataca qualquer alvo imediatamente
- **Madness X** → Self-damage ao fim do turno

### Multiplayer
- Salas com código de 4 caracteres
- Validação server-side anti-cheat
- Reconexão em 60s

### Progressão
- Vitórias vs NPC/PvP ganham booster packs
- 3 tipos de pack: Ordinary, Beyonder, Sealed
- Coleção compartilhada entre decks
