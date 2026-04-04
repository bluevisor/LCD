import type { LCDTheme } from "../themes/types";
import type { Framebuffer } from "./framebuffer";

export interface RendererConfig {
  pixelSize: number;
  dotFill: number;
  shadowOffset: number;
}

const DEFAULT_CONFIG: RendererConfig = {
  pixelSize: 6,
  dotFill: 0.8,
  shadowOffset: 1,
};

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

export class DotRenderer {
  private config: RendererConfig;
  private colorCache: Uint8Array | null = null;
  private cachedThemeBg: string = "";
  private cachedThemeOff: string = "";
  private cachedThemeOn: string = "";

  constructor(config: Partial<RendererConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private buildColorCache(theme: LCDTheme): void {
    if (
      this.colorCache &&
      this.cachedThemeBg === theme.background &&
      this.cachedThemeOff === theme.dotOff &&
      this.cachedThemeOn === theme.dotOn
    ) return;

    this.cachedThemeBg = theme.background;
    this.cachedThemeOff = theme.dotOff;
    this.cachedThemeOn = theme.dotOn;

    const offRgb = hexToRgb(theme.dotOff);
    const onRgb = hexToRgb(theme.dotOn);
    // 256 entries * 3 channels
    this.colorCache = new Uint8Array(256 * 3);
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      this.colorCache[i * 3] = Math.round(offRgb[0] + (onRgb[0] - offRgb[0]) * t);
      this.colorCache[i * 3 + 1] = Math.round(offRgb[1] + (onRgb[1] - offRgb[1]) * t);
      this.colorCache[i * 3 + 2] = Math.round(offRgb[2] + (onRgb[2] - offRgb[2]) * t);
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    fb: Framebuffer,
    theme: LCDTheme
  ): void {
    const { pixelSize, dotFill } = this.config;
    const dotSize = Math.round(pixelSize * dotFill);
    const offset = Math.round((pixelSize - dotSize) / 2);

    const canvasW = fb.width * pixelSize;
    const canvasH = fb.height * pixelSize;

    this.buildColorCache(theme);
    const cache = this.colorCache!;

    const imageData = ctx.createImageData(canvasW, canvasH);
    const pixels = imageData.data;

    // Fill background
    const bgRgb = hexToRgb(theme.background);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = bgRgb[0];
      pixels[i + 1] = bgRgb[1];
      pixels[i + 2] = bgRgb[2];
      pixels[i + 3] = 255;
    }

    const { shadowOffset } = this.config;
    const shadowRgb = hexToRgb(theme.shadow);

    // Draw shadows first, then dots on top
    for (let y = 0; y < fb.height; y++) {
      for (let x = 0; x < fb.width; x++) {
        const intensity = fb.get(x, y);
        if (intensity <= 0.05) continue;

        const px0 = x * pixelSize + offset;
        const py0 = y * pixelSize + offset;

        // Shadow (offset, alpha-blended with background)
        const alpha = intensity * 0.5;
        const sr = Math.round(bgRgb[0] + (shadowRgb[0] - bgRgb[0]) * alpha);
        const sg = Math.round(bgRgb[1] + (shadowRgb[1] - bgRgb[1]) * alpha);
        const sb = Math.round(bgRgb[2] + (shadowRgb[2] - bgRgb[2]) * alpha);
        const sx0 = px0 + shadowOffset;
        const sy0 = py0 + shadowOffset;

        for (let dy = 0; dy < dotSize; dy++) {
          const ry = sy0 + dy;
          if (ry >= canvasH) continue;
          const rowStart = ry * canvasW;
          for (let dx = 0; dx < dotSize; dx++) {
            const rx = sx0 + dx;
            if (rx >= canvasW) continue;
            const idx = (rowStart + rx) * 4;
            pixels[idx] = sr;
            pixels[idx + 1] = sg;
            pixels[idx + 2] = sb;
          }
        }
      }
    }

    // Draw dots on top of shadows
    for (let y = 0; y < fb.height; y++) {
      for (let x = 0; x < fb.width; x++) {
        const intensity = fb.get(x, y);
        const ci = Math.round(intensity * 255);
        const r = cache[ci * 3];
        const g = cache[ci * 3 + 1];
        const b = cache[ci * 3 + 2];

        const px0 = x * pixelSize + offset;
        const py0 = y * pixelSize + offset;

        for (let dy = 0; dy < dotSize; dy++) {
          const rowStart = (py0 + dy) * canvasW;
          for (let dx = 0; dx < dotSize; dx++) {
            const idx = (rowStart + px0 + dx) * 4;
            pixels[idx] = r;
            pixels[idx + 1] = g;
            pixels[idx + 2] = b;
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
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

  setPixelSize(size: number): void {
    this.config.pixelSize = size;
  }
}
