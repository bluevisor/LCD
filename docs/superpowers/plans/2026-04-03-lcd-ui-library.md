# LCD UI Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React/TypeScript UI component library that renders all UI through a retro LCD pixel-grid engine — rounded-square dots with soft shadows on a monochrome canvas.

**Architecture:** A core LCD engine manages a framebuffer (intensity values per pixel). A canvas renderer draws the dot grid. React components are thin wrappers that write to framebuffer regions. Hit detection translates canvas events to LCD coordinates.

**Tech Stack:** React 18+, TypeScript, Canvas 2D API, Vite

---

## File Structure

```
src/
  engine/
    types.ts            — shared types (Rect, LCDTheme, CameraConfig, etc.)
    framebuffer.ts      — Framebuffer class (2D intensity array)
    renderer.ts         — DotRenderer class (draws dot grid to canvas)
    hit-test.ts         — HitTestManager (bounding box registry + coord translation)
    engine.ts           — LCDEngine (orchestrates framebuffer + renderer + hit-test)
  fonts/
    font-data.ts        — bitmap font glyph data (5x7 pixel font)
    bitmap-font.ts      — BitmapFont class (rasterize text to framebuffer)
  assets/
    icon-data.ts        — pre-rasterized icon pixel arrays
    image-sampler.ts    — downsample images to LCD resolution
  themes/
    types.ts            — LCDTheme type
    presets.ts          — green, amber, gray, blue preset themes
  components/
    LCDContext.ts       — React context for engine instance
    LCDScreen.tsx       — root component, owns canvas + engine
    LCDPanel.tsx        — bordered region
    LCDDivider.tsx      — line separator
    LCDText.tsx         — text rendering
    LCDHeading.tsx      — large text
    LCDButton.tsx       — clickable button
    LCDToggle.tsx       — on/off switch
    LCDSlider.tsx       — horizontal slider
    LCDProgress.tsx     — progress bar
    LCDBadge.tsx        — counter/label
    LCDIcon.tsx         — icon renderer
    LCDImage.tsx        — image renderer
    LCDTabs.tsx         — tab switcher
    LCDMenu.tsx         — vertical menu
  index.ts              — public exports
demo/
  App.tsx               — showcase demo
  main.tsx              — Vite entry
  index.html            — HTML shell
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `demo/index.html`, `demo/main.tsx`

- [ ] **Step 1: Initialize project**

```bash
cd /Users/johnzheng/Developer/bluevisor/LCD
npm init -y
npm install react react-dom
npm install -D typescript @types/react @types/react-dom vite @vitejs/plugin-react
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "declaration": true,
    "sourceMap": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"]
  },
  "include": ["src", "demo"]
}
```

- [ ] **Step 3: Create vite.config.ts**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "demo",
});
```

- [ ] **Step 4: Create demo/index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LCD UI Demo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #1a1a1a; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

- [ ] **Step 5: Create demo/main.tsx**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 6: Create demo/App.tsx placeholder**

```tsx
export default function App() {
  return <div>LCD UI Demo — engine not yet connected</div>;
}
```

- [ ] **Step 7: Verify dev server starts**

```bash
npx vite --config vite.config.ts
```

