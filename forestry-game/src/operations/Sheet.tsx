import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useLanguage } from '../i18n';
import './sheet.css';

const PHONE = '(max-width: 600px)';

/** True while the phone layout is active; follows window resizes. */
export function useIsPhone() {
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(PHONE).matches);
  useEffect(() => {
    const query = window.matchMedia?.(PHONE);
    if (!query) return;
    const update = () => setPhone(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return phone;
}

/**
 * Modal surface shared by the app's dialogs. A centred dialog on wide screens
 * and a bottom sheet on phones, where the grip can be dragged down to dismiss.
 * Escape and a backdrop tap close it; focus returns to whatever opened it.
 */
export default function Sheet({ open = true, onClose, className = '', labelledBy, label, returnFocus, children }: {
  open?: boolean;
  onClose: () => void;
  className?: string;
  labelledBy?: string;
  label?: string;
  returnFocus?: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const shown = useRef(false);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      element.showModal?.();
      shown.current = true;
    } else if (!open && element.open) element.close();
    // Only a sheet that was actually shown hands focus back.
    if (!open && shown.current) { shown.current = false; restoreFocus(returnFocus, opener); }
  }, [open, returnFocus]);
  useEffect(() => () => {
    dialog.current?.close?.();
    if (shown.current) restoreFocus(returnFocus, opener);
  }, [returnFocus]);
  return <dialog ref={dialog} className={`sheet ${className}`.trim()} aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : label}
    onCancel={event => { event.preventDefault(); close.current(); }}
    onClick={event => { if (event.target === event.currentTarget) close.current(); }}>
    <SheetGrip dialog={dialog} onDismiss={() => close.current()} />
    {children}
  </dialog>;
}

function restoreFocus(returnFocus: RefObject<HTMLElement | null> | undefined, opener: RefObject<HTMLElement | null>) {
  const target = returnFocus?.current ?? opener.current;
  if (target?.isConnected && !target.hasAttribute('disabled')) target.focus();
}

/** Drag handle shown on phones only; following the finger, then dismissing past a threshold. */
function SheetGrip({ dialog, onDismiss }: { dialog: RefObject<HTMLDialogElement | null>; onDismiss: () => void }) {
  const { language } = useLanguage();
  const start = useRef<{ id: number; y: number } | null>(null);
  const move = (offset: number) => { if (dialog.current) dialog.current.style.transform = offset > 0 ? `translateY(${offset}px)` : ''; };
  // Out of the tab order: opening focuses the content, and Escape closes for keyboard users.
  return <button type="button" tabIndex={-1} className="sheet-grip" aria-label={language === 'fr' ? 'Fermer' : 'Close'}
    onPointerDown={event => {
      if (event.button !== 0) return;
      start.current = { id: event.pointerId, y: event.clientY };
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={event => { if (start.current?.id === event.pointerId) move(event.clientY - start.current.y); }}
    onPointerUp={event => {
      const origin = start.current;
      start.current = null;
      if (!origin || origin.id !== event.pointerId) return;
      const distance = event.clientY - origin.y;
      move(0);
      if (distance > 80) onDismiss();
    }}
    onPointerCancel={() => { start.current = null; move(0); }}
    onClick={event => { if (event.detail === 0) onDismiss(); }}>
    <span aria-hidden="true" />
  </button>;
}
