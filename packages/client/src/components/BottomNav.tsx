import type { Screen } from '../App';
import { useTranslation } from '../i18n';
import { MenuIcon, type IconName } from './menu/MenuPrimitives';

export type NavScreen = 'home' | 'collection' | 'deck-builder' | 'shop';
interface Props {
  active: NavScreen;
  onNavigate: (screen: NavScreen) => void;
  onOpenProfile: () => void;
}

export function BottomNav({ active, onNavigate, onOpenProfile }: Props) {
  const { t } = useTranslation();
  const items: { id: NavScreen | 'profile'; label: string; icon: IconName }[] = [
    { id: 'collection', label: t('nav.collection'), icon: 'collection' },
    { id: 'deck-builder', label: t('nav.deck'), icon: 'decks' },
    { id: 'home', label: t('nav.home'), icon: 'home' },
    { id: 'shop', label: t('nav.shop'), icon: 'shop' },
    { id: 'profile', label: t('nav.profile'), icon: 'profile' },
  ];
  return <nav className="veil-ui veil-bottom-nav" aria-label={t('nav.ariaLabel')}>
    <div>{items.map((item) => <button type="button" key={item.id} aria-current={active === item.id ? 'page' : undefined} onClick={() => item.id === 'profile' ? onOpenProfile() : onNavigate(item.id)}>
      <MenuIcon name={item.icon} /><span>{item.label}</span>
    </button>)}</div>
  </nav>;
}

export function isNavScreen(screen: Screen): screen is NavScreen {
  return screen === 'home' || screen === 'collection' || screen === 'deck-builder' || screen === 'shop';
}
