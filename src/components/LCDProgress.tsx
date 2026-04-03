import { useEffect } from "react";
import { useLCD } from "./LCDContext";

export interface LCDProgressProps {
  x: number;
  y: number;
  width: number;
  height?: number;
  value: number;
}

export function LCDProgress({
  x,
  y,
  width,
  height = 5,
  value,
}: LCDProgressProps) {
  const { engine, offsetX, offsetY } = useLCD();

  useEffect(() => {
    const absX = x + offsetX;
    const absY = y + offsetY;
    const fb = engine.fb;
    fb.fillRect(absX, absY, width, height, 0);
    for (let i = 0; i < width; i++) {
      fb.set(absX + i, absY, 1);
      fb.set(absX + i, absY + height - 1, 1);
    }
    for (let i = 0; i < height; i++) {
      fb.set(absX, absY + i, 1);
      fb.set(absX + width - 1, absY + i, 1);
    }
    const fillW = Math.round((width - 2) * Math.max(0, Math.min(1, value)));
    fb.fillRect(absX + 1, absY + 1, fillW, height - 2, 1);
    engine.markDirty();
  }, [engine, x, y, offsetX, offsetY, width, height, value]);

  return null;
}
