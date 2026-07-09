import { motion } from 'framer-motion';
import { PATHWAYS, type Pathway, type PathwayDefinition } from 'game-engine';
import { useTranslation } from '../i18n';
import { useLocalizedCardText } from '../hooks/useLocalizedCardText';

const PATHWAY_ICONS: Record<string, string> = {
  fool: '🎭',
  'red-priest': '🔥',
  tyrant: '⚡',
  sun: '☀️',
  door: '🚪',
  demoness: '🌙',
};

interface Props {
  selectedPathway: Pathway;
  onSelectPathway: (pathway: Pathway) => void;
  isPathwayUnlocked: (pathway: Pathway) => boolean;
}

export function PathwayHeroCard({ selectedPathway, onSelectPathway, isPathwayUnlocked }: Props) {
  const { t } = useTranslation();
  const { pathwayIdentity, pathwayPowerDescription } = useLocalizedCardText();
  const pw = PATHWAYS[selectedPathway];

  return (
    <div className="relative w-full rounded-2xl border border-purple-500/35 bg-gradient-to-br from-void-900/95 via-purple-950/50 to-void-950/95 p-3 shadow-lg shadow-purple-950/40 hub-card-glow">
      <div className="flex gap-3">
        <div className="flex-none w-[76px] h-[76px] rounded-xl border border-purple-400/30 bg-gradient-to-br from-purple-900/40 to-void-950/80 flex items-center justify-center text-4xl shadow-inner shadow-purple-900/30">
          {PATHWAY_ICONS[selectedPathway]}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-purple-300/80 uppercase tracking-widest font-medium">
            {t('home.pathwayLabel')}
          </p>
          <h2 className="text-base font-bold text-void-50 truncate">
            {pw.name}
            <span className="text-void-400 font-normal text-sm ml-1.5">
              ({pathwayIdentity(selectedPathway)})
            </span>
          </h2>
          <p className="text-[11px] text-void-300 mt-1 line-clamp-2">
            <span className="text-purple-300 font-semibold">{t('home.pathwayPower')}</span>{' '}
            {pw.powerName}
            <span className="text-void-500"> {t('home.pathwayPowerCost')}</span>
          </p>
          <p className="text-[10px] text-void-500 mt-0.5 line-clamp-2">
            {pathwayPowerDescription(selectedPathway)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {Object.values(PATHWAYS).map((entry: PathwayDefinition) => {
          const pathway = entry.id as Pathway;
          const unlocked = isPathwayUnlocked(pathway);
          const selected = selectedPathway === pathway;

          return (
            <motion.button
              key={pathway}
              type="button"
              disabled={!unlocked}
              onClick={() => unlocked && onSelectPathway(pathway)}
              whileTap={unlocked ? { scale: 0.95 } : undefined}
              className={`flex-none w-10 h-10 rounded-lg border flex items-center justify-center text-lg transition-all ${
                !unlocked
                  ? 'border-void-800 bg-void-950/80 opacity-40 cursor-not-allowed'
                  : selected
                    ? 'border-purple-400 bg-purple-900/50 shadow-md shadow-purple-900/40'
                    : 'border-void-700 bg-void-900/60 hover:border-void-500'
              }`}
              title={unlocked ? entry.name : t('home.locked')}
            >
              {unlocked ? PATHWAY_ICONS[pathway] : '🔒'}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
