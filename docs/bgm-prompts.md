# Beyond the Veil — Prompts de BGM (trilhas sonoras)

> Prompts para gerar músicas em IAs (Suno, Udio, Soundraw, AIVA, etc.) e colocar no projeto com **nomes e pastas corretos**.
>
> Universo: *Lord of the Mysteries* — fantasia vitoriana sombria, mistério arcano, névoa, rituais, pathways Beyonder.

**Total sugerido:** 18 arquivos principais + 3 stingers + 3 reservados para roadmap

---

## Estrutura de pastas

Crie esta árvore em `packages/client/public/audio/`:

```
packages/client/public/audio/
├── bgm/
│   ├── home.mp3                 # Menu principal
│   ├── auth.mp3                 # Login / registro
│   ├── lobby.mp3                # Sala multiplayer (espera)
│   ├── collection.mp3           # Coleção de cartas
│   ├── deck-builder.mp3         # Montagem de deck
│   ├── pvp-match.mp3            # Partida PvP (qualquer pathway)
│   ├── battle/
│   │   ├── fool.mp3             # Prática NPC / fallback
│   │   ├── red-priest.mp3       # História Cap. I + NPC Red Priest
│   │   ├── tyrant.mp3           # História Cap. II
│   │   ├── sun.mp3              # História Cap. III
│   │   ├── door.mp3             # História Cap. IV
│   │   └── demoness.mp3         # História Cap. Final
│   └── future/                  # (opcional) quando implementar roadmap
│       ├── arena.mp3
│       ├── roguelike-map.mp3
│       └── daily-challenge.mp3
└── stingers/
    ├── victory.mp3              # Vitória (~5–8 s)
    ├── defeat.mp3               # Derrota (~5–8 s)
    └── chapter-clear.mp3        # Capítulo da história concluído (~6–10 s)
```

### Convenção de nomes

| Regra | Exemplo |
|-------|---------|
| Pastas em **minúsculas**, palavras separadas por `-` | `deck-builder.mp3` |
| Pathways = **id do jogo** (igual `battlefields/`) | `red-priest.mp3`, não `red_priest` |
| Formato preferido | **MP3** 192 kbps (ou OGG como cópia extra) |
| Sem espaços nem acentos no nome do arquivo | `chapter-clear.mp3` |

---

## Especificações técnicas (todas as faixas)

| Parâmetro | Menus / hub | Batalha (loop) | Stingers |
|-----------|-------------|----------------|----------|
| **Duração alvo** | 1:30 – 2:30 | 1:30 – 2:00 (loop perfeito) | 5 – 10 s |
| **BPM** | 70 – 95 | 90 – 130 | livre |
| **Vocais** | Evitar letra inteligível | **Sem vocais** ou coro abstrato | Sem vocais |
| **Loop** | Fade suave nas bordas | **Obrigatório** — início e fim compatíveis | Não precisa |
| **Mix** | Médio-baixo, não competir com SFX | Ritmo presente mas não agressivo no mobile | Impacto claro |
| **Referência de tom** | Sombrio, misterioso, elegante | Tensão crescente, épico contido | Emocional direto |

### Prompt negativo universal (cole em qualquer IA)

```
lyrics, sung words, rap, EDM drop, dubstep, heavy metal screaming, cartoon music, happy major key pop, 8-bit chiptune, corporate stock music, ukulele, whistling, phone speaker distortion, abrupt ending, fade out only at end without loop point
```

### Prefixo opcional (cole antes de cada prompt)

```
Instrumental game soundtrack, Lord of the Mysteries inspired Victorian dark fantasy, mystical fog and arcane rituals, cinematic but not overpowering, mobile TCG background music, seamless loop friendly, no vocals
```

---

## Tabela resumo — onde cada música toca

