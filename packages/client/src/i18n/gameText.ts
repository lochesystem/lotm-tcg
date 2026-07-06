import type { Keyword, Pathway } from 'game-engine';
import type { Locale } from './types';
import { translate } from './useTranslation';

export function getPathwayText(
  locale: Locale,
  pathway: Pathway,
  field: 'identity' | 'powerDescription',
  fallback: string,
): string {
  const key = `pathways.${pathway}.${field}`;
  const value = translate(locale, key);
  return value === key ? fallback : value;
}

export function getKeywordText(
  locale: Locale,
  keyword: Keyword,
  field: 'name' | 'description',
  fallbackName: string,
  fallbackDescription: string,
): string {
  const camel = keyword.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  const key = `keywords.${camel}.${field}`;
  const value = translate(locale, key);
  if (value === key) {
    return field === 'name' ? fallbackName : fallbackDescription;
  }
  return value;
}

export function getCardTypeLabel(locale: Locale, type: string): string {
  const key = `cardTypes.${type}`;
  const value = translate(locale, key);
  return value === key ? type : value;
}

export function getStoryChapterLabel(locale: Locale, pathway: Pathway): string {
  const key = `story.chapters.${pathway}`;
  const value = translate(locale, key);
  return value === key ? pathway : value;
}

export function getRarityLabel(locale: Locale, rarity: string): string {
  const key = `rarity.${rarity}`;
  const value = translate(locale, key);
  return value === key ? rarity : value;
}
