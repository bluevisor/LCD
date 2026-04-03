import { LCDText, type LCDTextProps } from "./LCDText";

export interface LCDHeadingProps extends Omit<LCDTextProps, "scale"> {
  level?: 1 | 2 | 3;
}

const LEVEL_SCALE: Record<number, number> = { 1: 3, 2: 2, 3: 1 };

export function LCDHeading({ level = 1, ...props }: LCDHeadingProps) {
  return <LCDText {...props} scale={LEVEL_SCALE[level] ?? 3} />;
}
