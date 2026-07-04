import { useLayoutEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  anchorEl: HTMLElement | null;
  show: boolean;
  children: ReactNode;
  /** Prefer showing above anchor; flips below if not enough room */
  placement?: 'top' | 'bottom';
}

export function AnchorTooltip({ anchorEl, show, children, placement = 'top' }: Props) {
  const [style, setStyle] = useState<React.CSSProperties>({ visibility: 'hidden' });

  useLayoutEffect(() => {
    if (!show || !anchorEl) return;

    const update = () => {
      const rect = anchorEl.getBoundingClientRect();
      const margin = 10;
      const pad = 12;
      const maxW = Math.min(288, window.innerWidth - pad * 2);
      const halfW = maxW / 2;

      let centerX = rect.left + rect.width / 2;
      centerX = Math.max(pad + halfW, Math.min(window.innerWidth - pad - halfW, centerX));

      const preferTop = placement === 'top';
      const fitsAbove = rect.top > 96;
      const above = preferTop && fitsAbove;

      setStyle({
        position: 'fixed',
        left: centerX,
        top: above ? rect.top - margin : rect.bottom + margin,
        transform: above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
        zIndex: 9999,
        visibility: 'visible',
        pointerEvents: 'none',
        width: maxW,
      });
    };

    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [show, anchorEl, placement]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {show && anchorEl && (
        <motion.div
          style={style}
          initial={{ opacity: 0, y: placement === 'top' ? 6 : -6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: placement === 'top' ? 6 : -6, scale: 0.96 }}
          transition={{ duration: 0.12 }}
        >
          <div className="rounded-xl border border-void-500 bg-void-900/98 p-3 shadow-2xl backdrop-blur-md">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
