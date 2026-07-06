import { useLocaleStore } from '../i18n/localeStore';
import { SUPPORTED_LOCALES, type Locale } from '../i18n/types';
import { useTranslation } from '../i18n';

const SHORT_LABELS: Record<Locale, string> = {
  'pt-BR': 'PT',
  'en-US': 'EN',
};

interface Props {
  className?: string;
  variant?: 'toggle' | 'menu';
}

export function LocaleSwitcher({ className = '', variant = 'toggle' }: Props) {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  if (variant === 'menu') {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {SUPPORTED_LOCALES.map((code) => {
          const selected = locale === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => setLocale(code)}
              className={`w-full px-4 py-3 rounded-xl text-sm font-medium border text-left transition-colors ${
                selected
                  ? 'border-purple-400 bg-purple-900/40 text-purple-100'
                  : 'border-void-600 bg-void-800/60 text-void-300 hover:border-void-500 hover:bg-void-800'
              }`}
              aria-pressed={selected}
            >
              <span>{t(`options.languages.${code}`)}</span>
              {selected && <span className="float-right text-purple-300">✓</span>}
            </button>
          );
        })}
      </div>
    );
  }

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
          aria-label={t(`options.languages.${code}`)}
        >
          {SHORT_LABELS[code]}
        </button>
      ))}
    </div>
  );
}
