import { useCallback } from 'react';
import { useLocaleStore } from './localeStore';
import { ptBR } from './messages/pt-BR';
import { enUS } from './messages/en-US';
import type { Locale } from './types';

const CATALOG = {
  'pt-BR': ptBR,
  'en-US': enUS,
} as const;

type MessageTree = typeof ptBR | typeof enUS;

function getNestedValue(tree: MessageTree, key: string): string | undefined {
  const parts = key.split('.');
  let node: unknown = tree;
  for (const part of parts) {
    if (node == null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const catalog = CATALOG[locale];
  const value = getNestedValue(catalog, key);
  if (value !== undefined) return interpolate(value, vars);
  const fallback = getNestedValue(CATALOG['en-US'], key);
  if (fallback !== undefined) return interpolate(fallback, vars);
  return key;
}

export function useTranslation() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );

  return { t, locale, setLocale };
}

export function useT() {
  return useTranslation().t;
}
