import { useLocaleStore } from '../i18n/localeStore';
import { getLocalizedCardDescription } from '../i18n/cardText';
import {
  getCardTypeLabel,
  getPathwayText,
  getRarityLabel,
  getStoryChapterLabel,
} from '../i18n/gameText';
import type { Pathway } from 'game-engine';
import { PATHWAYS } from 'game-engine';

export function useLocalizedCardText() {
  const locale = useLocaleStore((s) => s.locale);

  return {
    locale,
    cardDescription: (description: string) => getLocalizedCardDescription(description, locale),
    cardType: (type: string) => getCardTypeLabel(locale, type),
    rarity: (rarity: string) => getRarityLabel(locale, rarity),
    pathwayIdentity: (pathway: Pathway) =>
      getPathwayText(locale, pathway, 'identity', PATHWAYS[pathway].identity),
    pathwayPowerDescription: (pathway: Pathway) =>
      getPathwayText(locale, pathway, 'powerDescription', PATHWAYS[pathway].powerDescription),
    storyChapter: (pathway: Pathway) => getStoryChapterLabel(locale, pathway),
    noEffect: locale === 'pt-BR' ? 'Sem efeito especial.' : 'No special effect.',
    noAbility: locale === 'pt-BR' ? 'Sem habilidade especial.' : 'No special ability.',
  };
}
