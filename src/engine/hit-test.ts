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

  canvasToLcd(canvasX: number, canvasY: number): { x: number; y: number } {
    return {
      x: Math.floor(canvasX / this.pixelSize),
      y: Math.floor(canvasY / this.pixelSize),
    };
  }

  hitTest(lcdX: number, lcdY: number): HitRegion | null {
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
