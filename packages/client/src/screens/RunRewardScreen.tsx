import { useState } from 'react';
import { motion } from 'framer-motion';
import { getCardById, getRelic, ROGUELIKE_EVENTS, type Card, type RunCardUpgrade } from 'game-engine';
import { useRoguelikeStore } from '../stores/roguelikeStore';
import { MiniCard } from '../components/MiniCard';
import { useTranslation } from '../i18n';

interface Props {
  onDone: () => void;
}

export function RunRewardScreen({ onDone }: Props) {
  const { t } = useTranslation();
  const run = useRoguelikeStore((s) => s.run);
  const phase = useRoguelikeStore((s) => s.phase);
  const pickCardReward = useRoguelikeStore((s) => s.pickCardReward);
  const skipCardReward = useRoguelikeStore((s) => s.skipCardReward);
  const pickRelicReward = useRoguelikeStore((s) => s.pickRelicReward);

  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  if (!run) return null;

  if (phase === 'reward-relic' && run.pendingRelicOffer) {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 bg-void-950 safe-bottom">
        <h2 className="text-xl font-bold text-void-100 mb-2">{t('roguelike.pickRelic')}</h2>
        <p className="text-sm text-void-400 mb-6 text-center">{t('roguelike.pickRelicHint')}</p>
        <div className="flex flex-col gap-3 w-full max-w-sm">
          {run.pendingRelicOffer.map((id) => {
            const relic = getRelic(id);
            return (
              <motion.button
                key={id}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  pickRelicReward(id);
                  onDone();
                }}
                className="text-left p-4 rounded-xl border border-purple-700/50 bg-purple-950/30 hover:bg-purple-900/40"
              >
                <p className="font-semibold text-purple-200">{relic.name}</p>
                <p className="text-sm text-void-400 mt-1">{relic.description}</p>
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  if (phase === 'reward-cards' && run.pendingCardOffer) {
    if (selectedCard) {
      const uniqueDeck = [...new Set(run.deck.cards)];
      return (
        <div className="flex-1 min-h-0 flex flex-col p-4 bg-void-950 safe-bottom overflow-y-auto">
          <h2 className="text-lg font-bold text-void-100 mb-1">{t('roguelike.swapTitle')}</h2>
          <p className="text-sm text-void-400 mb-4">
            {t('roguelike.swapHint', { name: selectedCard.name })}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 flex-1">
            {uniqueDeck.map((id) => {
              const card = getCardById(id);
              if (!card) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    pickCardReward(selectedCard, id);
                    onDone();
                  }}
                  className="rounded-lg border border-void-600 hover:border-red-500/60 p-1"
                >
                  <MiniCard card={card} />
                  <p className="text-[10px] text-center text-void-400 truncate mt-1">{card.name}</p>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setSelectedCard(null)}
            className="mt-4 text-sm text-void-400 hover:text-void-200"
          >
            {t('common.back')}
          </button>
        </div>
      );
    }

    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 bg-void-950 safe-bottom">
        <h2 className="text-xl font-bold text-void-100 mb-2">{t('roguelike.pickCard')}</h2>
        <p className="text-sm text-void-400 mb-6 text-center">{t('roguelike.pickCardHint')}</p>
        <div className="flex gap-3 flex-wrap justify-center mb-6">
          {run.pendingCardOffer.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => setSelectedCard(card)}
              className="rounded-lg border-2 border-void-600 hover:border-amber-500/60 p-1"
            >
              <MiniCard card={card} />
              <p className="text-xs text-center text-void-300 mt-1 w-20 truncate">{card.name}</p>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            skipCardReward();
            onDone();
          }}
          className="text-sm text-void-400 hover:text-void-200 underline"
        >
          {t('roguelike.skip')}
        </button>
      </div>
    );
  }

  return null;
}

interface CampProps {
  onDone: () => void;
}

