import { motion } from 'framer-motion';

interface Props {
  value: number;
  type: 'damage' | 'heal' | 'buff';
  x?: number;
  y?: number;
}

export function DamageNumber({ value, type, x = 0, y = 0 }: Props) {
  const color = type === 'damage' ? 'text-red-400' : type === 'heal' ? 'text-green-400' : 'text-blue-400';
  const prefix = type === 'damage' ? '-' : '+';

  return (
    <motion.div
      className={`absolute pointer-events-none font-bold text-lg ${color} drop-shadow-lg z-50`}
      style={{ left: `${x}px`, top: `${y}px` }}
      initial={{ opacity: 1, y: 0, scale: 1.2 }}
      animate={{ opacity: 0, y: -40, scale: 0.8 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      {prefix}{value}
    </motion.div>
  );
}