Expected: Dev server starts, page shows "LCD UI Demo — engine not yet connected".

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold project with Vite, React, TypeScript"
```

---

### Task 2: Theme Types and Presets

**Files:**
- Create: `src/themes/types.ts`, `src/themes/presets.ts`

- [ ] **Step 1: Create src/themes/types.ts**

```ts
export interface LCDTheme {
  /** Canvas background fill between dots */
  background: string;
  /** Color of "off" dots (ghost pixels) */
  dotOff: string;
  /** Color of fully "on" dots */
  dotOn: string;
  /** Shadow color for on dots */
  shadow: string;
}
```

- [ ] **Step 2: Create src/themes/presets.ts**

```ts
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
```

- [ ] **Step 3: Commit**

```bash
git add src/themes/
git commit -m "feat: add LCD theme types and color presets"
```

---

### Task 3: Engine Types

**Files:**
- Create: `src/engine/types.ts`

- [ ] **Step 1: Create src/engine/types.ts**

```ts
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CameraTransform {
  rotate: number;  // degrees
  skewX: number;   // degrees
  skewY: number;   // degrees
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
```

- [ ] **Step 2: Commit**

```bash
git add src/engine/types.ts
git commit -m "feat: add engine types (Rect, Camera, HitRegion)"
```

---

### Task 4: Framebuffer

**Files:**
- Create: `src/engine/framebuffer.ts`

- [ ] **Step 1: Create src/engine/framebuffer.ts**

```ts
export class Framebuffer {
  readonly width: number;
  readonly height: number;
  private data: Float32Array;
  private _dirty = true;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Float32Array(width * height);
  }

  get dirty(): boolean {
    return this._dirty;
  }

  clearDirty(): void {
    this._dirty = false;
  }

  /** Get intensity at (x, y). Returns 0 if out of bounds. */
  get(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.data[y * this.width + x];
  }

  /** Set intensity at (x, y). Clamps to [0, 1]. */
  set(x: number, y: number, intensity: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.data[y * this.width + x] = Math.max(0, Math.min(1, intensity));
    this._dirty = true;
  }

  /** Fill a rectangular region with a single intensity. */
  fillRect(x: number, y: number, w: number, h: number, intensity: number): void {
    const clamped = Math.max(0, Math.min(1, intensity));
    const x0 = Math.max(0, x);
    const y0 = Math.max(0, y);
    const x1 = Math.min(this.width, x + w);
    const y1 = Math.min(this.height, y + h);
    for (let row = y0; row < y1; row++) {
      for (let col = x0; col < x1; col++) {
        this.data[row * this.width + col] = clamped;
      }
    }
    this._dirty = true;
  }

  /** Clear entire buffer to 0. */
  clear(): void {
    this.data.fill(0);
    this._dirty = true;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/engine/framebuffer.ts
git commit -m "feat: add Framebuffer class"
```

---

### Task 5: Dot Grid Renderer

**Files:**
- Create: `src/engine/renderer.ts`

This is the visual heart of the library — draws each LCD dot as a rounded square with shadow.

- [ ] **Step 1: Create src/engine/renderer.ts**

```ts
import type { LCDTheme } from "../themes/types";
import type { Framebuffer } from "./framebuffer";

export interface RendererConfig {
  /** Size of each LCD dot cell in CSS pixels */
  pixelSize: number;
  /** Fraction of cell filled by the dot (0-1, default 0.8) */
  dotFill: number;
  /** Shadow offset in CSS pixels */
  shadowOffset: number;
  /** Shadow blur radius in CSS pixels */
  shadowBlur: number;
}

const DEFAULT_CONFIG: RendererConfig = {
  pixelSize: 6,
  dotFill: 0.8,
  shadowOffset: 1,
  shadowBlur: 1.5,
};

/** Parse a hex color (#RRGGBB) to [r, g, b] 0-255. */
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** Lerp between two RGB colors. */
function lerpColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

export class DotRenderer {
  private config: RendererConfig;

  constructor(config: Partial<RendererConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Draw the full dot grid for a framebuffer onto a canvas 2D context. */
  render(
    ctx: CanvasRenderingContext2D,
    fb: Framebuffer,
    theme: LCDTheme
  ): void {
    const { pixelSize, dotFill, shadowOffset, shadowBlur } = this.config;
    const dotSize = pixelSize * dotFill;
    const offset = (pixelSize - dotSize) / 2;
    const radius = dotSize * 0.18;

    const canvasW = fb.width * pixelSize;
    const canvasH = fb.height * pixelSize;

    // Background fill
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, canvasW, canvasH);

    const offRgb = hexToRgb(theme.dotOff);
    const onRgb = hexToRgb(theme.dotOn);
    const shadowRgb = hexToRgb(theme.shadow);

    // Draw dots
    for (let y = 0; y < fb.height; y++) {
      for (let x = 0; x < fb.width; x++) {
        const intensity = fb.get(x, y);
        const px = x * pixelSize + offset;
        const py = y * pixelSize + offset;

        // Shadow (only for dots with some intensity)
        if (intensity > 0.05) {
          const shadowAlpha = intensity * 0.6;
          ctx.fillStyle = `rgba(${shadowRgb[0]},${shadowRgb[1]},${shadowRgb[2]},${shadowAlpha})`;
          ctx.save();
          ctx.shadowBlur = shadowBlur;
          ctx.shadowColor = `rgba(${shadowRgb[0]},${shadowRgb[1]},${shadowRgb[2]},${shadowAlpha})`;
          ctx.beginPath();
          ctx.roundRect(
            px + shadowOffset,
            py + shadowOffset,
            dotSize,
            dotSize,
            radius
          );
          ctx.fill();
          ctx.restore();
        }

        // Dot
        const color = lerpColor(offRgb, onRgb, intensity);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(px, py, dotSize, dotSize, radius);
        ctx.fill();
      }
    }
  }

  getCanvasSize(fb: Framebuffer): { width: number; height: number } {
    return {
      width: fb.width * this.config.pixelSize,
      height: fb.height * this.config.pixelSize,
    };
  }

  get pixelSize(): number {
    return this.config.pixelSize;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/engine/renderer.ts
git commit -m "feat: add DotRenderer with rounded squares and soft shadows"
```

---

### Task 6: Hit Test Manager

**Files:**
- Create: `src/engine/hit-test.ts`

- [ ] **Step 1: Create src/engine/hit-test.ts**

```ts
import type { HitRegion, Rect } from "./types";

export class HitTestManager {
  private regions: Map<string, HitRegion> = new Map();
  private pixelSize = 6;

  setPixelSize(size: number): void {
    this.pixelSize = size;
  }

  register(region: HitRegion): void {
    this.regions.set(region.id, region);
  }

  unregister(id: string): void {
    this.regions.delete(id);
  }

  /** Convert canvas pixel coordinates to LCD pixel coordinates. */
  canvasToLcd(canvasX: number, canvasY: number): { x: number; y: number } {
    return {
      x: Math.floor(canvasX / this.pixelSize),
      y: Math.floor(canvasY / this.pixelSize),
    };
  }

  /** Find the topmost region at LCD coordinates (x, y). */
  hitTest(lcdX: number, lcdY: number): HitRegion | null {
    // Iterate in reverse insertion order (last registered = topmost)
    const entries = Array.from(this.regions.values()).reverse();
    for (const region of entries) {
      const r = region.rect;
      if (
        lcdX >= r.x &&
        lcdX < r.x + r.width &&
        lcdY >= r.y &&
        lcdY < r.y + r.height
      ) {
        return region;
      }
    }
    return null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/engine/hit-test.ts
git commit -m "feat: add HitTestManager for canvas interaction"
```

---

### Task 7: LCD Engine (Orchestrator)

**Files:**
- Create: `src/engine/engine.ts`

- [ ] **Step 1: Create src/engine/engine.ts**

```ts
import { Framebuffer } from "./framebuffer";
import { DotRenderer, type RendererConfig } from "./renderer";
import { HitTestManager } from "./hit-test";
import type { LCDTheme } from "../themes/types";
import type { HitRegion } from "./types";

export interface EngineConfig {
  /** LCD resolution in dots */
  width: number;
  height: number;
  /** Theme colors */
  theme: LCDTheme;
  /** Renderer config overrides */
  renderer?: Partial<RendererConfig>;
}

export class LCDEngine {
  readonly fb: Framebuffer;
  readonly renderer: DotRenderer;
  readonly hitTest: HitTestManager;
  theme: LCDTheme;

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private rafId: number | null = null;
  private running = false;

  constructor(config: EngineConfig) {
    this.fb = new Framebuffer(config.width, config.height);
    this.renderer = new DotRenderer(config.renderer);
    this.hitTest = new HitTestManager();
    this.hitTest.setPixelSize(this.renderer.pixelSize);
    this.theme = config.theme;
  }

  /** Attach to a canvas element and start the render loop. */
  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    const size = this.renderer.getCanvasSize(this.fb);
    canvas.width = size.width;
    canvas.height = size.height;
    this.setupEvents(canvas);
    this.start();
  }

  /** Detach from canvas and stop rendering. */
  detach(): void {
    this.stop();
    if (this.canvas) {
      this.canvas.removeEventListener("pointerdown", this.onPointerDown);
      this.canvas.removeEventListener("pointerup", this.onPointerUp);
      this.canvas.removeEventListener("pointermove", this.onPointerMove);
    }
    this.canvas = null;
    this.ctx = null;
  }

  /** Register a hit region for interactive components. */
  registerRegion(region: HitRegion): void {
    this.hitTest.register(region);
  }

  /** Unregister a hit region. */
  unregisterRegion(id: string): void {
    this.hitTest.unregister(id);
  }

  /** Mark the framebuffer as dirty to trigger a re-render. */
  markDirty(): void {
    // Setting any pixel marks dirty, but this is for external force-refresh
    this.fb.set(0, 0, this.fb.get(0, 0));
  }

  private start(): void {
    if (this.running) return;
    this.running = true;
    this.loop();
  }

  private stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private loop = (): void => {
    if (!this.running) return;
    if (this.fb.dirty && this.ctx) {
      this.renderer.render(this.ctx, this.fb, this.theme);
      this.fb.clearDirty();
    }
    this.rafId = requestAnimationFrame(this.loop);
  };

  private setupEvents(canvas: HTMLCanvasElement): void {
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointermove", this.onPointerMove);
  }

  private getEventLcdCoords(e: PointerEvent): { x: number; y: number } {
    const rect = this.canvas!.getBoundingClientRect();
    const scaleX = this.canvas!.width / rect.width;
    const scaleY = this.canvas!.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    return this.hitTest.canvasToLcd(canvasX, canvasY);
  }

  private onPointerDown = (e: PointerEvent): void => {
    const { x, y } = this.getEventLcdCoords(e);
    const region = this.hitTest.hitTest(x, y);
    region?.onPointerDown?.(x, y);
  };

  private onPointerUp = (e: PointerEvent): void => {
    const { x, y } = this.getEventLcdCoords(e);
    const region = this.hitTest.hitTest(x, y);
    region?.onPointerUp?.(x, y);
  };

  private onPointerMove = (e: PointerEvent): void => {
    const { x, y } = this.getEventLcdCoords(e);
    const region = this.hitTest.hitTest(x, y);
    region?.onPointerMove?.(x, y);
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/engine/engine.ts
git commit -m "feat: add LCDEngine orchestrator with render loop and events"
```

---

### Task 8: Bitmap Font

**Files:**
- Create: `src/fonts/font-data.ts`, `src/fonts/bitmap-font.ts`

- [ ] **Step 1: Create src/fonts/font-data.ts**

This is a standard 5x7 pixel font. Each glyph is encoded as an array of 7 bytes (one per row, 5 bits wide, MSB = leftmost pixel).

```ts
/** 5x7 bitmap font. Each glyph: 7 bytes, each byte = one row, bits 4..0 = pixels left to right. */
export const FONT_5X7: Record<string, number[]> = {
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  B: [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  C: [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  D: [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  E: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  F: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  G: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01110],
  H: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  I: [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  J: [0b00111, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100],
  K: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  L: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  M: [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  N: [0b10001, 0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001],
  O: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  P: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  Q: [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  S: [0b01110, 0b10001, 0b10000, 0b01110, 0b00001, 0b10001, 0b01110],
  T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  U: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  V: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  W: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b11011, 0b10001],
  X: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  Y: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  Z: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
  a: [0b00000, 0b00000, 0b01110, 0b00001, 0b01111, 0b10001, 0b01111],
  b: [0b10000, 0b10000, 0b10110, 0b11001, 0b10001, 0b10001, 0b11110],
  c: [0b00000, 0b00000, 0b01110, 0b10000, 0b10000, 0b10001, 0b01110],
  d: [0b00001, 0b00001, 0b01101, 0b10011, 0b10001, 0b10001, 0b01111],
  e: [0b00000, 0b00000, 0b01110, 0b10001, 0b11111, 0b10000, 0b01110],
  f: [0b00110, 0b01001, 0b01000, 0b11100, 0b01000, 0b01000, 0b01000],
  g: [0b00000, 0b01111, 0b10001, 0b10001, 0b01111, 0b00001, 0b01110],
  h: [0b10000, 0b10000, 0b10110, 0b11001, 0b10001, 0b10001, 0b10001],
  i: [0b00100, 0b00000, 0b01100, 0b00100, 0b00100, 0b00100, 0b01110],
  j: [0b00010, 0b00000, 0b00110, 0b00010, 0b00010, 0b10010, 0b01100],
  k: [0b10000, 0b10000, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010],
  l: [0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  m: [0b00000, 0b00000, 0b11010, 0b10101, 0b10101, 0b10001, 0b10001],
  n: [0b00000, 0b00000, 0b10110, 0b11001, 0b10001, 0b10001, 0b10001],
  o: [0b00000, 0b00000, 0b01110, 0b10001, 0b10001, 0b10001, 0b01110],
  p: [0b00000, 0b00000, 0b11110, 0b10001, 0b11110, 0b10000, 0b10000],
  q: [0b00000, 0b00000, 0b01101, 0b10011, 0b01111, 0b00001, 0b00001],
  r: [0b00000, 0b00000, 0b10110, 0b11001, 0b10000, 0b10000, 0b10000],
  s: [0b00000, 0b00000, 0b01110, 0b10000, 0b01110, 0b00001, 0b11110],
  t: [0b01000, 0b01000, 0b11100, 0b01000, 0b01000, 0b01001, 0b00110],
  u: [0b00000, 0b00000, 0b10001, 0b10001, 0b10001, 0b10011, 0b01101],
  v: [0b00000, 0b00000, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  w: [0b00000, 0b00000, 0b10001, 0b10001, 0b10101, 0b10101, 0b01010],
  x: [0b00000, 0b00000, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001],
  y: [0b00000, 0b00000, 0b10001, 0b10001, 0b01111, 0b00001, 0b01110],
  z: [0b00000, 0b00000, 0b11111, 0b00010, 0b00100, 0b01000, 0b11111],
  "0": [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  "1": [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  "2": [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b01000, 0b11111],
  "3": [0b11111, 0b00010, 0b00100, 0b00010, 0b00001, 0b10001, 0b01110],
  "4": [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  "5": [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
  "6": [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  "7": [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  "8": [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  "9": [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100],
  " ": [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000],
  ".": [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b01100, 0b01100],
  ",": [0b00000, 0b00000, 0b00000, 0b00000, 0b00100, 0b00100, 0b01000],
  "!": [0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00000, 0b00100],
  "?": [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b00000, 0b00100],
  ":": [0b00000, 0b01100, 0b01100, 0b00000, 0b01100, 0b01100, 0b00000],
  "-": [0b00000, 0b00000, 0b00000, 0b11111, 0b00000, 0b00000, 0b00000],
  "/": [0b00001, 0b00010, 0b00010, 0b00100, 0b01000, 0b01000, 0b10000],
  "(": [0b00010, 0b00100, 0b01000, 0b01000, 0b01000, 0b00100, 0b00010],
  ")": [0b01000, 0b00100, 0b00010, 0b00010, 0b00010, 0b00100, 0b01000],
};

export const GLYPH_WIDTH = 5;
export const GLYPH_HEIGHT = 7;
```

- [ ] **Step 2: Create src/fonts/bitmap-font.ts**

```ts
import { FONT_5X7, GLYPH_WIDTH, GLYPH_HEIGHT } from "./font-data";
import type { Framebuffer } from "../engine/framebuffer";

export interface TextOptions {
  /** Scaling factor (1 = 5x7, 2 = 10x14, etc.) */
  scale?: number;
  /** Intensity for "on" pixels (default 1.0) */
  intensity?: number;
  /** Extra pixels between characters (default 1) */
  letterSpacing?: number;
}

export class BitmapFont {
  /** Rasterize a string into a framebuffer at position (x, y). */
  drawText(
    fb: Framebuffer,
    text: string,
    x: number,
    y: number,
    options: TextOptions = {}
  ): number {
    const scale = options.scale ?? 1;
    const intensity = options.intensity ?? 1;
    const letterSpacing = options.letterSpacing ?? 1;
    const charWidth = (GLYPH_WIDTH + letterSpacing) * scale;

    let cursorX = x;
    for (const ch of text) {
      const glyph = FONT_5X7[ch];
      if (glyph) {
        this.drawGlyph(fb, glyph, cursorX, y, scale, intensity);
      }
      cursorX += charWidth;
    }
    return cursorX - x; // total width drawn
  }

  /** Measure the width of a string in LCD pixels. */
  measureText(text: string, scale: number = 1, letterSpacing: number = 1): number {
    const charWidth = (GLYPH_WIDTH + letterSpacing) * scale;
    return text.length * charWidth - (text.length > 0 ? letterSpacing * scale : 0);
  }

  /** Get the height of text in LCD pixels. */
  textHeight(scale: number = 1): number {
    return GLYPH_HEIGHT * scale;
  }

  private drawGlyph(
    fb: Framebuffer,
    glyph: number[],
    x: number,
    y: number,
    scale: number,
    intensity: number
  ): void {
    for (let row = 0; row < GLYPH_HEIGHT; row++) {
      const bits = glyph[row];
      for (let col = 0; col < GLYPH_WIDTH; col++) {
        if (bits & (1 << (GLYPH_WIDTH - 1 - col))) {
          // Fill a scale x scale block
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              fb.set(x + col * scale + sx, y + row * scale + sy, intensity);
            }
          }
        }
      }
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/fonts/
git commit -m "feat: add 5x7 bitmap font with text rasterizer"
```

---

### Task 9: React Context and LCDScreen Component

**Files:**
- Create: `src/components/LCDContext.ts`, `src/components/LCDScreen.tsx`

- [ ] **Step 1: Create src/components/LCDContext.ts**

```ts
import { createContext, useContext } from "react";
import type { LCDEngine } from "../engine/engine";

export interface LCDContextValue {
  engine: LCDEngine;
  /** Absolute origin offset for nested components */
  offsetX: number;
  offsetY: number;
}

export const LCDContext = createContext<LCDContextValue | null>(null);

export function useLCD(): LCDContextValue {
  const ctx = useContext(LCDContext);
  if (!ctx) throw new Error("useLCD must be used within an <LCDScreen>");
  return ctx;
}
```

- [ ] **Step 2: Create src/components/LCDScreen.tsx**

```tsx
import { useRef, useEffect, useMemo, type ReactNode } from "react";
import { LCDEngine } from "../engine/engine";
import { LCDContext, type LCDContextValue } from "./LCDContext";
import { themePresets, type ThemePresetName } from "../themes/presets";
import type { LCDTheme } from "../themes/types";
import { cameraPresets, type CameraConfig } from "../engine/types";

export interface LCDScreenProps {
  /** Width in LCD pixels */
  width: number;
  /** Height in LCD pixels */
  height: number;
  /** Size of each LCD dot cell in CSS pixels (default 6) */
  pixelSize?: number;
  /** Color theme — preset name or custom theme object */
  theme?: ThemePresetName | LCDTheme;
  /** Camera transform — preset name or custom transform */
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

  // Update theme without recreating engine
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
```

- [ ] **Step 3: Verify with a minimal demo**

Update `demo/App.tsx`:

```tsx
import { LCDScreen } from "../src/components/LCDScreen";

export default function App() {
  return <LCDScreen width={80} height={60} pixelSize={6} theme="green" />;
}
```

Run: `npx vite --config vite.config.ts`

Expected: A dark green rectangle with visible ghost-pixel grid.

- [ ] **Step 4: Commit**

```bash
git add src/components/LCDContext.ts src/components/LCDScreen.tsx demo/App.tsx
git commit -m "feat: add LCDScreen component with engine integration"
```

---

### Task 10: LCDText Component

**Files:**
- Create: `src/components/LCDText.tsx`

- [ ] **Step 1: Create src/components/LCDText.tsx**

```tsx
import { useEffect, useId } from "react";
import { useLCD } from "./LCDContext";
import { BitmapFont } from "../fonts/bitmap-font";

const font = new BitmapFont();

export interface LCDTextProps {
  /** LCD pixel x coordinate */
  x: number;
  /** LCD pixel y coordinate */
  y: number;
  /** Text to display */
  children: string;
  /** Scale factor (default 1 = 5x7 per char) */
  scale?: number;
  /** Pixel intensity 0-1 (default 1) */
  intensity?: number;
}

export function LCDText({
  x,
  y,
  children,
  scale = 1,
  intensity = 1,
}: LCDTextProps) {
  const { engine, offsetX, offsetY } = useLCD();
  const id = useId();

  useEffect(() => {
    const absX = x + offsetX;
    const absY = y + offsetY;

    // Clear previous text area
    const textWidth = font.measureText(children, scale);
    const textHeight = font.textHeight(scale);
    engine.fb.fillRect(absX, absY, textWidth, textHeight, 0);

    // Draw new text
    font.drawText(engine.fb, children, absX, absY, { scale, intensity });
    engine.markDirty();
  }, [engine, x, y, offsetX, offsetY, children, scale, intensity, id]);

  return null;
}
```

- [ ] **Step 2: Update demo to show text**

Update `demo/App.tsx`:

```tsx
import { LCDScreen } from "../src/components/LCDScreen";
import { LCDText } from "../src/components/LCDText";

export default function App() {
  return (
    <LCDScreen width={120} height={60} pixelSize={6} theme="green">
      <LCDText x={4} y={4}>Hello LCD!</LCDText>
      <LCDText x={4} y={16} scale={2}>BIG</LCDText>
    </LCDScreen>
  );
}
```

Run: `npx vite --config vite.config.ts`

Expected: "Hello LCD!" in small text and "BIG" in double-size text, both rendered as LCD dot pixels.

- [ ] **Step 3: Commit**

```bash
git add src/components/LCDText.tsx demo/App.tsx
git commit -m "feat: add LCDText component with bitmap font rendering"
```

---

### Task 11: LCDHeading Component

**Files:**
- Create: `src/components/LCDHeading.tsx`

- [ ] **Step 1: Create src/components/LCDHeading.tsx**

```tsx
import { LCDText, type LCDTextProps } from "./LCDText";

export interface LCDHeadingProps extends Omit<LCDTextProps, "scale"> {
  /** Heading level 1-3 (maps to scale 3, 2, 1.5) */
  level?: 1 | 2 | 3;
}

const LEVEL_SCALE: Record<number, number> = { 1: 3, 2: 2, 3: 1 };

export function LCDHeading({ level = 1, ...props }: LCDHeadingProps) {
  return <LCDText {...props} scale={LEVEL_SCALE[level] ?? 3} />;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/LCDHeading.tsx
git commit -m "feat: add LCDHeading component"
```

---

### Task 12: LCDPanel and LCDDivider

**Files:**
- Create: `src/components/LCDPanel.tsx`, `src/components/LCDDivider.tsx`

- [ ] **Step 1: Create src/components/LCDPanel.tsx**

```tsx
import { useEffect, useMemo, type ReactNode } from "react";
import { useLCD, LCDContext, type LCDContextValue } from "./LCDContext";

export interface LCDPanelProps {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Draw a 1px border (default true) */
  border?: boolean;
  /** Border intensity (default 1) */
  borderIntensity?: number;
  children?: ReactNode;
}

export function LCDPanel({
  x,
  y,
  width,
  height,
  border = true,
  borderIntensity = 1,
  children,
}: LCDPanelProps) {
  const { engine, offsetX, offsetY } = useLCD();

  const absX = x + offsetX;
  const absY = y + offsetY;

  useEffect(() => {
    if (!border) return;
    const fb = engine.fb;
    const bi = borderIntensity;

    // Top and bottom edges
    for (let i = 0; i < width; i++) {
      fb.set(absX + i, absY, bi);
      fb.set(absX + i, absY + height - 1, bi);
    }
    // Left and right edges
    for (let i = 0; i < height; i++) {
      fb.set(absX, absY + i, bi);
      fb.set(absX + width - 1, absY + i, bi);
    }
    engine.markDirty();
  }, [engine, absX, absY, width, height, border, borderIntensity]);

  const childCtx = useMemo<LCDContextValue>(
    () => ({
      engine,
      offsetX: absX + (border ? 1 : 0),
      offsetY: absY + (border ? 1 : 0),
    }),
    [engine, absX, absY, border]
  );

  return (
    <LCDContext.Provider value={childCtx}>{children}</LCDContext.Provider>
  );
}
```

- [ ] **Step 2: Create src/components/LCDDivider.tsx**

```tsx
import { useEffect } from "react";
import { useLCD } from "./LCDContext";

export interface LCDDividerProps {
  x: number;
  y: number;
  length: number;
  /** "horizontal" or "vertical" (default "horizontal") */
  direction?: "horizontal" | "vertical";
  intensity?: number;
}

export function LCDDivider({
  x,
  y,
  length,
  direction = "horizontal",
  intensity = 1,
}: LCDDividerProps) {
  const { engine, offsetX, offsetY } = useLCD();

  useEffect(() => {
    const absX = x + offsetX;
    const absY = y + offsetY;
    for (let i = 0; i < length; i++) {
      if (direction === "horizontal") {
        engine.fb.set(absX + i, absY, intensity);
      } else {
        engine.fb.set(absX, absY + i, intensity);
      }
    }
    engine.markDirty();
  }, [engine, x, y, offsetX, offsetY, length, direction, intensity]);

  return null;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/LCDPanel.tsx src/components/LCDDivider.tsx
git commit -m "feat: add LCDPanel and LCDDivider components"
```

---

### Task 13: LCDButton Component

**Files:**
- Create: `src/components/LCDButton.tsx`

- [ ] **Step 1: Create src/components/LCDButton.tsx**

```tsx
import { useEffect, useId, useState, useCallback } from "react";
import { useLCD } from "./LCDContext";
import { BitmapFont } from "../fonts/bitmap-font";

const font = new BitmapFont();

export interface LCDButtonProps {
  x: number;
  y: number;
  /** Button label */
  label: string;
  /** Padding around text in LCD pixels (default 2) */
  padding?: number;
  scale?: number;
  onClick?: () => void;
}

export function LCDButton({
  x,
  y,
  label,
  padding = 2,
  scale = 1,
  onClick,
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

  const draw = useCallback(
    (isPressed: boolean) => {
      const fb = engine.fb;
      if (isPressed) {
        // Inverted: fill background, draw text as "off"
        fb.fillRect(absX, absY, btnW, btnH, 1);
        font.drawText(fb, label, absX + padding, absY + padding, {
          scale,
          intensity: 0,
        });
      } else {
        // Normal: clear background, draw border + text
        fb.fillRect(absX, absY, btnW, btnH, 0);
        // Border
        for (let i = 0; i < btnW; i++) {
          fb.set(absX + i, absY, 1);
          fb.set(absX + i, absY + btnH - 1, 1);
        }
        for (let i = 0; i < btnH; i++) {
          fb.set(absX, absY + i, 1);
          fb.set(absX + btnW - 1, absY + i, 1);
        }
        font.drawText(fb, label, absX + padding, absY + padding, {
          scale,
          intensity: 1,
        });
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/LCDButton.tsx
git commit -m "feat: add LCDButton with press state and hit detection"
```

---

### Task 14: LCDToggle Component

**Files:**
- Create: `src/components/LCDToggle.tsx`

- [ ] **Step 1: Create src/components/LCDToggle.tsx**

```tsx
import { useEffect, useId } from "react";
import { useLCD } from "./LCDContext";

export interface LCDToggleProps {
  x: number;
  y: number;
  /** Current state */
  value: boolean;
  /** Called when toggled */
  onChange?: (value: boolean) => void;
  /** Width in LCD pixels (default 12) */
  width?: number;
  /** Height in LCD pixels (default 7) */
  height?: number;
}

export function LCDToggle({
  x,
  y,
  value,
  onChange,
  width = 12,
  height = 7,
}: LCDToggleProps) {
  const { engine, offsetX, offsetY } = useLCD();
  const id = useId();
  const absX = x + offsetX;
  const absY = y + offsetY;
  const knobSize = height - 2;

  useEffect(() => {
    const fb = engine.fb;
    // Clear area
    fb.fillRect(absX, absY, width, height, 0);
    // Border
    for (let i = 0; i < width; i++) {
      fb.set(absX + i, absY, 1);
      fb.set(absX + i, absY + height - 1, 1);
    }
    for (let i = 0; i < height; i++) {
      fb.set(absX, absY + i, 1);
      fb.set(absX + width - 1, absY + i, 1);
    }
    // Knob
    const knobX = value ? absX + width - 1 - knobSize : absX + 1;
    fb.fillRect(knobX, absY + 1, knobSize, knobSize, 1);
    engine.markDirty();
  }, [engine, absX, absY, width, height, value, knobSize]);

  useEffect(() => {
    engine.registerRegion({
      id,
      rect: { x: absX, y: absY, width, height },
      onPointerDown: () => onChange?.(!value),
    });
    return () => engine.unregisterRegion(id);
  }, [engine, id, absX, absY, width, height, value, onChange]);

  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/LCDToggle.tsx
git commit -m "feat: add LCDToggle component"
```

---

### Task 15: LCDSlider Component

**Files:**
- Create: `src/components/LCDSlider.tsx`

- [ ] **Step 1: Create src/components/LCDSlider.tsx**

```tsx
import { useEffect, useId } from "react";
import { useLCD } from "./LCDContext";

export interface LCDSliderProps {
  x: number;
  y: number;
  width: number;
  /** Height in LCD pixels (default 5) */
  height?: number;
  /** Current value 0-1 */
  value: number;
  onChange?: (value: number) => void;
}

export function LCDSlider({
  x,
  y,
  width,
  height = 5,
  value,
  onChange,
}: LCDSliderProps) {
  const { engine, offsetX, offsetY } = useLCD();
  const id = useId();
  const absX = x + offsetX;
  const absY = y + offsetY;

  useEffect(() => {
    const fb = engine.fb;
    fb.fillRect(absX, absY, width, height, 0);
    // Border
    for (let i = 0; i < width; i++) {
      fb.set(absX + i, absY, 1);
      fb.set(absX + i, absY + height - 1, 1);
    }
    for (let i = 0; i < height; i++) {
      fb.set(absX, absY + i, 1);
      fb.set(absX + width - 1, absY + i, 1);
    }
    // Fill based on value
    const fillW = Math.round((width - 2) * Math.max(0, Math.min(1, value)));
    fb.fillRect(absX + 1, absY + 1, fillW, height - 2, 1);
    engine.markDirty();
  }, [engine, absX, absY, width, height, value]);

  useEffect(() => {
    engine.registerRegion({
      id,
      rect: { x: absX, y: absY, width, height },
      onPointerDown: (lx) => {
        const ratio = (lx - absX) / width;
        onChange?.(Math.max(0, Math.min(1, ratio)));
      },
      onPointerMove: (lx) => {
        const ratio = (lx - absX) / width;
        onChange?.(Math.max(0, Math.min(1, ratio)));
      },
    });
    return () => engine.unregisterRegion(id);
  }, [engine, id, absX, absY, width, height, onChange]);

  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/LCDSlider.tsx
git commit -m "feat: add LCDSlider component"
```

---

### Task 16: LCDProgress and LCDBadge

**Files:**
- Create: `src/components/LCDProgress.tsx`, `src/components/LCDBadge.tsx`

- [ ] **Step 1: Create src/components/LCDProgress.tsx**

```tsx
import { useEffect } from "react";
import { useLCD } from "./LCDContext";

export interface LCDProgressProps {
  x: number;
  y: number;
  width: number;
  height?: number;
  /** Progress value 0-1 */
  value: number;
}

export function LCDProgress({
  x,
  y,
  width,
  height = 5,
  value,
}: LCDProgressProps) {
  const { engine, offsetX, offsetY } = useLCD();

  useEffect(() => {
    const absX = x + offsetX;
    const absY = y + offsetY;
    const fb = engine.fb;
    fb.fillRect(absX, absY, width, height, 0);
    // Border
    for (let i = 0; i < width; i++) {
      fb.set(absX + i, absY, 1);
      fb.set(absX + i, absY + height - 1, 1);
    }
    for (let i = 0; i < height; i++) {
      fb.set(absX, absY + i, 1);
      fb.set(absX + width - 1, absY + i, 1);
    }
    // Fill
    const fillW = Math.round((width - 2) * Math.max(0, Math.min(1, value)));
    fb.fillRect(absX + 1, absY + 1, fillW, height - 2, 1);
    engine.markDirty();
  }, [engine, x, y, offsetX, offsetY, width, height, value]);

  return null;
}
```

- [ ] **Step 2: Create src/components/LCDBadge.tsx**

```tsx
import { useEffect } from "react";
import { useLCD } from "./LCDContext";
import { BitmapFont } from "../fonts/bitmap-font";

const font = new BitmapFont();

export interface LCDBadgeProps {
  x: number;
  y: number;
  /** Text content */
  children: string;
  /** Invert colors (filled background, dark text) */
  inverted?: boolean;
}

export function LCDBadge({ x, y, children, inverted = false }: LCDBadgeProps) {
  const { engine, offsetX, offsetY } = useLCD();

  useEffect(() => {
    const absX = x + offsetX;
    const absY = y + offsetY;
    const textW = font.measureText(children);
    const textH = font.textHeight();
    const padX = 2;
    const padY = 1;
    const w = textW + padX * 2;
    const h = textH + padY * 2;
    const fb = engine.fb;

    if (inverted) {
      fb.fillRect(absX, absY, w, h, 1);
      font.drawText(fb, children, absX + padX, absY + padY, { intensity: 0 });
    } else {
      fb.fillRect(absX, absY, w, h, 0);
      // Border
      for (let i = 0; i < w; i++) {
        fb.set(absX + i, absY, 1);
        fb.set(absX + i, absY + h - 1, 1);
      }
      for (let i = 0; i < h; i++) {
        fb.set(absX, absY + i, 1);
        fb.set(absX + w - 1, absY + i, 1);
      }
      font.drawText(fb, children, absX + padX, absY + padY, { intensity: 1 });
    }
    engine.markDirty();
  }, [engine, x, y, offsetX, offsetY, children, inverted]);

  return null;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/LCDProgress.tsx src/components/LCDBadge.tsx
git commit -m "feat: add LCDProgress and LCDBadge components"
```

---

### Task 17: Image Sampler and LCDImage

**Files:**
- Create: `src/assets/image-sampler.ts`, `src/components/LCDImage.tsx`

- [ ] **Step 1: Create src/assets/image-sampler.ts**

```ts
import type { Framebuffer } from "../engine/framebuffer";

/**
 * Downsample an image to LCD resolution and write into a framebuffer region.
 * Converts to grayscale, then maps to intensity (dark = high intensity on LCD).
 */
export function sampleImageToFramebuffer(
  img: HTMLImageElement | HTMLCanvasElement,
  fb: Framebuffer,
  destX: number,
  destY: number,
  destW: number,
  destH: number
): void {
  // Draw image to a temporary canvas at LCD resolution
  const tmpCanvas = document.createElement("canvas");
  tmpCanvas.width = destW;
  tmpCanvas.height = destH;
  const ctx = tmpCanvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, destW, destH);

  const imageData = ctx.getImageData(0, 0, destW, destH);
  const pixels = imageData.data;

  for (let y = 0; y < destH; y++) {
    for (let x = 0; x < destW; x++) {
      const i = (y * destW + x) * 4;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3] / 255;
      // Luminance
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      // Invert: dark pixels = high intensity on LCD
      const intensity = (1 - lum) * a;
      fb.set(destX + x, destY + y, intensity);
    }
  }
}
```

- [ ] **Step 2: Create src/components/LCDImage.tsx**

```tsx
import { useEffect, useRef } from "react";
import { useLCD } from "./LCDContext";
import { sampleImageToFramebuffer } from "../assets/image-sampler";

export interface LCDImageProps {
  /** Image source URL */
  src: string;
  x: number;
  y: number;
  /** Width in LCD pixels */
  width: number;
  /** Height in LCD pixels */
  height: number;
}

export function LCDImage({ src, x, y, width, height }: LCDImageProps) {
  const { engine, offsetX, offsetY } = useLCD();
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      sampleImageToFramebuffer(
        img,
        engine.fb,
        x + offsetX,
        y + offsetY,
        width,
        height
      );
      engine.markDirty();
    };
    img.src = src;
  }, [engine, src, x, y, offsetX, offsetY, width, height]);

  return null;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/assets/image-sampler.ts src/components/LCDImage.tsx
git commit -m "feat: add image downsampler and LCDImage component"
```

---

### Task 18: Icon Data and LCDIcon

**Files:**
- Create: `src/assets/icon-data.ts`, `src/components/LCDIcon.tsx`

- [ ] **Step 1: Create src/assets/icon-data.ts**

Pre-rasterized icons as 2D intensity arrays (8x8 pixels each).

```ts
/** 8x8 pixel icons. Each icon: 8 rows, each row = 8 bits (MSB = left). */
export const icons: Record<string, number[]> = {
  folder: [
    0b00000000,
    0b01110000,
    0b11111110,
    0b10000010,
    0b10000010,
    0b10000010,
    0b11111110,
    0b00000000,
  ],
  file: [
    0b00000000,
    0b01111000,
    0b01001100,
    0b01000110,
    0b01000010,
    0b01000010,
    0b01111110,
    0b00000000,
  ],
  gear: [
    0b00010000,
    0b01111100,
    0b01010100,
    0b11101110,
    0b01010100,
    0b01111100,
    0b00010000,
    0b00000000,
  ],
  arrow_right: [
    0b00000000,
    0b00010000,
    0b00011000,
    0b11111100,
    0b11111100,
    0b00011000,
    0b00010000,
    0b00000000,
  ],
  arrow_left: [
    0b00000000,
    0b00001000,
    0b00011000,
    0b00111111,
    0b00111111,
    0b00011000,
    0b00001000,
    0b00000000,
  ],
  check: [
    0b00000000,
    0b00000010,
    0b00000100,
    0b00001000,
    0b01010000,
    0b00100000,
    0b00000000,
    0b00000000,
  ],
  close: [
    0b00000000,
    0b01000010,
    0b00100100,
    0b00011000,
    0b00011000,
    0b00100100,
    0b01000010,
    0b00000000,
  ],
  menu: [
    0b00000000,
    0b11111110,
    0b00000000,
    0b11111110,
    0b00000000,
    0b11111110,
    0b00000000,
    0b00000000,
  ],
};

export const ICON_SIZE = 8;
```

- [ ] **Step 2: Create src/components/LCDIcon.tsx**

```tsx
import { useEffect } from "react";
import { useLCD } from "./LCDContext";
import { icons, ICON_SIZE } from "../assets/icon-data";

export interface LCDIconProps {
  x: number;
  y: number;
  /** Icon name from the built-in set */
  name: string;
  /** Scale factor (default 1 = 8x8) */
  scale?: number;
  intensity?: number;
}

export function LCDIcon({
  x,
  y,
  name,
  scale = 1,
  intensity = 1,
}: LCDIconProps) {
  const { engine, offsetX, offsetY } = useLCD();

  useEffect(() => {
    const icon = icons[name];
    if (!icon) return;

    const absX = x + offsetX;
    const absY = y + offsetY;
    const fb = engine.fb;

    // Clear area
    fb.fillRect(absX, absY, ICON_SIZE * scale, ICON_SIZE * scale, 0);

    for (let row = 0; row < ICON_SIZE; row++) {
      const bits = icon[row];
      for (let col = 0; col < ICON_SIZE; col++) {
        if (bits & (1 << (ICON_SIZE - 1 - col))) {
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              fb.set(
                absX + col * scale + sx,
                absY + row * scale + sy,
                intensity
              );
            }
          }
        }
      }
    }
    engine.markDirty();
  }, [engine, x, y, offsetX, offsetY, name, scale, intensity]);

  return null;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/assets/icon-data.ts src/components/LCDIcon.tsx
git commit -m "feat: add icon data and LCDIcon component"
```

---

### Task 19: LCDTabs and LCDMenu

**Files:**
- Create: `src/components/LCDTabs.tsx`, `src/components/LCDMenu.tsx`

- [ ] **Step 1: Create src/components/LCDTabs.tsx**

```tsx
import { useEffect, useId } from "react";
import { useLCD } from "./LCDContext";
import { BitmapFont } from "../fonts/bitmap-font";

const font = new BitmapFont();

export interface LCDTabsProps {
  x: number;
  y: number;
  tabs: string[];
  activeIndex: number;
  onChange?: (index: number) => void;
  /** Gap between tabs in LCD pixels (default 1) */
  gap?: number;
}

export function LCDTabs({
  x,
  y,
  tabs,
  activeIndex,
  onChange,
  gap = 1,
}: LCDTabsProps) {
  const { engine, offsetX, offsetY } = useLCD();
  const baseId = useId();
  const absX = x + offsetX;
  const absY = y + offsetY;

  const padX = 2;
  const padY = 1;
  const textH = font.textHeight();
  const tabH = textH + padY * 2;

  // Calculate tab positions
  const tabRects = tabs.map((label, i) => {
    const textW = font.measureText(label);
    const tabW = textW + padX * 2;
    let tx = absX;
    for (let j = 0; j < i; j++) {
      tx += font.measureText(tabs[j]) + padX * 2 + gap;
    }
    return { x: tx, y: absY, w: tabW, h: tabH, label };
  });

  useEffect(() => {
    const fb = engine.fb;
    // Clear entire tab bar area
    const totalW =
      tabRects.length > 0
        ? tabRects[tabRects.length - 1].x +
          tabRects[tabRects.length - 1].w -
          absX
        : 0;
    fb.fillRect(absX, absY, totalW, tabH, 0);

    tabRects.forEach((tr, i) => {
      if (i === activeIndex) {
        // Active: filled
        fb.fillRect(tr.x, tr.y, tr.w, tr.h, 1);
        font.drawText(fb, tr.label, tr.x + padX, tr.y + padY, {
          intensity: 0,
        });
      } else {
        // Inactive: bordered
        for (let j = 0; j < tr.w; j++) {
          fb.set(tr.x + j, tr.y, 1);
          fb.set(tr.x + j, tr.y + tr.h - 1, 1);
        }
        for (let j = 0; j < tr.h; j++) {
          fb.set(tr.x, tr.y + j, 1);
          fb.set(tr.x + tr.w - 1, tr.y + j, 1);
        }
        font.drawText(fb, tr.label, tr.x + padX, tr.y + padY, {
          intensity: 1,
        });
      }
    });
    engine.markDirty();
  }, [engine, absX, absY, tabs, activeIndex, tabRects, tabH, padX, padY]);

  // Register hit regions for each tab
  useEffect(() => {
    tabRects.forEach((tr, i) => {
      engine.registerRegion({
        id: `${baseId}-tab-${i}`,
        rect: { x: tr.x, y: tr.y, width: tr.w, height: tr.h },
        onPointerDown: () => onChange?.(i),
      });
    });
    return () => {
      tabRects.forEach((_, i) => engine.unregisterRegion(`${baseId}-tab-${i}`));
    };
  }, [engine, baseId, tabRects, onChange]);

  return null;
}
```

- [ ] **Step 2: Create src/components/LCDMenu.tsx**

```tsx
import { useEffect, useId } from "react";
import { useLCD } from "./LCDContext";
import { BitmapFont } from "../fonts/bitmap-font";

const font = new BitmapFont();

export interface LCDMenuProps {
  x: number;
  y: number;
  items: string[];
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  /** Width in LCD pixels (auto if not set) */
  width?: number;
}

export function LCDMenu({
  x,
  y,
  items,
  selectedIndex = -1,
  onSelect,
  width,
}: LCDMenuProps) {
  const { engine, offsetX, offsetY } = useLCD();
  const baseId = useId();
  const absX = x + offsetX;
  const absY = y + offsetY;

  const textH = font.textHeight();
  const itemH = textH + 2; // 1px padding top + bottom
  const menuW =
    width ??
    Math.max(...items.map((item) => font.measureText(item))) + 4; // 2px padding each side

  useEffect(() => {
    const fb = engine.fb;
    const totalH = items.length * itemH;
    fb.fillRect(absX, absY, menuW, totalH, 0);

    items.forEach((item, i) => {
      const iy = absY + i * itemH;
      if (i === selectedIndex) {
        fb.fillRect(absX, iy, menuW, itemH, 1);
        font.drawText(fb, item, absX + 2, iy + 1, { intensity: 0 });
      } else {
        font.drawText(fb, item, absX + 2, iy + 1, { intensity: 1 });
      }
    });
    engine.markDirty();
  }, [engine, absX, absY, items, selectedIndex, menuW, itemH]);

  useEffect(() => {
    items.forEach((_, i) => {
      engine.registerRegion({
        id: `${baseId}-menu-${i}`,
        rect: {
          x: absX,
          y: absY + i * itemH,
          width: menuW,
          height: itemH,
        },
        onPointerDown: () => onSelect?.(i),
      });
    });
    return () => {
      items.forEach((_, i) =>
        engine.unregisterRegion(`${baseId}-menu-${i}`)
      );
    };
  }, [engine, baseId, absX, absY, items, menuW, itemH, onSelect]);

  return null;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/LCDTabs.tsx src/components/LCDMenu.tsx
git commit -m "feat: add LCDTabs and LCDMenu components"
```

---

### Task 20: Public Exports

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: Create src/index.ts**

```ts
// Engine
export { LCDEngine } from "./engine/engine";
export type { EngineConfig } from "./engine/engine";
export { Framebuffer } from "./engine/framebuffer";
export { DotRenderer } from "./engine/renderer";
export type { RendererConfig } from "./engine/renderer";
export { HitTestManager } from "./engine/hit-test";
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

// Context (for advanced usage)
export { useLCD, LCDContext } from "./components/LCDContext";
export type { LCDContextValue } from "./components/LCDContext";
```

- [ ] **Step 2: Commit**

```bash
git add src/index.ts
git commit -m "feat: add public exports barrel file"
```

---

### Task 21: Demo Page

**Files:**
- Modify: `demo/App.tsx`

- [ ] **Step 1: Create the showcase demo**

```tsx
import { useState } from "react";
import {
  LCDScreen,
  LCDText,
  LCDHeading,
  LCDPanel,
  LCDDivider,
  LCDButton,
  LCDToggle,
  LCDSlider,
  LCDProgress,
  LCDBadge,
  LCDIcon,
  LCDTabs,
  LCDMenu,
} from "../src";

export default function App() {
  const [toggle, setToggle] = useState(false);
  const [slider, setSlider] = useState(0.5);
  const [progress, setProgress] = useState(0.65);
  const [activeTab, setActiveTab] = useState(0);
  const [menuItem, setMenuItem] = useState(0);
  const [camera, setCamera] = useState<"straight" | "isometric">("isometric");

  return (
    <div style={{ padding: 40 }}>
      <div style={{ marginBottom: 16, fontFamily: "monospace", color: "#aaa" }}>
        <button onClick={() => setCamera(camera === "straight" ? "isometric" : "straight")}>
          Camera: {camera}
        </button>
      </div>
      <LCDScreen width={200} height={140} pixelSize={4} theme="green" camera={camera}>
        {/* Title bar */}
        <LCDPanel x={0} y={0} width={200} height={14}>
          <LCDIcon x={1} y={2} name="folder" />
          <LCDText x={11} y={3}>LCD Desktop v1.0</LCDText>
          <LCDBadge x={160} y={2} inverted>3 items</LCDBadge>
        </LCDPanel>

        <LCDDivider x={0} y={15} length={200} />

        {/* Tabs */}
        <LCDTabs
          x={2}
          y={18}
          tabs={["Main", "Settings", "About"]}
          activeIndex={activeTab}
          onChange={setActiveTab}
        />

        {/* Content area */}
        <LCDPanel x={2} y={30} width={120} height={70} border>
          <LCDHeading x={2} y={2} level={3}>Controls</LCDHeading>
          <LCDDivider x={0} y={11} length={118} />

          <LCDText x={2} y={14}>Toggle:</LCDText>
          <LCDToggle x={50} y={14} value={toggle} onChange={setToggle} />

          <LCDText x={2} y={24}>Volume:</LCDText>
          <LCDSlider x={50} y={24} width={60} value={slider} onChange={setSlider} />

          <LCDText x={2} y={34}>Load:</LCDText>
          <LCDProgress x={50} y={34} width={60} value={progress} />

          <LCDButton
            x={2}
            y={44}
            label="Click Me"
            onClick={() => setProgress(Math.random())}
          />
        </LCDPanel>

        {/* Side menu */}
        <LCDPanel x={126} y={30} width={72} height={70} border>
          <LCDText x={2} y={2}>Menu</LCDText>
          <LCDDivider x={0} y={11} length={70} />
          <LCDMenu
            x={2}
            y={14}
            items={["Dashboard", "Files", "Network", "System"]}
            selectedIndex={menuItem}
            onSelect={setMenuItem}
            width={66}
          />
        </LCDPanel>

        {/* Status bar */}
        <LCDDivider x={0} y={105} length={200} />
        <LCDText x={4} y={108}>Status: OK</LCDText>
        <LCDIcon x={186} y={107} name="gear" />

        {/* Footer icons */}
        <LCDDivider x={0} y={118} length={200} />
        <LCDIcon x={4} y={122} name="folder" scale={2} />
        <LCDIcon x={24} y={122} name="file" scale={2} />
        <LCDIcon x={44} y={122} name="gear" scale={2} />
        <LCDText x={70} y={126}>LCD UI v1.0</LCDText>
      </LCDScreen>
    </div>
  );
}
```

- [ ] **Step 2: Run the demo**

```bash
npx vite --config vite.config.ts
```

Expected: A retro green LCD screen showing a fake desktop with title bar, tabs, panels, controls, menu, status bar, and icons — all rendered as pixel dots. The isometric camera tilts the whole screen. Clicking the camera button toggles between straight and isometric view.

- [ ] **Step 3: Commit**

```bash
git add demo/App.tsx
git commit -m "feat: add showcase demo page with all LCD components"
```

---

### Task 22: Final Verification

- [ ] **Step 1: Type check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Visual verification**

Run `npx vite --config vite.config.ts`, open in browser, and verify:
- Dot grid is visible with rounded squares and gaps
- Ghost pixels (off dots) are faintly visible
- On dots have soft shadows
- Text renders correctly in bitmap font
- Button click inverts colors
- Toggle switches knob position
- Slider responds to clicks
- Progress bar fills correctly
- Tabs switch between active states
- Menu highlights selected item
- Isometric camera transform works
- Camera toggle switches between straight and isometric

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: LCD UI library v1.0 complete"
```
