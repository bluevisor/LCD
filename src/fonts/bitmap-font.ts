import { FONT_5X7, GLYPH_WIDTH, GLYPH_HEIGHT } from "./font-data";
import { FONT_3X5, GLYPH_WIDTH_3X5, GLYPH_HEIGHT_3X5 } from "./font-3x5";
import type { Framebuffer } from "../engine/framebuffer";

export interface TextOptions {
  scale?: number;
  intensity?: number;
  letterSpacing?: number;
}

export type FontSize = "5x7" | "3x5";

export class BitmapFont {
  private glyphs: Record<string, number[]>;
  private glyphW: number;
  private glyphH: number;

  constructor(size: FontSize = "5x7") {
    if (size === "3x5") {
      this.glyphs = FONT_3X5;
      this.glyphW = GLYPH_WIDTH_3X5;
      this.glyphH = GLYPH_HEIGHT_3X5;
    } else {
      this.glyphs = FONT_5X7;
      this.glyphW = GLYPH_WIDTH;
      this.glyphH = GLYPH_HEIGHT;
    }
  }

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
    const charWidth = (this.glyphW + letterSpacing) * scale;

    let cursorX = x;
    for (const ch of text) {
      const glyph = this.glyphs[ch];
      if (glyph) {
        this.drawGlyph(fb, glyph, cursorX, y, scale, intensity);
      }
      cursorX += charWidth;
    }
    return cursorX - x;
  }

  measureText(text: string, scale: number = 1, letterSpacing: number = 1): number {
    const charWidth = (this.glyphW + letterSpacing) * scale;
    return text.length * charWidth - (text.length > 0 ? letterSpacing * scale : 0);
  }

  textHeight(scale: number = 1): number {
    return this.glyphH * scale;
  }

  private drawGlyph(
    fb: Framebuffer,
    glyph: number[],
    x: number,
    y: number,
    scale: number,
    intensity: number
  ): void {
    for (let row = 0; row < this.glyphH; row++) {
      const bits = glyph[row];
      for (let col = 0; col < this.glyphW; col++) {
        if (bits & (1 << (this.glyphW - 1 - col))) {
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
