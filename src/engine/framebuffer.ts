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

  get(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.data[y * this.width + x];
  }

  set(x: number, y: number, intensity: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.data[y * this.width + x] = Math.max(0, Math.min(1, intensity));
    this._dirty = true;
  }

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

  clear(): void {
    this.data.fill(0);
    this._dirty = true;
  }
}
