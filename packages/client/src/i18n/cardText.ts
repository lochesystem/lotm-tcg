import type { Locale } from './types';
import { translateCardDescriptionToPt } from './translateCardToPt';

/** Localized card effect text — card `name` is never translated here. */
export function getLocalizedCardDescription(description: string, locale: Locale): string {
  if (!description) return '';
  if (locale === 'en-US') return description;
  return translateCardDescriptionToPt(description);
}
