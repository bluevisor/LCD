import { useEffect } from "react";
import { useLCD } from "./LCDContext";

export interface LCDDividerProps {
  x: number;
  y: number;
  length: number;
  direction?: "horizontal" | "vertical";
  intensity?: number;
}

export function LCDDivider({
  x,
  y,
  length,
  direction = "horizontal",
  intensity = 1,
}: LCDDividerProps) {
  const { engine, offsetX, offsetY } = useLCD();

  useEffect(() => {
    const absX = x + offsetX;
    const absY = y + offsetY;
    for (let i = 0; i < length; i++) {
      if (direction === "horizontal") {
        engine.fb.set(absX + i, absY, intensity);
      } else {
        engine.fb.set(absX, absY + i, intensity);
      }
    }
    engine.markDirty();
  }, [engine, x, y, offsetX, offsetY, length, direction, intensity]);

  return null;
}