| Arquivo | Tela / contexto no jogo |
|---------|-------------------------|
| `bgm/home.mp3` | `HomeScreen` — título, escolha de pathway, botões Jogar |
| `bgm/auth.mp3` | `AuthScreen` — login e registro |
| `bgm/lobby.mp3` | `LobbyScreen` — criar/entrar sala, esperar oponente |
| `bgm/collection.mp3` | `CollectionScreen` — galeria de cartas |
| `bgm/deck-builder.mp3` | `DeckBuilderScreen` — editar deck |
| `bgm/pvp-match.mp3` | `BattleScreen` quando `isOnline === true` |
| `bgm/battle/fool.mp3` | Prática vs NPC genérico, pathway Fool |
| `bgm/battle/red-priest.mp3` | Modo História Capítulo I |
| `bgm/battle/tyrant.mp3` | Modo História Capítulo II |
| `bgm/battle/sun.mp3` | Modo História Capítulo III |
| `bgm/battle/door.mp3` | Modo História Capítulo IV |
| `bgm/battle/demoness.mp3` | Modo História Capítulo Final |
| `stingers/victory.mp3` | Overlay de vitória em `BattleScreen` |
| `stingers/defeat.mp3` | Overlay de derrota |
| `stingers/chapter-clear.mp3` | Vitória no modo história (desbloqueio de pathway) |

### Lógica sugerida de troca (quando integrar no código)

1. **Home** → `home.mp3`
2. **Auth** → `auth.mp3` (ou reutilizar `home.mp3` em volume mais baixo)
3. **Lobby** → `lobby.mp3`
4. **Collection** → `collection.mp3`
5. **Deck Builder** → `deck-builder.mp3`
6. **Battle PvP** → `pvp-match.mp3`
7. **Battle PvE** → `battle/{opponentPathway}.mp3` (história usa pathway do boss; prática usa `fool.mp3` ou pathway do NPC)
8. **Fim de partida** → stinger por cima (fade da BGM de batalha)

---

## 1. Menu principal — `bgm/home.mp3`

| Campo | Valor |
|-------|-------|
| **Arquivo** | `packages/client/public/audio/bgm/home.mp3` |
| **Mood** | Misterioso, convite ao desconhecido, elegância vitoriana |
| **BPM** | 78–88 |
| **Duração** | ~2:00 loop |

**Prompt:**

```
Instrumental main menu theme, Lord of the Mysteries inspired Victorian dark fantasy TCG, slow mysterious opening with soft strings and distant choir pad, gentle harp arpeggios, subtle clock ticks and fog atmosphere, purple and gold harmonic color, hopeful but ominous undertone, seamless loop, no vocals, 82 BPM, cinematic game menu music
```

**Notas (PT):** Sensação de “Beyond the Veil” — névoa, lampiões, segredos. Não muito triste; o jogador deve querer clicar em Jogar.

---

## 2. Login — `bgm/auth.mp3`

| Campo | Valor |
|-------|-------|
| **Arquivo** | `packages/client/public/audio/bgm/auth.mp3` |
| **Mood** | Íntimo, seguro, ritual de entrada |
| **BPM** | 72–80 |
| **Duração** | ~1:45 loop |

**Prompt:**

```
Minimal dark fantasy login screen ambient music, soft piano and low strings, mystical reverb like a sealed sanctum, very sparse percussion, intimate and calm, Lord of the Mysteries Victorian mystery vibe, seamless loop, no vocals, 76 BPM, subtle arcane shimmer
```

**Notas (PT):** Mais calmo que o home. Pode ser variação stripped-down da mesma harmonia do menu.

---

## 3. Lobby multiplayer — `bgm/lobby.mp3`

| Campo | Valor |
|-------|-------|
| **Arquivo** | `packages/client/public/audio/bgm/lobby.mp3` |
| **Mood** | Antecipação, duelo iminente, tensão social |
| **BPM** | 88–98 |
| **Duração** | ~1:50 loop |

**Prompt:**

