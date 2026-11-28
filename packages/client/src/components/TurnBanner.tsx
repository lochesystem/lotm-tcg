import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { completeTurnBannerWait, TURN_BANNER_EXIT_MS, TURN_BANNER_VISIBLE_MS } from '../constants/turnBanner';
import './menu/overlays.css';
import { useTranslation } from '../i18n';

interface Props {
  turnNumber: number;
  isYourTurn: boolean;
}

export function TurnBanner({ turnNumber, isYourTurn }: Props) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [displayTurn, setDisplayTurn] = useState(turnNumber);
  const [displayIsYours, setDisplayIsYours] = useState(isYourTurn);
  const wasVisibleRef = useRef(false);

  useEffect(() => {
    if (turnNumber < 1) return;

    setDisplayTurn(turnNumber);
    setDisplayIsYours(isYourTurn);
    wasVisibleRef.current = true;
    setVisible(true);

    const timer = setTimeout(() => setVisible(false), TURN_BANNER_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [turnNumber, isYourTurn]);

  useEffect(() => {
    if (visible) return;
    if (!wasVisibleRef.current) return;
    wasVisibleRef.current = false;

    const timer = setTimeout(() => {
      completeTurnBannerWait();
    }, TURN_BANNER_EXIT_MS);

    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div key={`turn-${displayTurn}-${displayIsYours}`} className="veil-turn-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: TURN_BANNER_EXIT_MS / 1000 } }}>
          <motion.div className={`veil-announcement veil-turn-banner ${displayIsYours ? 'veil-turn-banner--player' : 'veil-turn-banner--enemy'}`} role="status" aria-live="polite" aria-atomic="true" initial={{ y: reducedMotion ? 0 : 12 }} animate={{ y: 0 }}>
            <span className="veil-announcement-seal" aria-hidden="true">◇</span>
            <div><p className="veil-announcement-kicker">{t('battle.turnLabel', { n: displayTurn })}</p><h2>{displayIsYours ? t('battle.yourTurn') : t('battle.enemyTurn')}</h2></div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
