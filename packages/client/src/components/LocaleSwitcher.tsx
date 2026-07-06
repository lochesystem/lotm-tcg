import { useLocaleStore } from '../i18n/localeStore';
import { SUPPORTED_LOCALES, type Locale } from '../i18n/types';

const LABELS: Record<Locale, string> = {
  'pt-BR': 'PT',
  'en-US': 'EN',
};

export function LocaleSwitcher({ className = '' }: { className?: string }) {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  return (
    <div className={`flex gap-1 ${className}`}>
      {SUPPORTED_LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
            locale === code
              ? 'border-purple-400 bg-purple-900/50 text-purple-100'
              : 'border-void-600 bg-void-900/60 text-void-500 hover:border-void-500'
          }`}
          aria-label={code}
        >
          {LABELS[code]}
        </button>
      ))}
    </div>
  );
}