```
Multiplayer lobby waiting room game music, building anticipation for a card duel, rhythmic low pulse, muted brass stabs, ticking tension, Victorian occult club atmosphere, Lord of the Mysteries inspired, slightly more energetic than menu theme, seamless loop, no vocals, 92 BPM
```

**Notas (PT):** Jogador está esperando código da sala ou oponente — ritmo levemente mais urgente que o home.

---

## 4. Coleção — `bgm/collection.mp3`

| Campo | Valor |
|-------|-------|
| **Arquivo** | `packages/client/public/audio/bgm/collection.mp3` |
| **Mood** | Contemplativo, museu arcano, descoberta |
| **BPM** | 70–85 |
| **Duração** | ~2:10 loop |

**Prompt:**

```
Card collection gallery ambient soundtrack, contemplative and scholarly, music box motif mixed with cello and glass harmonics, feeling of browsing ancient grimoires and sealed artifacts, Lord of the Mysteries dark fantasy, warm but mysterious, seamless loop, no vocals, 80 BPM
```

**Notas (PT):** Ideal para scroll longo na galeria — nada que canse em 5 minutos.

---

## 5. Deck builder — `bgm/deck-builder.mp3`

| Campo | Valor |
|-------|-------|
| **Arquivo** | `packages/client/public/audio/bgm/deck-builder.mp3` |
| **Mood** | Foco, estratégia, montagem de ritual |
| **BPM** | 82–92 |
| **Duração** | ~1:55 loop |

**Prompt:**

```
Deck building strategy screen music, thoughtful tactical mood, plucked strings and soft mallet percussion, puzzle-like harmonic movement, preparing for battle, Victorian occult planning room, Lord of the Mysteries inspired, medium energy, seamless loop, no vocals, 86 BPM
```

**Notas (PT):** Um pouco mais “cerebral” que a coleção — sensação de escolher peças de um ritual.

---

## 6. PvP — `bgm/pvp-match.mp3`

| Campo | Valor |
|-------|-------|
| **Arquivo** | `packages/client/public/audio/bgm/pvp-match.mp3` |
| **Mood** | Duelo entre iguais, tensão competitiva, sem boss épico |
| **BPM** | 100–118 |
| **Duração** | ~1:45 loop |

**Prompt:**

```
Player versus player card battle music, competitive duel tension, driving ostinato strings and taiko-lite percussion, faster than story mode but not chaotic, mind games and bluffing atmosphere, Lord of the Mysteries Victorian dark fantasy, seamless battle loop, no vocals, 108 BPM
```

**Notas (PT):** Diferente das trilhas de boss — mais “xadrez místico” que “capítulo da história”.

---

## 7. Batalha — Fool / NPC genérico — `bgm/battle/fool.mp3`

| Campo | Valor |
|-------|-------|
| **Arquivo** | `packages/client/public/audio/bgm/battle/fool.mp3` |
| **Capítulo** | Prática / NPC fallback |
| **Cenário** | Ruas enevoadas de Tingen, marionetes, disfarces |
| **BPM** | 94–104 |

**Prompt:**

```
TCG battle theme Fool pathway, eerie playful marionette energy, staccato strings and pizzicato, unsettling circus undertones without comedy, foggy Victorian streets at night, trickery and hidden faces, Lord of the Mysteries inspired, medium battle intensity, seamless loop, no vocals, 98 BPM
```

---

## 8. Batalha — Red Priest — `bgm/battle/red-priest.mp3`

| Campo | Valor |
|-------|-------|
| **Arquivo** | `packages/client/public/audio/bgm/battle/red-priest.mp3` |
| **Capítulo** | Modo História — Capítulo I |
| **Identity** | Aggro / Burn |
| **Cenário** | Catedral em ruínas, brasas, purificação corrompida |
| **BPM** | 110–125 |

**Prompt:**

```
Aggressive battle music Red Priest pathway, sacred fire and corrupted cathedral, pounding war drums and pipe organ drones, crimson brass accents, holy rage and burn damage feeling, Lord of the Mysteries Victorian dark fantasy, high energy TCG combat loop, seamless loop, no vocals, 118 BPM
```

