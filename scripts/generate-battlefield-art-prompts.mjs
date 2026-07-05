import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PATHWAYS } from '../packages/game-engine/dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'docs');
const OUT = join(OUT_DIR, 'battlefield-art-prompts.md');

const PATHWAY_ORDER = ['red-priest', 'tyrant', 'sun', 'door', 'demoness', 'fool'];

/** Story boss order for reference */
const STORY_BOSSES = ['red-priest', 'tyrant', 'sun', 'door', 'demoness'];

const BATTLEFIELD_SPECS = {
  'red-priest': {
    chapter: 'Capítulo I',
    setting: 'Ruínas de catedral em Backlund, velas carmim e brasas de purificação',
    mood: 'agressivo, sagrado-corrompido, calor opressivo',
    palette: 'crimson, burnt orange, charcoal smoke, ember glow',
    focalTop: 'altar quebrado, vitrais rachados, chamas rituais subindo',
    focalBottom: 'pedras molhadas escuras, reflexos de fogo no chão',
  },
  tyrant: {
    chapter: 'Capítulo II',
    setting: 'Penhasco sobre mar tempestuoso, doca abandonada sob relâmpagos',
    mood: 'épico, ameaçador, vento e sal',
    palette: 'deep navy, cyan lightning, sea foam, stormy gray',
    focalTop: 'nuvens torrenciais, raio cortando o céu, ondas batendo em rochas',
    focalBottom: 'madeira encharcada do cais, poças refletindo relâmpagos',
  },
  sun: {
    chapter: 'Capítulo III',
    setting: 'Pátio de santuário banhado em luz dourada ao amanhecer',
    mood: 'sereno mas grandioso, esperança e poder solar',
    palette: 'warm gold, amber, soft white, pale sky blue',
    focalTop: 'raios de sol atravessando colunas antigas, poeira dourada no ar',
    focalBottom: 'lajes de pedra iluminadas, sombras suaves para leitura de UI',
  },
  door: {
    chapter: 'Capítulo IV',
    setting: 'Corredor infinito de portas seladas e passagens secretas',
    mood: 'misterioso, claustrofóbico, segredos arcanos',
    palette: 'emerald green, brass, deep shadow, mystical teal',
    focalTop: 'fileira de portas antigas recuando na perspectiva, fechaduras brilhando',
    focalBottom: 'tapete gasto, símbolos de pathway no chão, névoa verde baixa',
  },
  demoness: {
    chapter: 'Capítulo Final',
    setting: 'Salão gótico sob luar, névoa roxa e velas esverdeadas',
    mood: 'sedutor, perigoso, feitiçaria noturna',
    palette: 'violet, fuchsia, moonlight silver, witch-green accents',
    focalTop: 'janelas arqueadas com lua cheia, cortinas esvoaçando, névoa mágica',
    focalBottom: 'chão de mármore escuro, pétalas e sombras alongadas',
  },
  fool: {
    chapter: 'O Louco / NPC genérico',
    setting: 'Ruas enevoadas de Tingen à noite, lampiões a gás',
    mood: 'inquietante, disfarces, segredos na névoa',
    palette: 'gray fog, muted yellow lamplight, slate blue shadows',
    focalTop: 'beco vitoriano na névoa, silhuetas de marionetes ao longe',
    focalBottom: 'calçamento molhado, reflexos fracos de lampiões',
  },
};

function buildPrompt(pathway, spec) {
  const name = PATHWAYS[pathway]?.name ?? pathway;
  return [
    `Vertical mobile TCG battle background, 9:16 portrait aspect ratio,`,
    `Lord of the Mysteries dark fantasy battlefield for opponent "${name}" (${pathway}),`,
    `${spec.setting}.`,
    `TOP zone (opponent territory): ${spec.focalTop}.`,
    `CENTER strip: mystical fog veil, slightly darker empty band for minion play area, subtle arcane particles.`,
    `BOTTOM zone (player side): ${spec.focalBottom}, darker and less busy for hand UI overlay.`,
    `Mood: ${spec.mood}.`,
    `Color palette: ${spec.palette}.`,
    `Painterly digital matte painting, cinematic depth, soft vignette on edges,`,
    `no characters, no cards, no UI, no text, no logos, environment only.`,
  ].join(' ');
}

mkdirSync(OUT_DIR, { recursive: true });

