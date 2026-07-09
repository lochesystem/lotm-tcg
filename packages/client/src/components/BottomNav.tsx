import { motion } from 'framer-motion';
import type { Screen } from '../App';
import { useTranslation } from '../i18n';

export type NavScreen = 'home' | 'collection' | 'deck-builder' | 'shop';

interface Props {
  active: NavScreen;
  onNavigate: (screen: NavScreen) => void;
  onOpenProfile: () => void;
}

export function BottomNav({ active, onNavigate, onOpenProfile }: Props) {
  const { t } = useTranslation();

  return (
    <nav
      className="flex-none border-t border-purple-800/50 bg-void-950/98 backdrop-blur-lg safe-bottom-nav shadow-[0_-8px_32px_rgba(88,28,135,0.15)]"
      aria-label={t('nav.ariaLabel')}
    >
      <div className="grid grid-cols-5 max-w-lg mx-auto items-end px-1">
        <NavItem
          icon="🎭"
          label={t('nav.collection')}
          active={active === 'collection'}
          onClick={() => onNavigate('collection')}
        />

        <NavItem
          icon="🃏"
          label={t('nav.deck')}
          active={active === 'deck-builder'}
          onClick={() => onNavigate('deck-builder')}
        />

        <div className="flex flex-col items-center -mt-4 pb-0.5">
          <motion.button
            type="button"
            onClick={() => onNavigate('home')}
            whileTap={{ scale: 0.94 }}
            animate={active === 'home' ? { boxShadow: ['0 0 20px rgba(168,85,247,0.4)', '0 0 28px rgba(168,85,247,0.55)', '0 0 20px rgba(168,85,247,0.4)'] } : {}}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className={`w-13 h-13 w-[3.25rem] h-[3.25rem] rounded-full flex items-center justify-center text-base font-display font-bold border-2 transition-colors play-nav-btn ${
              active === 'home'
                ? 'border-purple-200 bg-gradient-to-br from-purple-400 to-purple-800 text-white'
                : 'border-purple-500/60 bg-gradient-to-br from-purple-700 to-purple-950 text-purple-100'
            }`}
            aria-label={t('nav.play')}
            title={t('nav.play')}
          >
            ▶
          </motion.button>
          <span
            className={`text-[8px] font-medium tracking-wide uppercase mt-1 ${
              active === 'home' ? 'text-purple-200' : 'text-void-500'
            }`}
          >
            {t('nav.play')}
          </span>
        </div>

        <NavItem
          icon="✦"
          label={t('nav.shop')}
          active={active === 'shop'}
          onClick={() => onNavigate('shop')}
        />

        <button
          type="button"
          onClick={onOpenProfile}
          className="relative flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 text-void-500 hover:text-void-300 transition-colors"
        >
          <span className="relative text-xl leading-none">👤</span>
          <span className="relative text-[9px] font-medium tracking-wide uppercase">
            {t('nav.profile')}
          </span>
        </button>
      </div>
    </nav>
  );
}

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 transition-colors ${
        active ? 'text-purple-200' : 'text-void-500 hover:text-void-300'
      }`}
    >
      {active && (
        <motion.div
          layoutId="nav-highlight"
          className="absolute inset-x-1 top-1 bottom-1 rounded-xl bg-purple-900/35 border border-purple-500/20"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      <span className="relative text-xl leading-none">{icon}</span>
      <span className="relative text-[9px] font-medium tracking-wide uppercase">{label}</span>
    </button>
  );
}

export function isNavScreen(screen: Screen): screen is NavScreen {
  return screen === 'home' || screen === 'collection' || screen === 'deck-builder' || screen === 'shop';
}
