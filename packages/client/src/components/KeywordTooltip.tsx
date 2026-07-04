import { motion, AnimatePresence } from 'framer-motion';
import { Keyword } from 'game-engine';

interface Props {
  keyword: Keyword;
  show: boolean;
}

const KEYWORD_INFO: Record<Keyword, { name: string; description: string; icon: string }> = {
  stealth: {
    name: 'Stealth (Furtividade)',
    description: 'Não pode ser alvo de ataques ou habilidades até que ataque pela primeira vez.',
    icon: '👁️‍🗨️',
  },
  provoke: {
    name: 'Provoke (Provocar)',
    description: 'Inimigos devem atacar este minion primeiro. Não podem atacar outros enquanto existir um Provoke.',
    icon: '🛡️',
  },
  corruption: {
    name: 'Corruption (Corrupção)',
    description: 'Destrói instantaneamente qualquer minion que danificar, independente da vida restante.',
    icon: '☠️',
  },
  divination: {
    name: 'Divination (Adivinhação)',
    description: 'Ignora completamente o primeiro dano recebido. O escudo é consumido após absorver um hit.',
    icon: '🔮',
  },
  frenzy: {
    name: 'Frenzy (Frenesi)',
    description: 'Pode atacar minions inimigos no mesmo turno em que é jogado (mas NÃO o herói).',
    icon: '⚔️',
  },
  haste: {
    name: 'Haste (Pressa)',
    description: 'Pode atacar qualquer alvo imediatamente no turno em que é jogado — minions ou herói.',
    icon: '💨',
  },
  madness: {
    name: 'Madness (Loucura)',
    description: 'No fim de cada turno, causa dano ao SEU herói. Poder vem com um preço.',
    icon: '🌀',
  },
  'sequence-ascend': {
    name: 'Sequence Ascend (Ascensão)',
    description: 'Se cumprir a condição, transforma-se em uma versão superior mais poderosa.',
    icon: '⬆️',
  },
};

export function KeywordTooltip({ keyword, show }: Props) {
  const info = KEYWORD_INFO[keyword];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 pointer-events-none"
          initial={{ opacity: 0, y: 5, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 5, scale: 0.95 }}
          transition={{ duration: 0.15 }}
        >
          <div className="bg-void-900/95 border border-void-500 rounded-xl p-3 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-base">{info.icon}</span>
              <span className="font-bold text-sm text-white">{info.name}</span>
            </div>
            <p className="text-xs text-void-200 leading-relaxed">{info.description}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function KeywordBadge({ keyword, onHover }: { keyword: Keyword; onHover?: (show: boolean) => void }) {
  const info = KEYWORD_INFO[keyword];

  return (
    <span
      className="inline-flex items-center gap-0.5 text-[8px] bg-void-800/80 border border-void-600 px-1.5 py-0.5 rounded-full text-void-200 cursor-help"
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onTouchStart={() => onHover?.(true)}
      onTouchEnd={() => onHover?.(false)}
    >
      <span>{info.icon}</span>
      <span className="font-medium">{keyword}</span>
    </span>
  );
}