---

## 9. Batalha — Tyrant — `bgm/battle/tyrant.mp3`

| Campo | Valor |
|-------|-------|
| **Arquivo** | `packages/client/public/audio/bgm/battle/tyrant.mp3` |
| **Capítulo** | Modo História — Capítulo II |
| **Identity** | Midrange / Tempo |
| **Cenário** | Penhasco, mar tempestuoso, relâmpagos |
| **BPM** | 105–120 |

**Prompt:**

```
Epic storm battle theme Tyrant pathway, thunderous orchestral hits, rolling timpani like ocean waves, electric cello sweeps, lightning tempo shifts, sea cliff tempest, Lord of the Mysteries inspired, commanding midrange tempo pressure, seamless loop, no vocals, 112 BPM
```

---

## 10. Batalha — Sun — `bgm/battle/sun.mp3`

| Campo | Valor |
|-------|-------|
| **Arquivo** | `packages/client/public/audio/bgm/battle/sun.mp3` |
| **Capítulo** | Modo História — Capítulo III |
| **Identity** | Healing / Board |
| **Cenário** | Santuário ao amanhecer, luz dourada |
| **BPM** | 88–102 |

**Prompt:**

```
Radiant but solemn battle theme Sun pathway, golden dawn over ancient sanctuary, warm strings and choir pads without lyrics, majestic horns, healing light with underlying danger, Lord of the Mysteries Victorian fantasy, hopeful heroic TCG combat, seamless loop, no vocals, 96 BPM
```

---

## 11. Batalha — Door — `bgm/battle/door.mp3`

| Campo | Valor |
|-------|-------|
| **Arquivo** | `packages/client/public/audio/bgm/battle/door.mp3` |
| **Capítulo** | Modo História — Capítulo IV |
| **Identity** | Combo / Steal |
| **Cenário** | Corredor infinito de portas, segredos |
| **BPM** | 98–112 |

**Prompt:**

```
Mysterious battle theme Door pathway, infinite corridor of sealed doors, ticking clockwork and metallic echoes, spy-like tension, secret passages and stolen knowledge, emerald mystical tones, Lord of the Mysteries inspired, combo puzzle battle feeling, seamless loop, no vocals, 104 BPM
```

---

## 12. Batalha — Demoness — `bgm/battle/demoness.mp3`

| Campo | Valor |
|-------|-------|
| **Arquivo** | `packages/client/public/audio/bgm/battle/demoness.mp3` |
| **Capítulo** | Modo História — Capítulo Final |
| **Identity** | Tempo / Removal |
| **Cenário** | Salão gótico, luar, feitiçaria |
| **BPM** | 115–128 |

**Prompt:**

```
Final boss battle theme Demoness pathway, seductive dangerous gothic waltz undertone, moonlit hall, witch-green accents, sultry low strings and harp glissandi, dark enchantment and removal magic, Lord of the Mysteries Victorian occult climax, highest story intensity, seamless loop, no vocals, 122 BPM
```

**Notas (PT):** A trilha mais intensa do modo história — sem ser barulhenta demais no celular.

---

## 13. Stinger — Vitória — `stingers/victory.mp3`

| Campo | Valor |
|-------|-------|
| **Arquivo** | `packages/client/public/audio/stingers/victory.mp3` |
| **Duração** | 5–8 s (sem loop) |

**Prompt:**

```
Short victory sting for dark fantasy card game, ascending brass and chime, triumphant but mysterious, Lord of the Mysteries style, 6 seconds, clear ending, no loop, no vocals
```

---

## 14. Stinger — Derrota — `stingers/defeat.mp3`

| Campo | Valor |
|-------|-------|
| **Arquivo** | `packages/client/public/audio/stingers/defeat.mp3` |
| **Duração** | 5–8 s |

**Prompt:**

