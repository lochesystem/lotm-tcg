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

export function BottomNav({ active, onNavigate, onOpenProfile }: Props) {
  const { t } = useTranslation();

  return (
    <nav
      className="flex-none border-t border-purple-800/50 bg-void-950/98 backdrop-blur-lg safe-bottom-nav shadow-[0_-8px_32px_rgba(88,28,135,0.15)]"
      aria-label={t('nav.ariaLabel')}
    >
      <div className="grid grid-cols-5 max-w-lg mx-auto items-end px-1 min-h-[4.25rem]">
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

        <div className="flex flex-col items-center justify-end pb-0.5 self-stretch">
          <div className="relative flex items-center justify-center -mt-5 mb-1">
            {active === 'home' && (
              <>
                <span className="absolute inset-0 rounded-full nav-play-ring nav-play-ring-outer" aria-hidden />
                <span className="absolute inset-0 rounded-full nav-play-ring nav-play-ring-inner" aria-hidden />
              </>
            )}
            <motion.button
              type="button"
              onClick={() => onNavigate('home')}
              whileTap={{ scale: 0.92 }}
              animate={
                active === 'home'
                  ? { scale: [1, 1.04, 1] }
                  : { scale: 1 }
              }
              transition={
                active === 'home'
                  ? { scale: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } }
                  : { duration: 0.15 }
              }
              className={`relative z-10 w-[3.25rem] h-[3.25rem] rounded-full flex items-center justify-center border-2 play-nav-btn ${
                active === 'home'
                  ? 'border-purple-200 bg-gradient-to-br from-purple-400 to-purple-800 text-white'
                  : 'border-purple-500/60 bg-gradient-to-br from-purple-700 to-purple-950 text-purple-100'
              }`}
              aria-label={t('nav.home')}
              title={t('nav.home')}
            >
              <HomeIcon className="w-[1.125rem] h-[1.125rem]" />
            </motion.button>
          </div>
          <span
            className={`text-[8px] font-medium tracking-wide uppercase ${
              active === 'home' ? 'text-purple-200 nav-label-active' : 'text-void-500'
            }`}
          >
            {t('nav.home')}
          </span>
        </div>

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
          highlightId="nav-profile"
        />
      </div>
    </nav>
  );
}

function NavItem({
  icon,
  label,
  active,
  onClick,
  highlightId = 'nav-highlight',
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
  highlightId?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      className={`relative flex flex-col items-center justify-end gap-1 py-2 pb-0.5 px-1 self-stretch min-h-[3.25rem] ${
        active ? 'text-purple-200' : 'text-void-500 hover:text-void-300'
      }`}
    >
      {active && (
        <motion.div
          layoutId={highlightId}
          className="absolute inset-x-0.5 top-1 bottom-5 rounded-xl bg-purple-900/40 border border-purple-500/25 nav-item-glow"
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        />
      )}

      <motion.span
        className="relative flex items-center justify-center w-9 h-9 rounded-xl"
        animate={
          active
            ? {
                scale: [1, 1.12, 1],
                y: [0, -2, 0],
              }
            : { scale: 1, y: 0 }
        }
        transition={
          active
            ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.2 }
        }
      >
        {active && (
          <motion.span
            className="absolute inset-0 rounded-xl bg-purple-500/20 blur-sm"
            animate={{ opacity: [0.4, 0.85, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          />
        )}
        <span className="relative text-xl leading-none select-none">{icon}</span>
      </motion.span>

      <span
        className={`relative text-[9px] font-medium tracking-wide uppercase leading-none ${
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
