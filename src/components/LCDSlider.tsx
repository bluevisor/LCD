import { useEffect, useId, useCallback } from "react";
import { useLCD } from "./LCDContext";
import { useFocus } from "./useFocus";
import { useFocusIndicator } from "./useFocusIndicator";

export interface LCDSliderProps {
  x: number;
  y: number;
  width: number;
  height?: number;
  value: number;
  onChange?: (value: number) => void;
  step?: number;
  focusOrder?: number;
}

export function LCDSlider({
  x,
  y,
  width,
  height = 5,
  value,
  onChange,
  step = 0.05,
  focusOrder,
}: LCDSliderProps) {
  const { engine, offsetX, offsetY } = useLCD();
  const id = useId();
  const absX = x + offsetX;
  const absY = y + offsetY;

  const onLeft = useCallback(() => onChange?.(Math.max(0, value - step)), [onChange, value, step]);
  const onRight = useCallback(() => onChange?.(Math.min(1, value + step)), [onChange, value, step]);

  const { focused } = useFocus({
    rect: { x: absX, y: absY, width, height },
    order: focusOrder ?? 0,
    enabled: focusOrder != null,
    onLeft,
    onRight,
  });

  useFocusIndicator(focused, absX, absY, width, height);

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
    const fillW = Math.round((width - 2) * Math.max(0, Math.min(1, value)));
    fb.fillRect(absX + 1, absY + 1, fillW, height - 2, 1);
    engine.markDirty();
  }, [engine, absX, absY, width, height, value]);

  useEffect(() => {
    engine.registerRegion({
      id,
      rect: { x: absX, y: absY, width, height },
      onPointerDown: (lx) => {
        const ratio = (lx - absX) / width;
        onChange?.(Math.max(0, Math.min(1, ratio)));
      },
      onPointerMove: (lx) => {
        const ratio = (lx - absX) / width;
        onChange?.(Math.max(0, Math.min(1, ratio)));
      },
    });
    return () => engine.unregisterRegion(id);
  }, [engine, id, absX, absY, width, height, onChange]);

  return null;
}
