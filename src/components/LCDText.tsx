import { useEffect, useId } from "react";
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

  useEffect(() => {
    const absX = x + offsetX;
    const absY = y + offsetY;

    const textWidth = font.measureText(children, scale);
    const textHeight = font.textHeight(scale);
    engine.fb.fillRect(absX, absY, textWidth, textHeight, 0);

    font.drawText(engine.fb, children, absX, absY, { scale, intensity });
    engine.markDirty();
  }, [engine, x, y, offsetX, offsetY, children, scale, intensity, id]);

  return null;
}
