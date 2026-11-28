import './menu/overlays.css';
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
              className="veil-language-option"
              aria-pressed={selected}
            >
              <span>{t(`options.languages.${code}`)}</span>
              {selected && <span className="float-right text-[#edccd0]">✓</span>}
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
              ? 'border-[#c2939b] bg-[#571c2c] text-[#fff0e6]'
              : 'border-void-600 bg-void-900/60 text-void-500 hover:border-void-500'
          }`}
          aria-pressed={locale === code}
          aria-label={t(`options.languages.${code}`)}
        >
          {SHORT_LABELS[code]}
        </button>
      ))}
    </div>
  );
}
