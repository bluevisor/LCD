import { useEffect } from "react";
import { useLCD } from "./LCDContext";
import { icons, ICON_SIZE } from "../assets/icon-data";

export interface LCDIconProps {
  x: number;
  y: number;
  name: string;
  scale?: number;
  intensity?: number;
}

export function LCDIcon({
  x,
  y,
  name,
  scale = 1,
  intensity = 1,
}: LCDIconProps) {
  const { engine, offsetX, offsetY } = useLCD();

  useEffect(() => {
    const icon = icons[name];
    if (!icon) return;

    const absX = x + offsetX;
    const absY = y + offsetY;
    const fb = engine.fb;

    fb.fillRect(absX, absY, ICON_SIZE * scale, ICON_SIZE * scale, 0);

    for (let row = 0; row < ICON_SIZE; row++) {
      const bits = icon[row];
      for (let col = 0; col < ICON_SIZE; col++) {
        if (bits & (1 << (ICON_SIZE - 1 - col))) {
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              fb.set(
                absX + col * scale + sx,
                absY + row * scale + sy,
                intensity
              );
            }
          }
        }
      }
    }
    engine.markDirty();
  }, [engine, x, y, offsetX, offsetY, name, scale, intensity]);

  return null;
}
