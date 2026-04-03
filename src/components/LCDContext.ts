import { createContext, useContext } from "react";
import type { LCDEngine } from "../engine/engine";

export interface LCDContextValue {
  engine: LCDEngine;
  offsetX: number;
  offsetY: number;
}

export const LCDContext = createContext<LCDContextValue | null>(null);

export function useLCD(): LCDContextValue {
  const ctx = useContext(LCDContext);
  if (!ctx) throw new Error("useLCD must be used within an <LCDScreen>");
  return ctx;
}
