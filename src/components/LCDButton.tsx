import { useEffect, useId, useState, useCallback } from "react";
import { useLCD } from "./LCDContext";
import { useFocus } from "./useFocus";
import { useFocusIndicator } from "./useFocusIndicator";
import { BitmapFont } from "../fonts/bitmap-font";

const font = new BitmapFont();

export interface LCDButtonProps {
  x: number;
  y: number;
  label: string;
  padding?: number;
  scale?: number;
  onClick?: () => void;
  focusOrder?: number;
}

export function LCDButton({
  x,
  y,
  label,
  padding = 2,
  scale = 1,
  onClick,
  focusOrder,
}: LCDButtonProps) {
  const { engine, offsetX, offsetY } = useLCD();
  const id = useId();
  const [pressed, setPressed] = useState(false);

  const textW = font.measureText(label, scale);
  const textH = font.textHeight(scale);
  const btnW = textW + padding * 2;
  const btnH = textH + padding * 2;
  const absX = x + offsetX;
  const absY = y + offsetY;

  const onActivate = useCallback(() => {
    setPressed(true);
    setTimeout(() => {
      setPressed(false);
      onClick?.();
    }, 100);
  }, [onClick]);

  const { focused } = useFocus({
    rect: { x: absX, y: absY, width: btnW, height: btnH },
    order: focusOrder ?? 0,
    enabled: focusOrder != null,
    onActivate,
  });

  useFocusIndicator(focused, absX, absY, btnW, btnH);

  const draw = useCallback(
    (isPressed: boolean) => {
      const fb = engine.fb;
      if (isPressed) {
        fb.fillRect(absX, absY, btnW, btnH, 1);
        font.drawText(fb, label, absX + padding, absY + padding, { scale, intensity: 0 });
      } else {
        fb.fillRect(absX, absY, btnW, btnH, 0);
        for (let i = 0; i < btnW; i++) {
          fb.set(absX + i, absY, 1);
          fb.set(absX + i, absY + btnH - 1, 1);
        }
        for (let i = 0; i < btnH; i++) {
          fb.set(absX, absY + i, 1);
          fb.set(absX + btnW - 1, absY + i, 1);
        }
        font.drawText(fb, label, absX + padding, absY + padding, { scale, intensity: 1 });
      }
      engine.markDirty();
    },
    [engine, absX, absY, btnW, btnH, label, padding, scale]
  );

  useEffect(() => {
    draw(pressed);
  }, [draw, pressed]);

  useEffect(() => {
    engine.registerRegion({
      id,
      rect: { x: absX, y: absY, width: btnW, height: btnH },
      onPointerDown: () => setPressed(true),
      onPointerUp: () => {
        setPressed(false);
        onClick?.();
      },
    });
    return () => engine.unregisterRegion(id);
  }, [engine, id, absX, absY, btnW, btnH, onClick]);

  return null;
}
