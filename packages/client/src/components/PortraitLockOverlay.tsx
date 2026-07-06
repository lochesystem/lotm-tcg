import { usePortraitLock } from '../hooks/usePortraitLock';
import { useTranslation } from '../i18n';

export function PortraitLockOverlay() {
  const blocked = usePortraitLock();
  const { t } = useTranslation();

  if (!blocked) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 bg-void-950 px-8 text-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="portrait-lock-title"
    >
      <div className="portrait-hint-icon text-5xl" aria-hidden>
        📱
      </div>
      <h2 id="portrait-lock-title" className="text-xl font-serif text-white">
        {t('orientation.rotateTitle')}
      </h2>
      <p className="max-w-xs text-sm text-void-300">{t('orientation.rotateHint')}</p>
    </div>
  );
}
