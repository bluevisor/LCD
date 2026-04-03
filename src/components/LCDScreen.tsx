import { useRef, useEffect, useMemo, type ReactNode } from "react";
import { LCDEngine } from "../engine/engine";
import { LCDContext, type LCDContextValue } from "./LCDContext";
import { themePresets, type ThemePresetName } from "../themes/presets";
import type { LCDTheme } from "../themes/types";
import { cameraPresets, type CameraConfig } from "../engine/types";

export interface LCDScreenProps {
  width: number;
  height: number;
  pixelSize?: number;
  theme?: ThemePresetName | LCDTheme;
  camera?: CameraConfig;
  children?: ReactNode;
}

function resolveTheme(theme: ThemePresetName | LCDTheme | undefined): LCDTheme {
  if (!theme) return themePresets.green;
  if (typeof theme === "string") return themePresets[theme];
  return theme;
}

function getCameraStyle(camera?: CameraConfig): React.CSSProperties {
  if (!camera) return {};
  const t = typeof camera === "string" ? cameraPresets[camera] : camera;
  if (!t) return {};
  const transforms: string[] = [];
  if (t.rotate) transforms.push(`rotate(${t.rotate}deg)`);
  if (t.skewX) transforms.push(`skewX(${t.skewX}deg)`);
  if (t.skewY) transforms.push(`skewY(${t.skewY}deg)`);
  if (t.scale && t.scale !== 1) transforms.push(`scale(${t.scale})`);
  return transforms.length ? { transform: transforms.join(" ") } : {};
}

export function LCDScreen({
  width,
  height,
  pixelSize = 6,
  theme,
  camera,
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
    [width, height, pixelSize]
  );

  useEffect(() => {
    engine.theme = resolvedTheme;
    engine.markDirty();
  }, [engine, resolvedTheme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    engine.attach(canvas);
    return () => engine.detach();
  }, [engine]);

  const ctxValue = useMemo<LCDContextValue>(
    () => ({ engine, offsetX: 0, offsetY: 0 }),
    [engine]
  );

  const cameraStyle = getCameraStyle(camera);
  const canvasW = width * pixelSize;
  const canvasH = height * pixelSize;

  return (
    <div
      style={{
        display: "inline-block",
        ...cameraStyle,
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
  );
}
