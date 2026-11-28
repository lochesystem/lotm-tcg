import { useEffect, useRef, type ReactNode } from 'react';
import './menu.css';
import './screens.css';
import './overlays.css';

/** Native top layer supplies focus containment, inert background and focus return. */
export function ModalFrame({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} className="veil-ui veil-dialog veil-floating" aria-label={title} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>{children}</dialog>;
}

export function ModalHeading({ title, onClose, closeLabel, children }: { title: string; onClose: () => void; closeLabel: string; children?: ReactNode }) {
  return <header className="veil-modal-heading"><h2>{title}</h2><div className="veil-modal-actions">{children}<button type="button" className="veil-icon-button" onClick={onClose} aria-label={closeLabel}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button></div></header>;
}
