/** Pointer gesture state kept separate so scrolling/cancellation never becomes a play. */
export function createHoldGesture(onHold: () => void, delay = 450) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let origin: { x: number; y: number; id: number } | null = null;
  let suppressClick = false;
  const clear = () => { clearTimeout(timer); timer = undefined; };
  return {
    start(id: number, x: number, y: number) {
      clear();
      origin = { id, x, y };
      suppressClick = false;
      timer = setTimeout(() => { timer = undefined; suppressClick = true; onHold(); }, delay);
    },
    move(id: number, x: number, y: number) {
      if (origin?.id === id && Math.hypot(x - origin.x, y - origin.y) > 12) {
        clear();
        suppressClick = true;
      }
    },
    end() { clear(); origin = null; },
    cancel() { if (origin) suppressClick = true; clear(); origin = null; },
    consumeClick() { const suppressed = suppressClick; suppressClick = false; return suppressed; },
    dispose() { clear(); origin = null; },
  };
}
