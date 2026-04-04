import { useEffect, useId, useCallback } from "react";
import { useLCD } from "./LCDContext";
import { useFocus } from "./useFocus";
import { useFocusIndicator } from "./useFocusIndicator";
import { BitmapFont } from "../fonts/bitmap-font";

const font = new BitmapFont();

export interface LCDMenuProps {
  x: number;
  y: number;
  items: string[];
  selectedIndex?: number;
  /** Called when highlight moves (Up/Down/click) */
  onSelect?: (index: number) => void;
  /** Called when user confirms selection (Enter/Right) */
  onConfirm?: (index: number) => void;
  width?: number;
  focusOrder?: number;
}

export function LCDMenu({
  x,
  y,
  items,
  selectedIndex = -1,
  onSelect,
  onConfirm,
  width,
  focusOrder,
}: LCDMenuProps) {
  const { engine, offsetX, offsetY } = useLCD();
  const baseId = useId();
  const absX = x + offsetX;
  const absY = y + offsetY;

  const textH = font.textHeight();
  const itemH = textH + 2;
  const menuW =
    width ?? Math.max(...items.map((item) => font.measureText(item))) + 4;
  const totalH = items.length * itemH;

  const onDown = useCallback(() => {
    if (!onSelect || items.length === 0) return false;
    const cur = selectedIndex < 0 ? -1 : selectedIndex;
    if (cur < items.length - 1) {
      onSelect(cur + 1);
    } else {
      onSelect(0); // wrap to top
    }
    return true;
  }, [onSelect, selectedIndex, items.length]);

  const onUp = useCallback(() => {
    if (!onSelect || items.length === 0) return false;
    if (selectedIndex > 0) {
      onSelect(selectedIndex - 1);
    } else {
      onSelect(items.length - 1); // wrap to bottom
    }
    return true;
  }, [onSelect, selectedIndex, items.length]);

  const onActivate = useCallback(() => {
    if (selectedIndex >= 0) {
      onConfirm?.(selectedIndex);
      if (!onConfirm) onSelect?.(selectedIndex);
    }
  }, [onSelect, onConfirm, selectedIndex]);

  const { focused } = useFocus({
    rect: { x: absX, y: absY, width: menuW, height: totalH },
    order: focusOrder ?? 0,
    enabled: focusOrder != null,
    onActivate,
    onUp,
    onDown,
  });

  useFocusIndicator(focused, absX, absY, menuW, totalH);

  useEffect(() => {
    const fb = engine.fb;
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
  }, [engine, absX, absY, items, selectedIndex, menuW, itemH, totalH]);

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
