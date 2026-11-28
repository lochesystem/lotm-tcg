import { ModalFrame, ModalHeading } from './menu/ModalFrame';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../i18n';
import { LocaleSwitcher } from './LocaleSwitcher';
import { isSupabaseConfigured } from '../lib/supabase';
import { getCurrentUserId } from '../lib/sessionContext';

interface Props {
  show: boolean;
  onClose: () => void;
  onOpenProfile?: () => void;
}

export function OptionsModal({ show, onClose, onOpenProfile }: Props) {
  const { t } = useTranslation();
  const canShowProfile = Boolean(onOpenProfile);

  return (
    <AnimatePresence>
      {show && (
        <ModalFrame title={t('options.title')} onClose={onClose}>
          <motion.div
            className="veil-floating-surface veil-settings"
            initial={{ scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalHeading title={t('options.title')} onClose={onClose} closeLabel={t('common.close')} />

            <div className="veil-modal-content space-y-4">
              {canShowProfile && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenProfile?.();
                  }}
                  className="veil-settings-link"
                >
                  {t('options.profileLink')}
                  {!isSupabaseConfigured || !getCurrentUserId() ? (
                    <span className="block text-xs text-void-500 mt-0.5 font-normal">
                      {t('profile.loginHint')}
                    </span>
                  ) : null}
                </button>
              )}

              <section className="veil-settings-section">
                <p className="veil-section-label">
                  {t('options.language')}
                </p>
                <p className="text-xs text-void-500 mb-3 leading-relaxed">
                  {t('options.languageHint')}
                </p>
                <LocaleSwitcher variant="menu" />
              </section>
            </div>
          </motion.div>
        </ModalFrame>
      )}
    </AnimatePresence>
  );
}
