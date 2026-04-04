import { Framebuffer } from "./framebuffer";
import { DotRenderer, type RendererConfig } from "./renderer";
import { HitTestManager } from "./hit-test";
import { FocusManager } from "./focus";
import type { LCDTheme } from "../themes/types";
import type { HitRegion } from "./types";

export interface EngineConfig {
  width: number;
  height: number;
  theme: LCDTheme;
  renderer?: Partial<RendererConfig>;
}

export type KeyHandler = (e: KeyboardEvent) => void;

export class LCDEngine {
  readonly fb: Framebuffer;
  readonly renderer: DotRenderer;
  readonly hitTest: HitTestManager;
  readonly focus: FocusManager;
  theme: LCDTheme;

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private rafId: number | null = null;
  private running = false;
  private keyHandlers: Set<KeyHandler> = new Set();

  constructor(config: EngineConfig) {
    this.fb = new Framebuffer(config.width, config.height);
    this.renderer = new DotRenderer(config.renderer);
    this.hitTest = new HitTestManager();
    this.hitTest.setPixelSize(this.renderer.pixelSize);
    this.focus = new FocusManager();
    this.theme = config.theme;
  }

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    const size = this.renderer.getCanvasSize(this.fb);
    canvas.width = size.width;
    canvas.height = size.height;
    canvas.tabIndex = 0;
    canvas.style.outline = "none";
    this.setupEvents(canvas);
    this.start();
  }

  detach(): void {
    this.stop();
    if (this.canvas) {
      this.canvas.removeEventListener("pointerdown", this.onPointerDown);
      this.canvas.removeEventListener("pointerup", this.onPointerUp);
      this.canvas.removeEventListener("pointermove", this.onPointerMove);
      this.canvas.removeEventListener("keydown", this.onKeyDown);
    }
    this.canvas = null;
    this.ctx = null;
  }

  setPixelSize(size: number): void {
    this.renderer.setPixelSize(size);
    this.hitTest.setPixelSize(size);
    if (this.canvas) {
      const s = this.renderer.getCanvasSize(this.fb);
      this.canvas.width = s.width;
      this.canvas.height = s.height;
    }
    this.markDirty();
  }

  addKeyListener(handler: KeyHandler): void {
    this.keyHandlers.add(handler);
  }

  removeKeyListener(handler: KeyHandler): void {
    this.keyHandlers.delete(handler);
  }

  registerRegion(region: HitRegion): void {
    this.hitTest.register(region);
  }

  unregisterRegion(id: string): void {
    this.hitTest.unregister(id);
  }

  markDirty(): void {
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
    canvas.addEventListener("keydown", this.onKeyDown);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.focus.handleKey(e)) return;
    for (const handler of this.keyHandlers) {
      handler(e);
    }
  };

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
