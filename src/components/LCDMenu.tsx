import { useEffect, useId } from "react";
import { useLCD } from "./LCDContext";
import { BitmapFont } from "../fonts/bitmap-font";

const font = new BitmapFont();

export interface LCDMenuProps {
  x: number;
  y: number;
  items: string[];
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  width?: number;
}

export function LCDMenu({
  x,
  y,
  items,
  selectedIndex = -1,
  onSelect,
  width,
}: LCDMenuProps) {
  const { engine, offsetX, offsetY } = useLCD();
  const baseId = useId();
  const absX = x + offsetX;
  const absY = y + offsetY;

  const textH = font.textHeight();
  const itemH = textH + 2;
  const menuW =
    width ??
    Math.max(...items.map((item) => font.measureText(item))) + 4;

  useEffect(() => {
    const fb = engine.fb;
    const totalH = items.length * itemH;
    fb.fillRect(absX, absY, menuW, totalH, 0);

    items.forEach((item, i) => {
      const iy = absY + i * itemH;
      if (i === selectedIndex) {
        fb.fillRect(absX, iy, menuW, itemH, 1);
        font.drawText(fb, item, absX + 2, iy + 1, { intensity: 0 });
      } else {
        font.drawText(fb, item, absX + 2, iy + 1, { intensity: 1 });
      }
    });
    engine.markDirty();
  }, [engine, absX, absY, items, selectedIndex, menuW, itemH]);

  useEffect(() => {
    items.forEach((_, i) => {
      engine.registerRegion({
        id: `${baseId}-menu-${i}`,
        rect: {
          x: absX,
          y: absY + i * itemH,
          width: menuW,
          height: itemH,
        },
        onPointerDown: () => onSelect?.(i),
      });
    });
    return () => {
      items.forEach((_, i) =>
        engine.unregisterRegion(`${baseId}-menu-${i}`)
      );
    };
  }, [engine, baseId, absX, absY, items, menuW, itemH, onSelect]);

  return null;
}
