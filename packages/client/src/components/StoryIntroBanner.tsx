import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getStoryChapterLabel, type Pathway } from 'game-engine';

const VISIBLE_MS = 3200;

interface Props {
  matchId: string;
  pathway: Pathway;
}

export function StoryIntroBanner({ matchId, pathway }: Props) {
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
          className="absolute top-11 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.35 } }}
          exit={{ opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.45 } }}
        >
          <div className="px-4 py-1.5 rounded-full bg-purple-900/90 border border-purple-500/40 text-[10px] font-medium text-purple-100 shadow-lg shadow-purple-900/30 backdrop-blur-sm whitespace-nowrap">
            Modo História — {getStoryChapterLabel(pathway)}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
