import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../i18n';
import { ptBR } from '../i18n/messages/pt-BR';
import { enUS } from '../i18n/messages/en-US';

interface Props {
  show: boolean;
  onClose: () => void;
}

export function HowToPlay({ show, onClose }: Props) {
  const { t, locale } = useTranslation();
  const [currentSection, setCurrentSection] = useState(0);

  const sections = locale === 'pt-BR' ? ptBR.howToPlay.sections : enUS.howToPlay.sections;

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
            className="bg-void-900 border border-void-500 rounded-2xl max-w-md w-full max-h-[80vh] flex flex-col shadow-2xl"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-void-700">
              <h2 className="text-lg font-display font-bold">{t('howToPlay.title')}</h2>
              <button onClick={onClose} className="text-void-400 hover:text-white text-lg">✕</button>
            </div>

            <div className="flex overflow-x-auto gap-1 p-2 border-b border-void-800">
              {sections.map((section, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSection(i)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all ${
                    currentSection === i
                      ? 'bg-purple-700 text-purple-100'
                      : 'bg-void-800 text-void-400 hover:bg-void-700'
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSection}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  <h3 className="text-base font-bold mb-3 text-purple-200">
                    {sections[currentSection].title}
                  </h3>
                  <p className="text-sm text-void-200 leading-relaxed whitespace-pre-line">
                    {sections[currentSection].content}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between p-4 border-t border-void-700">
              <button
                onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                disabled={currentSection === 0}
                className="px-3 py-1.5 text-xs font-medium text-void-400 hover:text-void-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {t('howToPlay.previous')}
              </button>
              <span className="text-[10px] text-void-500">
                {t('howToPlay.pageOf', { current: currentSection + 1, total: sections.length })}
              </span>
              <button
                onClick={() => setCurrentSection(Math.min(sections.length - 1, currentSection + 1))}
                disabled={currentSection === sections.length - 1}
                className="px-3 py-1.5 text-xs font-medium text-void-400 hover:text-void-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {t('howToPlay.next')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
