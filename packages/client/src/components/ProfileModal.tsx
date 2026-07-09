import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../i18n';
import { useAuthStore } from '../stores/authStore';
import { useCollectionStore } from '../stores/collectionStore';
import { fetchMatchHistory } from '../sync/player-sync';
import { isSupabaseConfigured } from '../lib/supabase';
import type { DbMatchHistory } from '../lib/supabase';
import { getCurrentUserId } from '../lib/sessionContext';

interface Props {
  show: boolean;
  onClose: () => void;
  onOpenOptions?: () => void;
}

function formatPlayedAt(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleString(locale === 'pt-BR' ? 'pt-BR' : 'en-US', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function matchModeLabel(
  match: DbMatchHistory,
  t: (key: string) => string
): string {
  const mode = match.match_mode ?? (match.opponent_type === 'pvp' ? 'pvp' : 'npc');
  if (mode === 'story') return t('profile.modeStory');
  if (mode === 'pvp') return t('profile.modePvp');
  if (mode === 'ranked') return t('profile.modeRanked');
  return t('profile.modeNpc');
}

function resultLabel(match: DbMatchHistory, t: (key: string) => string): string {
  if (match.is_draw) return t('profile.resultDraw');
  return match.won ? t('profile.resultWin') : t('profile.resultLoss');
}

export function ProfileModal({ show, onClose, onOpenOptions }: Props) {
  const { t, locale } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const wins = useCollectionStore((s) => s.wins);
  const losses = useCollectionStore((s) => s.losses);
  const winStreak = useCollectionStore((s) => s.winStreak);
  const rankedWins = useCollectionStore((s) => s.rankedWins);
  const rankedLosses = useCollectionStore((s) => s.rankedLosses);
  const [matches, setMatches] = useState<DbMatchHistory[]>([]);
  const [loading, setLoading] = useState(false);

  const userId = getCurrentUserId();
  const cloudEnabled = isSupabaseConfigured && !!userId;

  useEffect(() => {
    if (!show || !cloudEnabled || !userId) {
      setMatches([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void fetchMatchHistory(userId, 5)
      .then((rows) => {
        if (!cancelled) setMatches(rows);
      })
      .catch(() => {
        if (!cancelled) setMatches([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [show, cloudEnabled, userId]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-void-900 border border-void-500 rounded-2xl max-w-sm w-full max-h-[85vh] flex flex-col shadow-2xl"
            initial={{ scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-void-700 shrink-0">
              <h2 className="text-lg font-display font-bold">{t('profile.title')}</h2>
              <div className="flex items-center gap-1">
                {onOpenOptions && (
                  <button
                    type="button"
                    onClick={onOpenOptions}
                    className="min-w-[2rem] min-h-[2rem] flex items-center justify-center rounded-lg text-void-400 hover:text-white hover:bg-void-800"
                    aria-label={t('home.optionsButton')}
                    title={t('home.optionsButton')}
                  >
                    ⚙️
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="min-w-[2rem] min-h-[2rem] flex items-center justify-center rounded-lg text-void-400 hover:text-white hover:bg-void-800"
                  aria-label={t('common.close')}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {profile && (
                <p className="text-sm text-center text-void-300">
                  @{profile.username}
                </p>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-green-900/50 bg-green-950/30 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-green-400/80">{t('profile.wins')}</p>
                  <p className="text-2xl font-bold text-green-300">{wins}</p>
                </div>
                <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-red-400/80">{t('profile.losses')}</p>
                  <p className="text-2xl font-bold text-red-300">{losses}</p>
                </div>
                <div className="rounded-xl border border-purple-900/50 bg-purple-950/30 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-purple-400/80">{t('profile.winStreak')}</p>
                  <p className="text-2xl font-bold text-purple-300">{winStreak}</p>
                </div>
              </div>

              {!cloudEnabled && (
                <p className="text-[11px] text-void-500 text-center leading-relaxed">
                  {profile ? t('profile.localStatsHint') : t('profile.loginHint')}
                </p>
              )}

              <div>
                <p className="text-xs font-semibold text-void-300 uppercase tracking-wider mb-2">
                  {t('profile.recentMatches')}
                </p>

                {loading && (
                  <p className="text-[11px] text-void-500 text-center py-4">{t('common.loading')}</p>
                )}

                {!loading && cloudEnabled && matches.length === 0 && (
                  <p className="text-[11px] text-void-500 text-center py-4">{t('profile.noMatches')}</p>
                )}

                {!loading && matches.length > 0 && (
                  <ul className="space-y-2">
                    {matches.map((match) => {
                      const opponent =
                        match.opponent_label ?? t('profile.unknownOpponent');
                      const result = resultLabel(match, t);
                      const resultClass = match.is_draw
                        ? 'text-void-300'
                        : match.won
                          ? 'text-green-400'
                          : 'text-red-400';

                      return (
                        <li
                          key={match.id}
                          className="rounded-xl border border-void-700 bg-void-800/50 px-3 py-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-void-100 truncate">
                                {t('profile.vs', { opponent })}
                              </p>
                              <p className="text-[10px] text-void-500 mt-0.5">
                                {matchModeLabel(match, t)} · {t('profile.turns', { n: match.duration_turns })}
                              </p>
                            </div>
                            <span className={`text-xs font-semibold shrink-0 ${resultClass}`}>
                              {result}
                            </span>
                          </div>
                          <p className="text-[9px] text-void-600 mt-1">
                            {formatPlayedAt(match.played_at, locale)}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {cloudEnabled && (rankedWins > 0 || rankedLosses > 0) && (
                <div className="rounded-xl border border-red-900/40 bg-red-950/20 px-3 py-2 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-red-300/80">{t('profile.rankedRecord')}</p>
                  <p className="text-sm font-semibold text-red-100">
                    {t('profile.rankedRecordValue', { wins: rankedWins, losses: rankedLosses })}
                  </p>
                </div>
              )}
            </div>

            <div className="shrink-0 p-4 border-t border-void-800/80">
              {isSupabaseConfigured && cloudEnabled && (
                <button
                  type="button"
                  onClick={() => void signOut().then(onClose)}
                  className="w-full py-2.5 rounded-xl text-sm font-medium text-red-400 border border-red-900/50 bg-red-950/20 hover:bg-red-950/40 hover:text-red-300 transition-colors"
                >
                  {t('profile.signOut')}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
