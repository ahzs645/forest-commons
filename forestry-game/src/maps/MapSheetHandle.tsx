import {useRef, type Dispatch, type SetStateAction} from 'react';
import {useLanguage} from '../i18n';

export type MapSheetSize = 'peek' | 'half' | 'full';

/** Only this handle owns swipe gestures; scrolling forms never drags the sheet. */
export default function MapSheetHandle({size, onChange, controls}: {
  size: MapSheetSize;
  onChange: Dispatch<SetStateAction<MapSheetSize>>;
  controls: string;
}) {
  const {language} = useLanguage();
  const gesture = useRef<{id: number; y: number} | null>(null);
  const swiped = useRef(false);
  return <button type="button" className="map-sheet-handle"
    aria-label={language === 'fr' ? 'Redimensionner les détails de la carte' : 'Resize map details'}
    aria-controls={controls} aria-expanded={size !== 'peek'}
    onPointerDown={event => {
      if (event.button !== 0) return;
      gesture.current = {id: event.pointerId, y: event.clientY};
      swiped.current = false;
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerUp={event => {
      const start = gesture.current;
      gesture.current = null;
      if (!start || start.id !== event.pointerId) return;
      const distance = event.clientY - start.y;
      if (Math.abs(distance) < 35) return;
      swiped.current = true;
      onChange(current => distance < 0 ? (current === 'peek' ? 'half' : 'full') : (current === 'full' ? 'half' : 'peek'));
    }}
    onPointerCancel={() => {gesture.current = null; swiped.current = false;}}
    onLostPointerCapture={() => {gesture.current = null;}}
    onClick={() => {
      if (swiped.current) {swiped.current = false; return;}
      onChange(current => current === 'peek' ? 'half' : current === 'full' ? 'half' : 'full');
    }}>
    <span aria-hidden="true" />
  </button>;
}
