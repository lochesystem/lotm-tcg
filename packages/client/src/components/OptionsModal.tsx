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
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-void-900 border border-void-500 rounded-2xl max-w-sm w-full shadow-2xl"
            initial={{ scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-void-700">
              <h2 className="text-lg font-display font-bold">{t('options.title')}</h2>
              <button
                type="button"
                onClick={onClose}
                className="min-w-[2rem] min-h-[2rem] flex items-center justify-center rounded-lg text-void-400 hover:text-white hover:bg-void-800"
                aria-label={t('common.close')}
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4">
              {canShowProfile && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenProfile?.();
                  }}
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium border border-void-600 bg-void-800/60 text-void-200 hover:border-purple-500/50 hover:bg-void-800 transition-colors text-left"
                >
                  {t('options.profileLink')}
                  {!isSupabaseConfigured || !getCurrentUserId() ? (
                    <span className="block text-[10px] text-void-500 mt-0.5 font-normal">
                      {t('profile.loginHint')}
                    </span>
                  ) : null}
                </button>
              )}

              <div>
                <p className="text-xs font-semibold text-void-300 uppercase tracking-wider mb-1">
                  {t('options.language')}
                </p>
                <p className="text-[11px] text-void-500 mb-3 leading-relaxed">
                  {t('options.languageHint')}
                </p>
                <LocaleSwitcher variant="menu" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
