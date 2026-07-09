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
      className="flex-none border-t border-purple-900/40 bg-void-950/95 backdrop-blur-md safe-bottom-nav"
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

        <div className="flex flex-col items-center -mt-3 pb-0.5">
          <motion.button
            type="button"
            onClick={() => onNavigate('home')}
            whileTap={{ scale: 0.94 }}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-display font-bold border-2 shadow-lg transition-all ${
              active === 'home'
                ? 'border-purple-300 bg-gradient-to-br from-purple-500 to-purple-800 text-white shadow-purple-900/50'
                : 'border-purple-500/50 bg-gradient-to-br from-purple-700 to-purple-950 text-purple-100 shadow-black/40'
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
