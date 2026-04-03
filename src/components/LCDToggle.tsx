import { useEffect, useId } from "react";
import { useLCD } from "./LCDContext";

export interface LCDToggleProps {
  x: number;
  y: number;
  value: boolean;
  onChange?: (value: boolean) => void;
  width?: number;
  height?: number;
}

export function LCDToggle({
  x,
  y,
  value,
  onChange,
  width = 12,
  height = 7,
}: LCDToggleProps) {
  const { engine, offsetX, offsetY } = useLCD();
  const id = useId();
  const absX = x + offsetX;
  const absY = y + offsetY;
  const knobSize = height - 2;

  useEffect(() => {
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
    const knobX = value ? absX + width - 1 - knobSize : absX + 1;
    fb.fillRect(knobX, absY + 1, knobSize, knobSize, 1);
    engine.markDirty();
  }, [engine, absX, absY, width, height, value, knobSize]);

  useEffect(() => {
    engine.registerRegion({
      id,
      rect: { x: absX, y: absY, width, height },
      onPointerDown: () => onChange?.(!value),
    });
    return () => engine.unregisterRegion(id);
  }, [engine, id, absX, absY, width, height, value, onChange]);

  return null;
}
