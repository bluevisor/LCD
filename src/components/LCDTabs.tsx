import { useEffect, useId } from "react";
import { useLCD } from "./LCDContext";
import { BitmapFont } from "../fonts/bitmap-font";

const font = new BitmapFont();

export interface LCDTabsProps {
  x: number;
  y: number;
  tabs: string[];
  activeIndex: number;
  onChange?: (index: number) => void;
  gap?: number;
}

export function LCDTabs({
  x,
  y,
  tabs,
  activeIndex,
  onChange,
  gap = 1,
}: LCDTabsProps) {
  const { engine, offsetX, offsetY } = useLCD();
  const baseId = useId();
  const absX = x + offsetX;
  const absY = y + offsetY;

  const padX = 2;
  const padY = 1;
  const textH = font.textHeight();
  const tabH = textH + padY * 2;

  const tabRects = tabs.map((label, i) => {
    const textW = font.measureText(label);
    const tabW = textW + padX * 2;
    let tx = absX;
    for (let j = 0; j < i; j++) {
      tx += font.measureText(tabs[j]) + padX * 2 + gap;
    }
    return { x: tx, y: absY, w: tabW, h: tabH, label };
  });

  useEffect(() => {
    const fb = engine.fb;
    const totalW =
      tabRects.length > 0
        ? tabRects[tabRects.length - 1].x +
          tabRects[tabRects.length - 1].w -
          absX
        : 0;
    fb.fillRect(absX, absY, totalW, tabH, 0);

    tabRects.forEach((tr, i) => {
      if (i === activeIndex) {
        fb.fillRect(tr.x, tr.y, tr.w, tr.h, 1);
        font.drawText(fb, tr.label, tr.x + padX, tr.y + padY, {
          intensity: 0,
        });
      } else {
        for (let j = 0; j < tr.w; j++) {
          fb.set(tr.x + j, tr.y, 1);
          fb.set(tr.x + j, tr.y + tr.h - 1, 1);
        }
        for (let j = 0; j < tr.h; j++) {
          fb.set(tr.x, tr.y + j, 1);
          fb.set(tr.x + tr.w - 1, tr.y + j, 1);
        }
        font.drawText(fb, tr.label, tr.x + padX, tr.y + padY, {
          intensity: 1,
        });
      }
    });
    engine.markDirty();
  }, [engine, absX, absY, tabs, activeIndex, tabRects, tabH, padX, padY]);

  useEffect(() => {
    tabRects.forEach((tr, i) => {
      engine.registerRegion({
        id: `${baseId}-tab-${i}`,
        rect: { x: tr.x, y: tr.y, width: tr.w, height: tr.h },
        onPointerDown: () => onChange?.(i),
      });
    });
    return () => {
      tabRects.forEach((_, i) => engine.unregisterRegion(`${baseId}-tab-${i}`));
    };
  }, [engine, baseId, tabRects, onChange]);

  return null;
}