```
Short defeat sting dark fantasy card game, descending minor strings and distant bell, somber failure, Victorian occult tragedy, 6 seconds, clear ending, no loop, no vocals
```

---

## 15. Stinger — Capítulo concluído — `stingers/chapter-clear.mp3`

| Campo | Valor |
|-------|-------|
| **Arquivo** | `packages/client/public/audio/stingers/chapter-clear.mp3` |
| **Duração** | 6–10 s |
| **Uso** | Vitória no modo história + desbloqueio de pathway |

**Prompt:**

```
Story chapter cleared fanfare, mystical revelation sting, golden and purple harmonic lift, sense of pathway unlocked, Lord of the Mysteries inspired, 8 seconds, satisfying resolution, no loop, no vocals
```

---

## Roadmap — músicas futuras (opcional)

Gere quando as telas existirem; já deixe na pasta `bgm/future/`:

### Arena — `bgm/future/arena.mp3`

**Prompt:**

```
Heroic boss rush arena mode music, repeatable endgame challenge, intense but heroic, layered percussion and choir pad, Lord of the Mysteries dark fantasy, seamless loop, 120 BPM, no vocals
```

### Mapa roguelike — `bgm/future/roguelike-map.mp3`

**Prompt:**

```
Roguelike map navigation ambient theme, branching paths and fog of war, curious exploration with danger nearby, soft drones and distant ritual drums, Lord of the Mysteries inspired, seamless loop, 84 BPM, no vocals
```

### Desafio diário — `bgm/future/daily-challenge.mp3`

**Prompt:**

```
Daily challenge mutator mode music, quirky arcane rule twist feeling, slightly off-kilter harmonies, urgent but fun tension, Victorian occult game show undertone, seamless loop, 100 BPM, no vocals
```

---

## Ordem sugerida de produção

Priorize nesta ordem para o jogo ficar jogável com som rápido:

1. `home.mp3`
2. `battle/fool.mp3` + `pvp-match.mp3`
3. `stingers/victory.mp3` + `stingers/defeat.mp3`
4. História: `red-priest` → `tyrant` → `sun` → `door` → `demoness`
5. `lobby.mp3`
6. `collection.mp3` + `deck-builder.mp3`
7. `auth.mp3` + `chapter-clear.mp3`

---

## Dicas por ferramenta de IA

| Ferramenta | Dica |
|------------|------|
| **Suno / Udio** | Use modo *Instrumental*; peça “seamless loop” na descrição; se vier com fade-out, regenere ou corte no DAW |
| **Soundraw** | Ajuste Energy e Genre para *Cinematic / Dark*; exporte 2 min |
| **AIVA** | Bom para loops clássicos orquestrais; defina BPM fixo antes |
| **Pós-produção** | Audacity / Reaper: cortar loop em zero-crossing; normalizar para **-14 LUFS** aprox. |

### Checklist antes de commitar no repo

- [ ] Nome do arquivo **exatamente** como na tabela
- [ ] Pasta correta sob `packages/client/public/audio/`
- [ ] Sem vocais inteligíveis
- [ ] Loop testado (batalha e menus)
- [ ] Tamanho razoável (&lt; 3 MB por faixa de 2 min em MP3 192k)

---

## Ordem no Modo História (referência)

| # | Boss | BGM | Battlefield (arte) |
|---|------|-----|-------------------|
| 1 | Red Priest | `battle/red-priest.mp3` | `battlefields/red-priest.png` |
| 2 | Tyrant | `battle/tyrant.mp3` | `battlefields/tyrant.png` |
| 3 | Sun | `battle/sun.mp3` | `battlefields/sun.png` |
| 4 | Door | `battle/door.mp3` | `battlefields/door.png` |
| 5 | Demoness | `battle/demoness.mp3` | `battlefields/demoness.png` |

---

*Última atualização: julho de 2026 — alinhado com telas em `App.tsx` e pathways em `game-engine`.*
