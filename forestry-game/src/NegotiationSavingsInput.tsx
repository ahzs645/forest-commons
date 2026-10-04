import { useEffect, useId, useState } from 'react';
import { useNegotiationLanguage } from './negotiation-language';
/** Intermediate text is editable; only complete finite numbers enter the saved draft. */
export function parseNegotiationSavings(raw: string, language: 'en' | 'fr' = 'en'): number | null {
  const text = language === 'fr' ? raw.trim().replace(',', '.') : raw.trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}
export default function NegotiationSavingsInput({ value, label, onCommit }: {
  value: number; label: string; onCommit: (value: number) => void;
}) {
  const { t: tr, language } = useNegotiationLanguage();
  // Display two decimals (kSEK); untouched text never commits, so saved precision is kept.
  const format = (amount: number) => {
    const shown = String(Math.round(amount * 100) / 100 || 0);
    return language === 'fr' ? shown.replace('.', ',') : shown;
  };
  const [draft, setDraft] = useState(format(value));
  const [error, setError] = useState(false);
  const errorId = useId();
  useEffect(() => { setDraft(format(value)); setError(false); }, [value, language]);
  const commit = () => {
    if (draft.trim() === format(value)) { setDraft(format(value)); setError(false); return; }
    const amount = parseNegotiationSavings(draft, language);
    if (amount === null) { setDraft(format(value)); setError(true); return; }
    setDraft(format(amount)); setError(false);
    if (amount !== value) onCommit(amount);
  };
  return <span className="negotiation-savings-input"><input type="text" inputMode="decimal" aria-label={label}
    value={draft} aria-invalid={error || undefined} aria-describedby={error ? errorId : undefined}
    onChange={event => { setDraft(event.target.value); setError(false); }} onBlur={commit}
    onKeyDown={event => {
      if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); }
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setDraft(format(value)); setError(false); }
    }}/>{error && <small id={errorId} role="status">{tr('Value not applied. Enter a finite number.')}</small>}</span>;
}
