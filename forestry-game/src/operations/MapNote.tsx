import { useId, useState, type ReactNode } from 'react';
import Sheet, { useIsPhone } from './Sheet';

/**
 * A short note over the map. Wide screens expand it in place; phones open it
 * as a sheet so the map stays clear.
 */
export default function MapNote({ summary, className = '', children }: {
  summary: ReactNode; className?: string; children: ReactNode;
}) {
  const phone = useIsPhone();
  const [open, setOpen] = useState(false);
  const title = useId();
  if (!phone) return <details className={`map-overlay-note ${className}`}><summary>{summary}</summary>{children}</details>;
  return <>
    <button type="button" className={`map-overlay-note map-note-pill ${className}`} aria-haspopup="dialog" onClick={() => setOpen(true)}>{summary}</button>
    {open && <Sheet className="map-note-sheet" labelledBy={title} onClose={() => setOpen(false)}>
      <div className="dialog-body"><h2 id={title}>{summary}</h2>{children}</div>
    </Sheet>}
  </>;
}
