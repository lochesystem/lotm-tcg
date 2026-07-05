import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getAllCards, PATHWAYS } from '../packages/game-engine/dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'docs', 'card-image-prompts.md');

const PATHWAY_PROMPT_STYLE = {
  fool: 'gray fog, masks, marionettes, trickery, Faceless pathway',
  'red-priest': 'crimson fire, purification flames, Red Priest pathway',
  tyrant: 'stormy sea, lightning, ocean tyrant, blue tempest',
  sun: 'golden radiant light, solar halo, Sun pathway healing',
  door: 'emerald threshold, hidden doors, secret passages, Door pathway',
  demoness: 'moonlit purple witchcraft, bewitching shadows, Demoness pathway',
  neutral: 'Victorian dark fantasy, Lord of the Mysteries aesthetic',
};

const RARITY_HINT = {
  common: 'modest attire, subdued details',
  rare: 'ornate details, glowing accents',
  epic: 'dramatic pose, strong magical effects',
  legendary: 'epic centerpiece art, legendary aura, maximum detail',
};

function formatStats(card) {
  if (card.type === 'beyonder') {
    const kw = card.keywords?.length ? ` | Keywords: ${card.keywords.join(', ')}` : '';
    return `${card.attack}/${card.health}${kw}`;
  }
  if (card.type === 'sealed-artifact') {
    return `Weapon ${card.attack} atk, ${card.durability} dur`;
  }
  if (card.type === 'ritual') {
    return `Ritual spell`;
  }
  if (card.type === 'mystical-item') {
    return `Secret mystical item`;
  }
  return '';
}

function cardDescription(card) {
  if (card.description?.trim()) return card.description.trim();
  if (card.type === 'beyonder' && card.keywords?.length) {
    return `Beyonder minion with ${card.keywords.join(', ')}`;
  }
  if (card.type === 'beyonder') {
    return `Beyonder minion, ${card.attack} attack ${card.health} health`;
  }
  if (card.type === 'sealed-artifact') {
    return `Sealed weapon, ${card.attack} attack, ${card.durability} durability`;
  }
  return card.name;
}

function buildImagePrompt(card) {
  const style = PATHWAY_PROMPT_STYLE[card.pathway] ?? PATHWAY_PROMPT_STYLE.neutral;
  const rarity = RARITY_HINT[card.rarity];
  const desc = cardDescription(card);
  const typeHint =
    card.type === 'beyonder'
      ? 'character portrait, beyonder creature'
      : card.type === 'sealed-artifact'
        ? 'sealed mystical weapon artifact, item focus'
        : card.type === 'ritual'
          ? 'ritual spell scene, magical incantation'
          : 'mystical secret trap sigil';

  return [
    `Trading card art, vertical portrait 2:3 ratio,`,
    `"${card.name}",`,
    desc + '.',
    typeHint + ',',
    style + ',',
    rarity + ',',
    'dark fantasy, painterly, no text, no border, no watermark.',
  ].join(' ');
}

function pathwayLabel(pathway) {
  if (pathway === 'neutral') return 'Neutral';
  return PATHWAYS[pathway]?.name ?? pathway;
}

const cards = getAllCards().sort((a, b) => {
  const pw = a.pathway.localeCompare(b.pathway);
  if (pw !== 0) return pw;
  if (a.cost !== b.cost) return a.cost - b.cost;
  return a.name.localeCompare(b.name);
});

const byPathway = new Map();
for (const card of cards) {
  const key = card.pathway;
  if (!byPathway.has(key)) byPathway.set(key, []);
  byPathway.get(key).push(card);
}

const pathwayOrder = ['neutral', 'fool', 'red-priest', 'tyrant', 'sun', 'door', 'demoness'];

let md = `# LOTM TCG — Card Art Prompts

> Gerado automaticamente a partir do game engine. Use o **ID** como nome do arquivo: \`{id}.png\` em \`packages/client/public/cards/\`.
>
> **Specs:** PNG, proporção 2:3 (~400×600), fundo transparente ou atmosférico escuro, estilo dark fantasy *Lord of the Mysteries*, sem texto na imagem.

**Total de cartas:** ${cards.length}

---

## Prompt base (cole no início se quiser consistência)

\`\`\`
Victorian dark fantasy trading card illustration, Lord of the Mysteries inspired, cinematic lighting, painterly digital art, moody atmosphere, no text, no UI, no card frame
\`\`\`

---

`;

for (const pathway of pathwayOrder) {
  const group = byPathway.get(pathway);
  if (!group?.length) continue;

  md += `## ${pathwayLabel(pathway)} (\`${pathway}\`) — ${group.length} cartas\n\n`;

  for (const card of group) {
    md += `### ${card.name}\n\n`;
    md += `| Campo | Valor |\n|-------|-------|\n`;
    md += `| **ID** | \`${card.id}\` |\n`;
    md += `| **Arquivo** | \`${card.id}.png\` |\n`;
    md += `| **Custo** | ${card.cost} |\n`;
    md += `| **Tipo** | ${card.type} |\n`;
    md += `| **Raridade** | ${card.rarity} |\n`;
    md += `| **Stats** | ${formatStats(card)} |\n`;
    md += `| **Descrição** | ${cardDescription(card)} |\n`;
    if (card.flavorText) {
      md += `| **Flavor** | ${card.flavorText} |\n`;
    }
    md += `\n**Image prompt:**\n\n\`\`\`\n${buildImagePrompt(card)}\n\`\`\`\n\n---\n\n`;
  }
}

writeFileSync(OUT, md, 'utf8');
console.log(`Wrote ${cards.length} cards to ${OUT}`);
