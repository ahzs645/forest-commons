import { useEffect, useRef, useState } from 'react';
import type { Game } from '../simulation/types';
import { MapQueueHistory } from './queue-editing';

export default function useMapQueueUndo(game: Game, onChange: (game: Game) => void) {
  const history = useRef<MapQueueHistory | null>(null);
  if (!history.current) history.current = new MapQueueHistory(game);
  const [count, setCount] = useState(0);
  // External operations, restored saves and campaign changes invalidate undo.
  useEffect(() => { history.current!.observe(game); setCount(history.current!.count); }, [game]);
  const changeQueue = (next: Game) => {
    if (next === game) return;
    history.current!.record(game, next);
    setCount(history.current!.count);
    onChange(next);
  };
  const undo = () => {
    const next = history.current!.undo(game);
    setCount(history.current!.count);
    if (next !== game) onChange(next);
  };
  return { changeQueue, undo, count };
}
