// Engine
export { LCDEngine } from "./engine/engine";
export type { EngineConfig, KeyHandler } from "./engine/engine";
export { Framebuffer } from "./engine/framebuffer";
export { DotRenderer } from "./engine/renderer";
export type { RendererConfig } from "./engine/renderer";
export { HitTestManager } from "./engine/hit-test";
export { FocusManager } from "./engine/focus";
export type { FocusableItem, CancelHandler } from "./engine/focus";
export type { Rect, CameraTransform, CameraConfig, CameraPreset, HitRegion } from "./engine/types";
export { cameraPresets } from "./engine/types";

// Themes
export type { LCDTheme } from "./themes/types";
export { themePresets } from "./themes/presets";
export type { ThemePresetName } from "./themes/presets";

// Fonts
export { BitmapFont } from "./fonts/bitmap-font";

// Assets
export { sampleImageToFramebuffer } from "./assets/image-sampler";
export { icons, ICON_SIZE } from "./assets/icon-data";

// Components
export { LCDScreen } from "./components/LCDScreen";
export type { LCDScreenProps } from "./components/LCDScreen";
export { LCDText } from "./components/LCDText";
export type { LCDTextProps } from "./components/LCDText";
export { LCDHeading } from "./components/LCDHeading";
export type { LCDHeadingProps } from "./components/LCDHeading";
export { LCDPanel } from "./components/LCDPanel";
export type { LCDPanelProps } from "./components/LCDPanel";
export { LCDDivider } from "./components/LCDDivider";
export type { LCDDividerProps } from "./components/LCDDivider";
export { LCDButton } from "./components/LCDButton";
export type { LCDButtonProps } from "./components/LCDButton";
export { LCDToggle } from "./components/LCDToggle";
export type { LCDToggleProps } from "./components/LCDToggle";
export { LCDSlider } from "./components/LCDSlider";
export type { LCDSliderProps } from "./components/LCDSlider";
export { LCDProgress } from "./components/LCDProgress";
export type { LCDProgressProps } from "./components/LCDProgress";
export { LCDBadge } from "./components/LCDBadge";
export type { LCDBadgeProps } from "./components/LCDBadge";
export { LCDIcon } from "./components/LCDIcon";
export type { LCDIconProps } from "./components/LCDIcon";
export { LCDImage } from "./components/LCDImage";
export type { LCDImageProps } from "./components/LCDImage";
export { LCDTabs } from "./components/LCDTabs";
export type { LCDTabsProps } from "./components/LCDTabs";
export { LCDMenu } from "./components/LCDMenu";
export type { LCDMenuProps } from "./components/LCDMenu";

// Context and hooks (for advanced usage)
export { useLCD, LCDContext } from "./components/LCDContext";
export type { LCDContextValue } from "./components/LCDContext";
export { useFocus } from "./components/useFocus";
export { useFocusIndicator } from "./components/useFocusIndicator";
