import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  createStarterDeck,
  PATHWAYS,
  type Deck,
  type Pathway,
} from 'game-engine';
import { DECK_SLOT_COUNT, ensureDeckSlots } from '../sync/player-sync';
import { getCurrentUserId } from '../lib/sessionContext';
import { isSupabaseConfigured, type DbDeck } from '../lib/supabase';
import { useCollectionStore } from '../stores/collectionStore';
import { useTranslation } from '../i18n';

const PATHWAY_ICONS: Record<string, string> = {
  fool: '🎭',
  'red-priest': '🔥',
  tyrant: '⚡',
  sun: '☀️',
  door: '🚪',
  demoness: '🌙',
};

export interface DeckChoice {
  deck: Deck;
  label: string;
  kind: 'starter' | 'custom';
}

interface Props {
  show: boolean;
  starterPathway: Pathway;
  title?: string;
  onSelect: (choice: DeckChoice) => void;
  onClose: () => void;
}

function dbDeckToChoice(deck: DbDeck): DeckChoice {
  return {
    deck: { pathway: deck.pathway as Pathway, cards: deck.cards },
    label: deck.name,
    kind: 'custom',
  };
}

export function DeckSelectModal({ show, starterPathway, title, onSelect, onClose }: Props) {
  const { t } = useTranslation();
  const isPathwayUnlocked = useCollectionStore((s) => s.isPathwayUnlocked);
  const [customDecks, setCustomDecks] = useState<DbDeck[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show) return;

    const userId = getCurrentUserId();
    if (!userId || !isSupabaseConfigured) {
      setCustomDecks([]);
      return;
    }

    setLoading(true);
    void (async () => {
      try {
        const slots = await ensureDeckSlots(userId, starterPathway);
        setCustomDecks(
          slots.filter((d): d is DbDeck => !!d && d.cards.length === 30)
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [show, starterPathway]);

  const starterChoice: DeckChoice = {
    deck: createStarterDeck(starterPathway),
    label: t('deckSelect.starterLabel', { name: PATHWAYS[starterPathway].name }),
    kind: 'starter',
  };

  const starterUnlocked = isPathwayUnlocked(starterPathway);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            aria-label={t('deckSelect.closeAria')}
          />

          <motion.div
            className="relative w-full max-w-md bg-void-900 border border-void-600 rounded-2xl shadow-2xl overflow-hidden"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
          >
            <div className="p-4 border-b border-void-700">
              <h3 className="text-lg font-bold text-void-100">
                {title ?? t('deckSelect.defaultTitle')}
              </h3>
              <p className="text-xs text-void-400 mt-1">
                {t('deckSelect.subtitle')}
              </p>
            </div>

            <div className="p-4 flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
              {starterUnlocked ? (
                <DeckOptionButton
                  choice={starterChoice}
                  icon={PATHWAY_ICONS[starterPathway]}
                  subtitle={t('deckSelect.powerSubtitle', { name: PATHWAYS[starterPathway].powerName })}
                  onSelect={onSelect}
                />
              ) : (
                <p className="text-xs text-void-500 text-center py-2">
                  {t('deckSelect.pathwayLocked', { name: PATHWAYS[starterPathway].name })}
                </p>
              )}

              {loading && (
                <p className="text-xs text-void-500 text-center py-2">{t('deckSelect.loadingDecks')}</p>
              )}

              {!loading && customDecks.length > 0 && (
                <>
                  <p className="text-[10px] text-void-500 uppercase tracking-wider mt-2 mb-1">
                    {t('deckSelect.yourDecks')}
                  </p>
                  {customDecks.map((saved) => {
                    const pw = saved.pathway as Pathway;
                    return (
                      <DeckOptionButton
                        key={saved.id}
                        choice={dbDeckToChoice(saved)}
                        icon={PATHWAY_ICONS[pw] ?? '🃏'}
                        subtitle={`${t('deckSelect.powerSubtitle', { name: PATHWAYS[pw]?.powerName ?? saved.pathway })} • ${saved.cards.length}/30`}
                        badge={saved.is_active ? t('deckSelect.inUse') : undefined}
                        onSelect={onSelect}
                      />
                    );
                  })}
                </>
              )}

              {!loading && isSupabaseConfigured && getCurrentUserId() && customDecks.length === 0 && (
                <p className="text-xs text-void-500 text-center py-2">
                  {t('deckSelect.noCustomDecks')}
                </p>
              )}
            </div>

            <div className="p-4 border-t border-void-700">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 text-sm text-void-400 hover:text-void-200 transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DeckOptionButton({
  choice,
  icon,
  subtitle,
  badge,
  onSelect,
}: {
  choice: DeckChoice;
  icon: string;
  subtitle: string;
  badge?: string;
  onSelect: (choice: DeckChoice) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(choice)}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-void-600 bg-void-800/80 hover:border-purple-500/60 hover:bg-purple-900/20 text-left transition-all"
    >
      <span className="text-2xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-void-100 truncate">{choice.label}</span>
          {badge && (
            <span className="text-[8px] font-bold text-green-400 uppercase shrink-0">{badge}</span>
          )}
        </div>
        <p className="text-[10px] text-void-400 mt-0.5">{subtitle}</p>
      </div>
      <span className="text-void-500 text-lg shrink-0">›</span>
    </button>
  );
}