let md = `# LOTM TCG — Battlefield Art Prompts

> Ambientes de batalha por **pathway do oponente** (Modo História e NPC).
> Salve em \`packages/client/public/battlefields/{pathway}.png\` (ex.: \`red-priest.png\`).

**Total:** ${PATHWAY_ORDER.length} campos | **Formato:** PNG, **9:16** retrato (~1080×1920), ambiente sem personagens

---

## Como TCGs tratam o campo de batalha

Referências úteis para o estilo e composição:

| Jogo | Abordagem | Lição para LOTM TCG |
|------|-----------|---------------------|
| **Hearthstone** | Tabuleiro único temático por expansão/classe; bordas escuras; detalhes decorativos nas laterais; centro limpo para cartas | Um fundo por “região” inimiga; **vignette** nas bordas; evitar poluição no centro |
| **Legends of Runeterra** | Metade superior = território oponente; inferior = jogador; faixa central = combate; *board skins* por região (Bilgewater, Demacia…) | **Zonas verticais**: topo dramático (oponente), base mais escura (sua mão/UI) |
| **Marvel Snap** | *Locations* com arte própria + regra; layout vertical mobile | Inspiração para **portrait 9:16** e zonas de leitura |
| **Magic Arena** | Mesa/planos arcanos; partículas ambientes; duelo entre planewalkers | Névoa mística, partículas de pathway, sensação de “ritual” |
| **Fairtravel Battle** | Campo de unidades delimitado; decks nas laterais; mana como poço físico | **Faixa central** reservada aos minions; cantos para herói/mana |

### Layout recomendado (portrait mobile)

\`\`\`
┌─────────────────────────┐
│  ZONA OPONENTE (~40%)   │  ← ambiente dramático, cor do pathway
│  (herói inimigo aqui)   │
├─────────────────────────┤
│  FAIXA DE COMBATE (~25%)│  ← mais escura, menos detalhe (minions)
├─────────────────────────┤
│  ZONA JOGADOR (~35%)    │  ← mais escura ainda (mão + herói)
└─────────────────────────┘
\`\`\`

- **Sem personagens** na imagem — só cenário (UI coloca heróis e cartas).
- **Contraste baixo no centro** para minions e números legíveis.
- **Vinheta** nas bordas para integrar com UI roxa/escura do jogo.

---

## Prompt base (prefixo opcional)

\`\`\`
Victorian dark fantasy TCG battle environment, Lord of the Mysteries inspired, vertical 9:16 mobile game background, painterly matte painting, cinematic atmospheric depth, soft edge vignette, no characters, no text, no UI elements
\`\`\`

---

## Arquivos sugeridos

| Pathway | Arquivo | Uso |
|---------|---------|-----|
`;

for (const pw of PATHWAY_ORDER) {
  const story = STORY_BOSSES.includes(pw) ? `Modo História — ${BATTLEFIELD_SPECS[pw].chapter}` : 'NPC / fallback';
  md += `| ${PATHWAYS[pw]?.name ?? pw} | \`battlefields/${pw}.png\` | ${story} |\n`;
}

md += `\n---\n\n`;

for (const pathway of PATHWAY_ORDER) {
  const spec = BATTLEFIELD_SPECS[pathway];
  const info = PATHWAYS[pathway];
  md += `## ${info?.name ?? pathway} (\`${pathway}\`)\n\n`;
  md += `| Campo | Valor |\n|-------|-------|\n`;
  md += `| **Arquivo** | \`packages/client/public/battlefields/${pathway}.png\` |\n`;
  md += `| **Capítulo** | ${spec.chapter} |\n`;
  md += `| **Cenário** | ${spec.setting} |\n`;
  md += `| **Mood** | ${spec.mood} |\n`;
  md += `| **Paleta** | ${spec.palette} |\n`;
  md += `| **Identity** | ${info?.identity ?? '—'} |\n\n`;
  md += `**Zona oponente (topo):** ${spec.focalTop}\n\n`;
  md += `**Zona jogador (base):** ${spec.focalBottom}\n\n`;
  md += `**Image prompt:**\n\n\`\`\`\n${buildPrompt(pathway, spec)}\n\`\`\`\n\n`;
  md += `**Prompt negativo (opcional):**\n\n\`\`\`\npeople, characters, monsters, cards, user interface, text, watermark, logo, frame, border, bright flat background, photorealistic, 3d render, anime\n\`\`\`\n\n---\n\n`;
}

md += `## Ordem no Modo História

1. Red Priest → \`red-priest.png\`
2. Tyrant → \`tyrant.png\`
3. Sun → \`sun.png\`
4. Door → \`door.png\`
5. Demoness → \`demoness.png\`

Use \`fool.png\` para partidas genéricas ou placeholder até integrar no \`BattleScreen\`.

`;

writeFileSync(OUT, md, 'utf8');
console.log(`Wrote ${OUT}`);
