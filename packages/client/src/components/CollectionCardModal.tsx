import type { Card } from 'game-engine';
import { TcgCardFace } from './TcgCardFace';
import { useTranslation } from '../i18n';
import { GameModal } from './menu/MenuPrimitives';
import './menu/screens.css';
export function CollectionCardModal({ card, owned, quantity, onClose }: { card: Card; owned: boolean; quantity: number; onClose: () => void }) {
  const { t } = useTranslation();
  return <GameModal title={card.name} onClose={onClose}><div className="archive-card-detail"><TcgCardFace card={card} showLockedBanner={!owned} /><p>{owned ? t('collection.owned', { quantity }) : t('collection.notOwned')}</p></div></GameModal>;
}
