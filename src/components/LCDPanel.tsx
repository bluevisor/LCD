import { useEffect, useMemo, type ReactNode } from "react";
import { useLCD, LCDContext, type LCDContextValue } from "./LCDContext";

export interface LCDPanelProps {
  x: number;
  y: number;
  width: number;
  height: number;
  border?: boolean;
  borderIntensity?: number;
  children?: ReactNode;
}

export function LCDPanel({
  x,
  y,
  width,
  height,
  border = true,
  borderIntensity = 1,
  children,
}: LCDPanelProps) {
  const { engine, offsetX, offsetY } = useLCD();

  const absX = x + offsetX;
  const absY = y + offsetY;

  useEffect(() => {
    if (!border) return;
    const fb = engine.fb;
    const bi = borderIntensity;

    for (let i = 0; i < width; i++) {
      fb.set(absX + i, absY, bi);
      fb.set(absX + i, absY + height - 1, bi);
    }
    for (let i = 0; i < height; i++) {
      fb.set(absX, absY + i, bi);
      fb.set(absX + width - 1, absY + i, bi);
    }
    engine.markDirty();
  }, [engine, absX, absY, width, height, border, borderIntensity]);

  const childCtx = useMemo<LCDContextValue>(
    () => ({
      engine,
      offsetX: absX + (border ? 1 : 0),
      offsetY: absY + (border ? 1 : 0),
    }),
    [engine, absX, absY, border]
  );

  return (
    <LCDContext.Provider value={childCtx}>{children}</LCDContext.Provider>
  );
}
