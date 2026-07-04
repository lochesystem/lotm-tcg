import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  show: boolean;
}

export function AttackLine({ show }: Props) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
        >
          {/* Screen flash */}
          <motion.div
            className="absolute inset-0 bg-white/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.25 }}
          />

          {/* Diagonal slash 1 */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-1.5 bg-gradient-to-r from-transparent via-orange-300 to-transparent rounded-full rotate-12 origin-center"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: [0, 1.3, 0.9], opacity: [0, 1, 0] }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />

          {/* Diagonal slash 2 (delayed) */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-red-400 to-transparent rounded-full -rotate-6 origin-center"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: [0, 1.1, 0.8], opacity: [0, 0.8, 0] }}
            transition={{ duration: 0.25, delay: 0.05, ease: 'easeOut' }}
          />

          {/* Impact sparks */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-yellow-200/80 blur-sm"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 2.5, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 0.3, delay: 0.05 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
