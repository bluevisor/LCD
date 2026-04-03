import type { LCDTheme } from "./types";

export const green: LCDTheme = {
  background: "#7B8B2D",
  dotOff: "#6F7F24",
  dotOn: "#2D3B0E",
  shadow: "#1E2808",
};

export const amber: LCDTheme = {
  background: "#8B6914",
  dotOff: "#7F5F0F",
  dotOn: "#3B2800",
  shadow: "#1E1400",
};

export const gray: LCDTheme = {
  background: "#8B9B8B",
  dotOff: "#7F8F7F",
  dotOn: "#2D3B2D",
  shadow: "#1A251A",
};

export const blue: LCDTheme = {
  background: "#2D5B7B",
  dotOff: "#24507F",
  dotOn: "#0E1F3B",
  shadow: "#06101E",
};

export const themePresets = { green, amber, gray, blue } as const;
export type ThemePresetName = keyof typeof themePresets;
