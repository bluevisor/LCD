import { useRef, useEffect, useMemo, type ReactNode } from "react";
import { LCDEngine } from "../engine/engine";
import { LCDContext, type LCDContextValue } from "./LCDContext";
import { themePresets, type ThemePresetName } from "../themes/presets";
import type { LCDTheme } from "../themes/types";
import { cameraPresets, type CameraConfig, type CameraTransform } from "../engine/types";

export interface LCDScreenProps {
  width: number;
  height: number;
  pixelSize?: number;
  theme?: ThemePresetName | LCDTheme;
  camera?: CameraConfig;
  /** Enable CSS perspective (default false) */
  perspective?: boolean;
  children?: ReactNode;
}

function resolveTheme(theme: ThemePresetName | LCDTheme | undefined): LCDTheme {
  if (!theme) return themePresets.green;
  if (typeof theme === "string") return themePresets[theme];
  return theme;
}

function resolveCamera(camera?: CameraConfig): CameraTransform | null {
  if (!camera) return null;
  if (typeof camera === "string") return cameraPresets[camera] ?? null;
  return camera;
}

export function LCDScreen({
  width,
  height,
  pixelSize = 6,
  theme,
  camera,
  perspective = false,
  children,
}: LCDScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resolvedTheme = resolveTheme(theme);

  const engine = useMemo(
    () =>
      new LCDEngine({
        width,
        height,
        theme: resolvedTheme,
        renderer: { pixelSize },
      }),
    [width, height]
  );

  useEffect(() => {
    engine.theme = resolvedTheme;
    engine.markDirty();
  }, [engine, resolvedTheme]);

  useEffect(() => {
    engine.setPixelSize(pixelSize);
  }, [engine, pixelSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    engine.attach(canvas);
    canvas.focus();
    return () => engine.detach();
  }, [engine]);

  const ctxValue = useMemo<LCDContextValue>(
    () => ({ engine, offsetX: 0, offsetY: 0 }),
    [engine]
  );

  const t = resolveCamera(camera);
  const transforms: string[] = [];
  if (t) {
    if (perspective) {
      // Use 3D rotations so CSS perspective has visible effect
      if (t.rotate) transforms.push(`rotateZ(${t.rotate}deg)`);
      if (t.skewX) transforms.push(`rotateY(${t.skewX}deg)`);
      if (t.skewY) transforms.push(`rotateX(${-t.skewY}deg)`);
    } else {
      if (t.rotate) transforms.push(`rotate(${t.rotate}deg)`);
      if (t.skewX) transforms.push(`skewX(${t.skewX}deg)`);
      if (t.skewY) transforms.push(`skewY(${t.skewY}deg)`);
    }
    if (t.scale && t.scale !== 1) transforms.push(`scale(${t.scale})`);
  }

  const canvasW = width * pixelSize;
  const canvasH = height * pixelSize;

  return (
    <div
      style={perspective ? {
        perspective: "800px",
        display: "inline-block",
      } : {
        display: "inline-block",
      }}
    >
      <div
        style={{
          display: "inline-block",
          ...(transforms.length ? { transform: transforms.join(" ") } : {}),
          ...(perspective ? { transformStyle: "preserve-3d" as const } : {}),
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: canvasW,
            height: canvasH,
            display: "block",
            imageRendering: "pixelated",
          }}
        />
        <LCDContext.Provider value={ctxValue}>{children}</LCDContext.Provider>
      </div>
    </div>
  );
}
