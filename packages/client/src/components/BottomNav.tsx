import { motion } from 'framer-motion';
import type { Screen } from '../App';
import { useTranslation } from '../i18n';
import { HomeIcon } from './HomeIcon';

export type NavScreen = 'home' | 'collection' | 'deck-builder' | 'shop';

interface Props {
  active: NavScreen;
  onNavigate: (screen: NavScreen) => void;
  onOpenProfile: () => void;
}

const NAV_HIGHLIGHT = 'nav-highlight';

export function BottomNav({ active, onNavigate, onOpenProfile }: Props) {
  const { t } = useTranslation();

  return (
    <nav
      className="flex-none border-t border-purple-800/50 bg-void-950/98 backdrop-blur-lg safe-bottom-nav shadow-[0_-8px_32px_rgba(88,28,135,0.15)]"
      aria-label={t('nav.ariaLabel')}
    >
      <div className="grid grid-cols-5 max-w-lg mx-auto items-stretch px-1 min-h-[4.25rem]">
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

        <HomeNavItem
          label={t('nav.home')}
          active={active === 'home'}
          onClick={() => onNavigate('home')}
        />

        <NavItem
          icon="✦"
          label={t('nav.shop')}
          active={active === 'shop'}
          onClick={() => onNavigate('shop')}
        />

        <NavItem
          icon="👤"
          label={t('nav.profile')}
          active={false}
          onClick={onOpenProfile}
        />
      </div>
    </nav>
  );
}

function NavHighlight() {
  return (
    <motion.div
      layoutId={NAV_HIGHLIGHT}
      className="absolute inset-x-0.5 inset-y-1 rounded-xl bg-purple-900/40 border border-purple-500/25 nav-item-glow"
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
    />
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
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      className={`relative flex flex-col items-center justify-end gap-1 py-2 pb-1 px-0.5 min-h-[3.5rem] ${
        active ? 'text-purple-200' : 'text-void-500 hover:text-void-300'
      }`}
    >
      {active && <NavHighlight />}

      <motion.span
        className="relative z-10 flex items-center justify-center w-9 h-9"
        animate={
          active
            ? { scale: [1, 1.1, 1], y: [0, -1, 0] }
            : { scale: 1, y: 0 }
        }
        transition={
          active
            ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.2 }
        }
      >
        <span className="text-xl leading-none select-none">{icon}</span>
      </motion.span>

      <span
        className={`relative z-10 text-[9px] font-medium tracking-wide uppercase leading-none ${
          active ? 'nav-label-active' : ''
        }`}
      >
        {label}
      </span>
    </motion.button>
  );
}

function HomeNavItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      aria-label={label}
      title={label}
      className={`relative flex flex-col items-center justify-end gap-0.5 py-1.5 pb-1 px-0.5 min-h-[3.5rem] ${
        active ? 'text-purple-200' : 'text-void-500 hover:text-void-300'
      }`}
    >
      {active && <NavHighlight />}

      <div className="relative z-10 flex items-center justify-center -mt-3 mb-0.5">
        {active && (
          <>
            <span className="absolute inset-0 rounded-full nav-play-ring nav-play-ring-outer" aria-hidden />
            <span className="absolute inset-0 rounded-full nav-play-ring nav-play-ring-inner" aria-hidden />
          </>
        )}
        <motion.div
          animate={active ? { scale: [1, 1.04, 1] } : { scale: 1 }}
          transition={
            active
              ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.15 }
          }
          className={`relative w-[3rem] h-[3rem] rounded-full flex items-center justify-center border-2 play-nav-btn ${
            active
              ? 'border-purple-200 bg-gradient-to-br from-purple-400 to-purple-800 text-white'
              : 'border-purple-500/60 bg-gradient-to-br from-purple-700 to-purple-950 text-purple-100'
          }`}
        >
          <HomeIcon className="w-[1.125rem] h-[1.125rem]" />
        </motion.div>
      </div>

      <span
        className={`relative z-10 text-[8px] font-medium tracking-wide uppercase leading-none ${
          active ? 'nav-label-active' : ''
        }`}
      >
        {label}
      </span>
    </motion.button>
  );
}

export function isNavScreen(screen: Screen): screen is NavScreen {
  return screen === 'home' || screen === 'collection' || screen === 'deck-builder' || screen === 'shop';
}
