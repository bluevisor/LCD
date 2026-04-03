export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CameraTransform {
  rotate: number;
  skewX: number;
  skewY: number;
  scale: number;
}

export const cameraPresets: Record<string, CameraTransform> = {
  straight: { rotate: 0, skewX: 0, skewY: 0, scale: 1 },
  isometric: { rotate: -15, skewX: 12, skewY: 0, scale: 1 },
  desk: { rotate: -8, skewX: 6, skewY: 0, scale: 1 },
  handheld: { rotate: -3, skewX: 2, skewY: 0, scale: 1 },
};

export type CameraPreset = keyof typeof cameraPresets;
export type CameraConfig = CameraTransform | CameraPreset;

export interface HitRegion {
  id: string;
  rect: Rect;
  onPointerDown?: (x: number, y: number) => void;
  onPointerUp?: (x: number, y: number) => void;
  onPointerMove?: (x: number, y: number) => void;
}