export function RunCampScreen({ onDone }: CampProps) {
  const { t } = useTranslation();
  const run = useRoguelikeStore((s) => s.run);
  const applyCampChoice = useRoguelikeStore((s) => s.applyCampChoice);
  const [mode, setMode] = useState<'choose' | 'upgrade' | 'remove'>('choose');

  if (!run) return null;

  const uniqueDeck = [...new Set(run.deck.cards)];

  if (mode === 'upgrade') {
    return (
      <div className="flex-1 min-h-0 flex flex-col p-4 bg-void-950 safe-bottom overflow-y-auto">
        <h2 className="text-lg font-bold text-void-100 mb-4">{t('roguelike.campUpgrade')}</h2>
        <div className="grid grid-cols-3 gap-2">
          {uniqueDeck.map((id) => {
            const card = getCardById(id);
            if (!card || card.type !== 'beyonder') return null;
            const upgrade: RunCardUpgrade = { cardId: id, type: 'plus-stats', attackBonus: 1, healthBonus: 1 };
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  applyCampChoice('upgrade', id, upgrade);
                  onDone();
                }}
                className="rounded-lg border border-void-600 hover:border-amber-500/60 p-1"
              >
                <MiniCard card={card} />
                <p className="text-[10px] text-center text-void-400 truncate">{card.name}</p>
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => setMode('choose')} className="mt-4 text-sm text-void-400">
          {t('common.back')}
        </button>
      </div>
    );
  }

  if (mode === 'remove') {
    return (
      <div className="flex-1 min-h-0 flex flex-col p-4 bg-void-950 safe-bottom overflow-y-auto">
        <h2 className="text-lg font-bold text-void-100 mb-4">{t('roguelike.campRemove')}</h2>
        <div className="grid grid-cols-3 gap-2">
          {uniqueDeck.map((id) => {
            const card = getCardById(id);
            if (!card) return null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  applyCampChoice('remove', id);
                  onDone();
                }}
                className="rounded-lg border border-void-600 hover:border-red-500/60 p-1"
              >
                <MiniCard card={card} />
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => setMode('choose')} className="mt-4 text-sm text-void-400">
          {t('common.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 bg-void-950 safe-bottom">
      <h2 className="text-xl font-bold text-void-100 mb-2">🔥 {t('roguelike.campTitle')}</h2>
      <p className="text-sm text-void-400 mb-8 text-center">{t('roguelike.campHint')}</p>
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button
          type="button"
          onClick={() => {
            applyCampChoice('rest');
            onDone();
          }}
          className="p-4 rounded-xl border border-green-700/50 bg-green-950/30 text-left hover:bg-green-900/30"
        >
          <p className="font-semibold text-green-200">{t('roguelike.campRest')}</p>
          <p className="text-sm text-void-400">{t('roguelike.campRestDesc')}</p>
        </button>
        <button
          type="button"
          onClick={() => setMode('upgrade')}
          className="p-4 rounded-xl border border-amber-700/50 bg-amber-950/30 text-left hover:bg-amber-900/30"
        >
          <p className="font-semibold text-amber-200">{t('roguelike.campUpgrade')}</p>
          <p className="text-sm text-void-400">{t('roguelike.campUpgradeDesc')}</p>
        </button>
        <button
          type="button"
          onClick={() => setMode('remove')}
          className="p-4 rounded-xl border border-red-700/50 bg-red-950/30 text-left hover:bg-red-900/30"
        >
          <p className="font-semibold text-red-200">{t('roguelike.campRemove')}</p>
          <p className="text-sm text-void-400">{t('roguelike.campRemoveDesc')}</p>
        </button>
      </div>
    </div>
  );
}

interface EventProps {
  onDone: () => void;
}

export function RunEventScreen({ onDone }: EventProps) {
  const { t } = useTranslation();
  const run = useRoguelikeStore((s) => s.run);
  const resolveEventChoice = useRoguelikeStore((s) => s.resolveEventChoice);
  if (!run?.pendingEventId) return null;

  const event = ROGUELIKE_EVENTS.find((e) => e.id === run.pendingEventId);
  if (!event) return null;

  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 bg-void-950 safe-bottom">
      <h2 className="text-xl font-bold text-void-100 mb-2">{event.title}</h2>
      <p className="text-sm text-void-400 mb-8 text-center max-w-md">{event.description}</p>
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {event.choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            onClick={() => {
              resolveEventChoice(choice.id);
              onDone();
            }}
            className="p-4 rounded-xl border border-void-600 bg-void-900/60 text-left hover:bg-void-800/60"
          >
            <p className="font-semibold text-void-100">{choice.label}</p>
            <p className="text-sm text-void-400">{choice.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
