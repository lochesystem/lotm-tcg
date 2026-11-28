import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { Card } from 'game-engine';
import { createHoldGesture } from '../utils/holdGesture';
import { GameModal } from './menu/MenuPrimitives';
import { TcgCardFace } from './TcgCardFace';

export function HoldToInspect({ onInspect, children }: { onInspect: () => void; children: ReactNode }) {
  const inspectRef = useRef(onInspect);
  inspectRef.current = onInspect;
  const gesture = useMemo(() => createHoldGesture(() => inspectRef.current()), []);
  useEffect(() => () => gesture.dispose(), [gesture]);
  return <div className="battle-hold-card"
    onPointerDown={(event) => {
      if (!event.isPrimary || event.button !== 0) return;
      gesture.start(event.pointerId, event.clientX, event.clientY);
    }}
    onPointerMove={(event) => gesture.move(event.pointerId, event.clientX, event.clientY)}
    onPointerUp={() => gesture.end()}
    onPointerLeave={() => gesture.cancel()}
    onPointerCancel={() => gesture.cancel()}
    onClickCapture={(event) => { if (gesture.consumeClick()) { event.preventDefault(); event.stopPropagation(); } }}
    onContextMenu={(event) => { event.preventDefault(); gesture.cancel(); onInspect(); }}
    onKeyDown={(event) => {
      if (event.key === 'Escape') gesture.cancel();
      if (event.key === 'F10' && event.shiftKey) { event.preventDefault(); gesture.cancel(); onInspect(); }
    }}
  >{children}</div>;
}

export function BattleCardInspect({ card, onClose }: { card: Card; onClose: () => void }) {
  return <GameModal title={card.name} onClose={onClose}><div className="battle-card-inspect"><TcgCardFace card={card} /></div></GameModal>;
}
