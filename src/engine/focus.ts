import type { Rect } from "./types";

export interface FocusableItem {
  id: string;
  rect: Rect;
  /** Explicit sort order — lower = earlier in nav sequence */
  order: number;
  onFocus?: () => void;
  onBlur?: () => void;
  /** Enter/Space */
  onActivate?: () => void;
  /** Left arrow */
  onLeft?: () => void;
  /** Right arrow */
  onRight?: () => void;
  /** Up arrow — return true to consume (stay on this item) */
  onUp?: () => boolean;
  /** Down arrow — return true to consume (stay on this item) */
  onDown?: () => boolean;
}

export type CancelHandler = () => void;

export class FocusManager {
  private items: Map<string, FocusableItem> = new Map();
  private _focusedId: string | null = null;
  private cancelHandlers: Set<CancelHandler> = new Set();
  private pendingReconcile = false;

  get focusedId(): string | null {
    return this._focusedId;
  }

  register(item: FocusableItem): void {
    this.items.set(item.id, item);
    this.scheduleReconcile();
  }

  unregister(id: string): void {
    this.items.delete(id);
    this.scheduleReconcile();
  }

  /** Defer focus reconciliation to batch rapid register/unregister cycles */
  private scheduleReconcile(): void {
    if (this.pendingReconcile) return;
    this.pendingReconcile = true;
    queueMicrotask(() => {
      this.pendingReconcile = false;
      this.reconcile();
    });
  }

  private reconcile(): void {
    if (this._focusedId && this.items.has(this._focusedId)) return;
    this.focusFirst();
  }

  focus(id: string): void {
    if (id === this._focusedId) return;
    if (!this.items.has(id)) return;
    const prev = this._focusedId ? this.items.get(this._focusedId) : null;
    prev?.onBlur?.();
    this._focusedId = id;
    this.items.get(id)?.onFocus?.();
  }

  isFocused(id: string): boolean {
    return this._focusedId === id;
  }

  onCancel(handler: CancelHandler): void {
    this.cancelHandlers.add(handler);
  }

  offCancel(handler: CancelHandler): void {
    this.cancelHandlers.delete(handler);
  }

  handleKey(e: KeyboardEvent): boolean {
    const focused = this._focusedId ? this.items.get(this._focusedId) : null;

    switch (e.key) {
      case "Enter":
      case " ":
        if (focused?.onActivate) {
          e.preventDefault();
          focused.onActivate();
          return true;
        }
        return false;

      case "ArrowRight":
        if (focused?.onRight) {
          e.preventDefault();
          focused.onRight();
          return true;
        }
        // Right also activates if no explicit onRight
        if (focused?.onActivate) {
          e.preventDefault();
          focused.onActivate();
          return true;
        }
        return false;

      case "ArrowLeft":
        if (focused?.onLeft) {
          e.preventDefault();
          focused.onLeft();
          return true;
        }
        return this.triggerCancel(e);

      case "Escape":
      case "Backspace":
        return this.triggerCancel(e);

      case "ArrowDown":
        if (focused?.onDown && focused.onDown()) {
          e.preventDefault();
          return true;
        }
        if (this.moveFocus(1)) {
          e.preventDefault();
          return true;
        }
        return false; // at bottom edge — let raw handlers fire

      case "ArrowUp":
        if (focused?.onUp && focused.onUp()) {
          e.preventDefault();
          return true;
        }
        if (this.moveFocus(-1)) {
          e.preventDefault();
          return true;
        }
        return false; // at top edge — let raw handlers fire

      default:
        return false;
    }
  }

  private triggerCancel(e: KeyboardEvent): boolean {
    if (this.cancelHandlers.size === 0) return false;
    e.preventDefault();
    const handlers = Array.from(this.cancelHandlers);
    handlers[handlers.length - 1]();
    return true;
  }

  private sorted(): FocusableItem[] {
    return Array.from(this.items.values()).sort((a, b) => a.order - b.order);
  }

  private focusFirst(): void {
    const sorted = this.sorted();
    if (sorted.length === 0) {
      this._focusedId = null;
      return;
    }
    const prev = this._focusedId ? this.items.get(this._focusedId) : null;
    prev?.onBlur?.();
    this._focusedId = sorted[0].id;
    sorted[0].onFocus?.();
  }

  private moveFocus(dir: 1 | -1): boolean {
    const sorted = this.sorted();
    if (sorted.length === 0) return false;

    const curIdx = sorted.findIndex((item) => item.id === this._focusedId);
    let nextIdx = curIdx + dir;

    if (nextIdx >= sorted.length) {
      nextIdx = 0;
    } else if (nextIdx < 0) {
      nextIdx = sorted.length - 1;
    }

    if (nextIdx === curIdx) return false;
    this.focus(sorted[nextIdx].id);
    return true;
  }
}
