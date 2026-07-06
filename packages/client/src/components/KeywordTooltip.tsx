import { motion, AnimatePresence } from 'framer-motion';
import { Keyword } from 'game-engine';
import { useLocaleStore } from '../i18n/localeStore';
import { getKeywordText } from '../i18n/gameText';

interface Props {
  keyword: Keyword;
  show: boolean;
}

const KEYWORD_ICONS: Record<Keyword, string> = {
  stealth: '👁️‍🗨️',
  provoke: '🛡️',
  corruption: '☠️',
  divination: '🔮',
  frenzy: '⚔️',
  haste: '💨',
  madness: '🌀',
  'sequence-ascend': '⬆️',
};

const KEYWORD_FALLBACKS: Record<Keyword, { name: string; description: string }> = {
  stealth: {
    name: 'Stealth',
    description:
      'Cannot be targeted by attacks or abilities until it attacks for the first time.',
  },
  provoke: {
    name: 'Provoke',
    description:
      'Enemies must attack this minion first. They cannot attack others while a Provoke minion exists.',
  },
  corruption: {
    name: 'Corruption',
    description:
      'Instantly destroys any minion that damages it, regardless of remaining health.',
  },
  divination: {
    name: 'Divination',
    description:
      'Completely ignores the first damage received. The shield is consumed after blocking one hit.',
  },
  frenzy: {
    name: 'Frenzy',
    description:
      'Can attack enemy minions on the same turn it is played (but NOT the hero).',
  },
  haste: {
    name: 'Haste',
    description:
      'Can attack any target immediately on the turn it is played — minions or hero.',
  },
  madness: {
    name: 'Madness',
    description: 'At the end of each turn, deals damage to YOUR hero. Power comes at a price.',
  },
  'sequence-ascend': {
    name: 'Sequence Ascend',
    description:
      'If its condition is met, transforms into a more powerful upgraded version.',
  },
};

function useKeywordInfo(keyword: Keyword) {
  const locale = useLocaleStore((s) => s.locale);
  const fallback = KEYWORD_FALLBACKS[keyword];
  return {
    icon: KEYWORD_ICONS[keyword],
    name: getKeywordText(locale, keyword, 'name', fallback.name, fallback.description),
    description: getKeywordText(locale, keyword, 'description', fallback.name, fallback.description),
  };
}

export function KeywordTooltip({ keyword, show }: Props) {
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
          <KeywordTooltipContent keyword={keyword} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function KeywordTooltipContent({ keyword }: { keyword: Keyword }) {
  const info = useKeywordInfo(keyword);
  return (
    <>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base">{info.icon}</span>
        <span className="font-bold text-sm text-white">{info.name}</span>
      </div>
      <p className="text-xs text-void-200 leading-relaxed">{info.description}</p>
    </>
  );
}

export function getLocalizedKeywordInfo(keyword: Keyword, locale: import('../i18n/types').Locale) {
  const fallback = KEYWORD_FALLBACKS[keyword];
  return {
    icon: KEYWORD_ICONS[keyword],
    name: getKeywordText(locale, keyword, 'name', fallback.name, fallback.description),
    description: getKeywordText(locale, keyword, 'description', fallback.name, fallback.description),
  };
}

export function getKeywordInfo(keyword: Keyword) {
  const fallback = KEYWORD_FALLBACKS[keyword];
  return {
    icon: KEYWORD_ICONS[keyword],
    name: fallback.name,
    description: fallback.description,
  };
}

export function KeywordBadge({ keyword, onHover }: { keyword: Keyword; onHover?: (show: boolean) => void }) {
  const info = useKeywordInfo(keyword);

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
