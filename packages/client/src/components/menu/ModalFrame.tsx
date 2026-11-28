import { useEffect, useRef, type ReactNode } from 'react';
import './menu.css';
import './screens.css';

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
