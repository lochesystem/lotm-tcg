import { motion } from 'framer-motion';
import { Pathway } from 'game-engine';

interface Props {
  health: number;
  maxHealth: number;
  pathway: Pathway;
  isEnemy: boolean;
  onClick: () => void;
  hasWeapon?: boolean;
  weaponAttack?: number;
}

const PATHWAY_THEME: Record<Pathway, { icon: string; color: string; ring: string }> = {
  fool: { icon: '🎭', color: 'from-gray-600 to-gray-800', ring: 'ring-gray-400/40' },
  'red-priest': { icon: '🔥', color: 'from-red-700 to-red-900', ring: 'ring-red-400/40' },
  tyrant: { icon: '⚡', color: 'from-sky-700 to-blue-900', ring: 'ring-sky-400/40' },
  sun: { icon: '☀️', color: 'from-amber-600 to-yellow-900', ring: 'ring-amber-400/40' },
  door: { icon: '🚪', color: 'from-emerald-700 to-emerald-900', ring: 'ring-emerald-400/40' },
  demoness: { icon: '🌙', color: 'from-fuchsia-700 to-pink-900', ring: 'ring-fuchsia-400/40' },
};

export function HeroPortrait({ health, maxHealth, pathway, isEnemy, onClick, hasWeapon, weaponAttack }: Props) {
  const healthPercent = Math.max(0, (health / maxHealth) * 100);
  const theme = PATHWAY_THEME[pathway];
  const lowHealth = health <= 10;

  return (
    <motion.button
      onClick={onClick}
      whileHover={isEnemy ? { scale: 1.08 } : undefined}
      whileTap={isEnemy ? { scale: 0.95 } : undefined}
      className={`
        relative w-14 h-14 rounded-full border-2 flex items-center justify-center
        ${isEnemy ? 'border-red-600/60 hover:border-red-400' : 'border-purple-500/60'}
        bg-gradient-to-br ${theme.color}
        ring-2 ${theme.ring}
        shadow-lg
      `}
    >
      <span className="text-xl drop-shadow-md">{theme.icon}</span>

      {/* Health bar underneath */}
      <div className="absolute -bottom-1 left-1 right-1">
        <div className="h-2 bg-void-700/80 rounded-full overflow-hidden border border-void-600/50">
          <motion.div
            className={`h-full rounded-full ${
              health > 20 ? 'bg-gradient-to-r from-green-500 to-green-400' :
              health > 10 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
              'bg-gradient-to-r from-red-500 to-red-400'
            }`}
            animate={{ width: `${healthPercent}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          />
        </div>
      </div>

      {/* Health number */}
      <motion.div
        className={`absolute -bottom-5 text-xs font-black ${lowHealth ? 'text-red-400' : 'text-white'}`}
        animate={lowHealth ? { scale: [1, 1.1, 1] } : {}}
        transition={lowHealth ? { duration: 0.5, repeat: Infinity } : {}}
      >
        {health}/{maxHealth}
      </motion.div>

      {/* Weapon indicator */}
      {hasWeapon && (
        <motion.div
          className="absolute -right-2 -top-1 w-6 h-6 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-800 border-2 border-yellow-400/60 flex items-center justify-center text-[10px] font-black shadow-md"
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: [0, -5, 5, 0] }}
          transition={{ type: 'spring' }}
        >
          {weaponAttack}
        </motion.div>
      )}

      {/* Low health warning */}
      {lowHealth && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-red-500/50"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </motion.button>
  );
}
