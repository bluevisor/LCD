import { useEffect, useId, useState } from "react";
import { useLCD } from "./LCDContext";
import type { Rect } from "../engine/types";
import type { FocusableItem } from "../engine/focus";

export interface UseFocusOptions {
  rect: Rect;
  /** Explicit navigation order — required */
  order: number;
  enabled?: boolean;
  onActivate?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  onUp?: () => boolean;
  onDown?: () => boolean;
}

export function useFocus(options: UseFocusOptions) {
  const { engine } = useLCD();
  const id = useId();
  const [focused, setFocused] = useState(false);
  const enabled = options.enabled ?? true;

  useEffect(() => {
    if (!enabled) {
      setFocused(false);
      return;
    }
    const item: FocusableItem = {
      id,
      rect: options.rect,
      order: options.order,
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
      onActivate: options.onActivate,
      onLeft: options.onLeft,
      onRight: options.onRight,
      onUp: options.onUp,
      onDown: options.onDown,
    };
    engine.focus.register(item);
    setFocused(engine.focus.isFocused(id));
    return () => {
      engine.focus.unregister(id);
      setFocused(false);
    };
  }, [engine, id, enabled, options.order, options.rect.x, options.rect.y, options.rect.width, options.rect.height,
      options.onActivate, options.onLeft, options.onRight, options.onUp, options.onDown]);

  return { focused, id };
}
