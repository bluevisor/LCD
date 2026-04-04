import { useEffect } from "react";
import { useLCD } from "./LCDContext";

/** Draws a soft glow border around a focused component, restoring pixels on blur */
export function useFocusIndicator(
  focused: boolean,
  absX: number,
  absY: number,
  width: number,
  height: number
) {
  const { engine } = useLCD();

  useEffect(() => {
    if (!focused) return;

    const fb = engine.fb;
    // Track which pixels we actually changed so we only revert those
    const touched: { x: number; y: number; prev: number }[] = [];

    const glowLayers = [
      { offset: 1, intensity: 0.5 },
      { offset: 2, intensity: 0.25 },
    ];

    for (const { offset, intensity } of glowLayers) {
      const x0 = absX - offset;
      const y0 = absY - offset;
      const x1 = absX + width - 1 + offset;
      const y1 = absY + height - 1 + offset;

      const trySet = (px: number, py: number) => {
        const cur = fb.get(px, py);
        if (cur < intensity) {
          touched.push({ x: px, y: py, prev: cur });
          fb.set(px, py, intensity);
        }
      };

      for (let i = x0; i <= x1; i++) {
        trySet(i, y0);
        trySet(i, y1);
      }
      for (let j = y0 + 1; j < y1; j++) {
        trySet(x0, j);
        trySet(x1, j);
      }
    }
    engine.markDirty();

    return () => {
      // Restore only pixels we touched, only if they haven't been changed since
      for (const { x, y, prev } of touched) {
        fb.set(x, y, prev);
      }
      engine.markDirty();
    };
  }, [engine, focused, absX, absY, width, height]);
}
