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

export const newton: LCDTheme = {
  background: "#9BA88A",
  dotOff: "#8F9C80",
  dotOn: "#1A1E14",
  shadow: "#0D0F0A",
};

export const palm: LCDTheme = {
  background: "#B0BFA0",
  dotOff: "#A3B295",
  dotOn: "#1C2416",
  shadow: "#0E120B",
};

export const gameboy: LCDTheme = {
  background: "#9BBC0F",
  dotOff: "#8BAC0F",
  dotOn: "#0F380F",
  shadow: "#071A07",
};

export const tamagotchi: LCDTheme = {
  background: "#C8D0A0",
  dotOff: "#BCC498",
  dotOn: "#282828",
  shadow: "#141414",
};

export const pager: LCDTheme = {
  background: "#7A8B6A",
  dotOff: "#6E7F5E",
  dotOn: "#1A2010",
  shadow: "#0D1008",
};

export const themePresets = { green, amber, gray, blue, newton, palm, gameboy, tamagotchi, pager } as const;
export type ThemePresetName = keyof typeof themePresets;
