import type { Framebuffer } from "../engine/framebuffer";

export function sampleImageToFramebuffer(
  img: HTMLImageElement | HTMLCanvasElement,
  fb: Framebuffer,
  destX: number,
  destY: number,
  destW: number,
  destH: number
): void {
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
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const intensity = (1 - lum) * a;
      fb.set(destX + x, destY + y, intensity);
    }
  }
}
