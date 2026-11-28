import { MenuIcon } from './menu/MenuPrimitives';
import { ModalFrame, ModalHeading } from './menu/ModalFrame';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../i18n';
import { useAuthStore } from '../stores/authStore';
import { useCollectionStore } from '../stores/collectionStore';
import { fetchMatchHistory } from '../sync/player-sync';
import { isSupabaseConfigured } from '../lib/supabase';
import type { DbMatchHistory } from '../lib/supabase';
import { getCurrentUserId } from '../lib/sessionContext';
import { formatPlayerHandle } from '../lib/playerDisplay';

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

function opponentLabelForMatch(
  match: DbMatchHistory,
  t: (key: string) => string
): string {
  const raw = match.opponent_label ?? t('profile.unknownOpponent');
  const mode = match.match_mode ?? (match.opponent_type === 'pvp' ? 'pvp' : 'npc');
  if (mode === 'ranked') return formatPlayerHandle(raw);
  return raw;
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
        <ModalFrame title={t('profile.title')} onClose={onClose}>
          <motion.div
            className="veil-floating-surface veil-profile flex flex-col"
            initial={{ scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalHeading title={t('profile.title')} onClose={onClose} closeLabel={t('common.close')}>
              {onOpenOptions && <button type="button" className="veil-icon-button" aria-label={t('home.optionsButton')} onClick={() => { onClose(); onOpenOptions(); }}><MenuIcon name="settings" /></button>}
            </ModalHeading>

            <div className="veil-modal-content flex-1 overflow-y-auto space-y-4">
              {profile && (
                <p className="veil-profile-handle">
                  @{profile.username}
                </p>
              )}

              <div className="veil-profile-stats">
                <div className="veil-profile-stat">
                  <p className="text-xs uppercase tracking-wider text-green-400/80">{t('profile.wins')}</p>
                  <p className="text-2xl font-bold text-green-300">{wins}</p>
                </div>
                <div className="veil-profile-stat">
                  <p className="text-xs uppercase tracking-wider text-red-400/80">{t('profile.losses')}</p>
                  <p className="text-2xl font-bold text-red-300">{losses}</p>
                </div>
                <div className="veil-profile-stat">
                  <p className="text-xs uppercase tracking-wider text-purple-400/80">{t('profile.winStreak')}</p>
                  <p className="text-2xl font-bold text-[#edccd0]">{winStreak}</p>
                </div>
              </div>

              {!cloudEnabled && (
                <p className="text-xs text-void-500 text-center leading-relaxed">
                  {profile ? t('profile.localStatsHint') : t('profile.loginHint')}
                </p>
              )}

              <div>
                <p className="text-xs font-semibold text-void-300 uppercase tracking-wider mb-2">
                  {t('profile.recentMatches')}
                </p>

                {loading && (
                  <p className="text-xs text-void-500 text-center py-4">{t('common.loading')}</p>
                )}

                {!loading && cloudEnabled && matches.length === 0 && (
                  <p className="text-xs text-void-500 text-center py-4">{t('profile.noMatches')}</p>
                )}

                {!loading && matches.length > 0 && (
                  <ul className="space-y-2">
                    {matches.map((match) => {
                      const opponent = opponentLabelForMatch(match, t);
                      const result = resultLabel(match, t);
                      const resultClass = match.is_draw
                        ? 'text-void-300'
                        : match.won
                          ? 'text-green-400'
                          : 'text-red-400';

                      return (
                        <li
                          key={match.id}
                          className="veil-match-row"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-void-100 truncate">
                                {t('profile.vs', { opponent })}
                              </p>
                              <p className="text-xs text-void-500 mt-0.5">
                                {matchModeLabel(match, t)} · {t('profile.turns', { n: match.duration_turns })}
                              </p>
                            </div>
                            <span className={`text-xs font-semibold shrink-0 ${resultClass}`}>
                              {result}
                            </span>
                          </div>
                          <p className="text-xs text-void-600 mt-1">
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
                  <p className="text-xs uppercase tracking-wider text-red-300/80">{t('profile.rankedRecord')}</p>
                  <p className="text-sm font-semibold text-red-100">
                    {t('profile.rankedRecordValue', { wins: rankedWins, losses: rankedLosses })}
                  </p>
                </div>
              )}
            </div>

            <div className="veil-modal-footer">
              {isSupabaseConfigured && cloudEnabled && (
                <button
                  type="button"
                  onClick={() => void signOut().then(onClose)}
                  className="veil-button veil-button--secondary w-full"
                >
                  {t('profile.signOut')}
                </button>
              )}
            </div>
          </motion.div>
        </ModalFrame>
      )}
    </AnimatePresence>
  );
}
