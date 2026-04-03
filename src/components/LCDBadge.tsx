import { useEffect } from "react";
import { useLCD } from "./LCDContext";
import { BitmapFont } from "../fonts/bitmap-font";

const font = new BitmapFont();

export interface LCDBadgeProps {
  x: number;
  y: number;
  children: string;
  inverted?: boolean;
}

export function LCDBadge({ x, y, children, inverted = false }: LCDBadgeProps) {
  const { engine, offsetX, offsetY } = useLCD();

  useEffect(() => {
    const absX = x + offsetX;
    const absY = y + offsetY;
    const textW = font.measureText(children);
    const textH = font.textHeight();
    const padX = 2;
    const padY = 1;
    const w = textW + padX * 2;
    const h = textH + padY * 2;
    const fb = engine.fb;

    if (inverted) {
      fb.fillRect(absX, absY, w, h, 1);
      font.drawText(fb, children, absX + padX, absY + padY, { intensity: 0 });
    } else {
      fb.fillRect(absX, absY, w, h, 0);
      for (let i = 0; i < w; i++) {
        fb.set(absX + i, absY, 1);
        fb.set(absX + i, absY + h - 1, 1);
      }
      for (let i = 0; i < h; i++) {
        fb.set(absX, absY + i, 1);
        fb.set(absX + w - 1, absY + i, 1);
      }
      font.drawText(fb, children, absX + padX, absY + padY, { intensity: 1 });
    }
    engine.markDirty();
  }, [engine, x, y, offsetX, offsetY, children, inverted]);

  return null;
}
