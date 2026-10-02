/** Keep symbols legible even when the whole district collapses to one cluster. */
export function mapSymbolScale(zoom: number, authoredZoom: number): number {
  return Math.min(1, Math.max(0.75, 1 - 0.3 * (authoredZoom - zoom)));
}

/** Fit inside the visible map, including an overlaid mobile inspector. */
export function mapFitPadding(width: number, height: number, inspectorHeight?: number, reserveInspectorSpace = false) {
  const mobile = width < 700;
  const normalBottom = mobile ? 32 : 45;
  const overlay = inspectorHeight ?? (mobile && reserveInspectorSpace ? height * 0.45 + 48 : 0);
  return {
    top: mobile ? 64 : 70,
    left: mobile ? 28 : 45,
    right: mobile ? 28 : 45,
    // Leave a usable viewport even if a full-height sheet is open. Closing or
    // minimizing that sheet is then needed before a meaningful district fit.
    bottom: Math.max(normalBottom, Math.min(overlay + (overlay ? 8 : 0), Math.max(normalBottom, height - 160))),
  };
}

/** Move only a feature hidden by the sheet or outside the frame, retaining zoom. */
export function mapFocusOffset(point: {x: number; y: number}, frame: {w: number; h: number}, inspectorHeight: number): [number, number] | null {
  const top = 64, bottom = frame.h - inspectorHeight - 16;
  if (frame.w < 64 || bottom < top + 48) return null;
  if (point.x >= 24 && point.x <= frame.w - 24 && point.y >= top + 16 && point.y <= bottom - 16) return null;
  return [point.x - frame.w / 2, point.y - (top + bottom) / 2];
}
