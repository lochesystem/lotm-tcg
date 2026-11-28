/** Gentle, bounded fan. Edges sit lower; the active card is lifted and straight. */
export function getHandFanPose(index: number, count: number, active = false) {
  if (active) return { rotate: 0, y: -12 };
  if (count <= 1) return { rotate: 0, y: 0 };
  const offset = (index - (count - 1) / 2) / ((count - 1) / 2);
  return {
    rotate: offset * Math.min(14, (count - 1) * 3.5),
    y: Math.round(offset * offset * 18),
  };
}
