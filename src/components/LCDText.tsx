import { useEffect, useId, useRef } from "react";
import { useLCD } from "./LCDContext";
import { BitmapFont } from "../fonts/bitmap-font";

const font = new BitmapFont();

export interface LCDTextProps {
  x: number;
  y: number;
  children: string;
  scale?: number;
  intensity?: number;
}

export function LCDText({
  x,
  y,
  children,
  scale = 1,
  intensity = 1,
}: LCDTextProps) {
  const { engine, offsetX, offsetY } = useLCD();
  const id = useId();
  const prevWidth = useRef(0);

  useEffect(() => {
    const absX = x + offsetX;
    const absY = y + offsetY;

    const textWidth = font.measureText(children, scale);
    const textHeight = font.textHeight(scale);
    // Clear the wider of old and new text area
    const clearW = Math.max(textWidth, prevWidth.current);
    engine.fb.fillRect(absX, absY, clearW, textHeight, 0);

    font.drawText(engine.fb, children, absX, absY, { scale, intensity });
    prevWidth.current = textWidth;
    engine.markDirty();
  }, [engine, x, y, offsetX, offsetY, children, scale, intensity, id]);

  return null;
}
