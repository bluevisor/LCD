import type { LCDTheme } from "../themes/types";
import type { Framebuffer } from "./framebuffer";

export interface RendererConfig {
  pixelSize: number;
  dotFill: number;
  shadowOffset: number;
  shadowBlur: number;
}

const DEFAULT_CONFIG: RendererConfig = {
  pixelSize: 6,
  dotFill: 0.8,
  shadowOffset: 1,
  shadowBlur: 1.5,
};

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

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

  render(
    ctx: CanvasRenderingContext2D,
    fb: Framebuffer,
    theme: LCDTheme
  ): void {
    const { pixelSize, dotFill, shadowOffset, shadowBlur } = this.config;
    const dotSize = pixelSize * dotFill;
    const offset = (pixelSize - dotSize) / 2;
    const radius = dotSize * 0.05;

    const canvasW = fb.width * pixelSize;
    const canvasH = fb.height * pixelSize;

    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, canvasW, canvasH);

    const offRgb = hexToRgb(theme.dotOff);
    const onRgb = hexToRgb(theme.dotOn);
    const shadowRgb = hexToRgb(theme.shadow);

    for (let y = 0; y < fb.height; y++) {
      for (let x = 0; x < fb.width; x++) {
        const intensity = fb.get(x, y);
        const px = x * pixelSize + offset;
        const py = y * pixelSize + offset;

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

  setPixelSize(size: number): void {
    this.config.pixelSize = size;
  }
}
