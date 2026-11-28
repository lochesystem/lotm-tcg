import './menu/overlays.css';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type Pathway } from 'game-engine';
import { useTranslation } from '../i18n';
import { useLocalizedCardText } from '../hooks/useLocalizedCardText';

const VISIBLE_MS = 3200;

interface Props {
  matchId: string;
  pathway: Pathway;
}

export function StoryIntroBanner({ matchId, pathway }: Props) {
  const { t } = useTranslation();
  const { storyChapter } = useLocalizedCardText();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [matchId]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={matchId}
          className="veil-story-notice"
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.35 } }}
          exit={{ opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.45 } }}
        >
          <div className="veil-announcement veil-announcement--compact" role="status">
            {t('battle.storyIntro', { chapter: storyChapter(pathway) })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
