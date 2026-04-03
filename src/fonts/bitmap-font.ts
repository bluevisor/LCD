import { FONT_5X7, GLYPH_WIDTH, GLYPH_HEIGHT } from "./font-data";
import type { Framebuffer } from "../engine/framebuffer";

export interface TextOptions {
  scale?: number;
  intensity?: number;
  letterSpacing?: number;
}

export class BitmapFont {
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
    return cursorX - x;
  }

  measureText(text: string, scale: number = 1, letterSpacing: number = 1): number {
    const charWidth = (GLYPH_WIDTH + letterSpacing) * scale;
    return text.length * charWidth - (text.length > 0 ? letterSpacing * scale : 0);
  }

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
