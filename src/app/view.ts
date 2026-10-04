// The workspace: the image on a canvas filling the space between the panels, zoomed and
// scrolled, with transparency shown as a checkerboard, a pixel grid when zoomed far in,
// the selection's marching ants and the tool's own marks. Pointer input becomes tool
// events in image coordinates; the middle button, the space bar or two fingers pan, and
// ⌘ with the wheel or a pinch zooms.

import { app } from './app';
import { checkerPattern } from './canvas';
import type { ToolEvent } from './tools/tool';

const ZOOMS = [1 / 32, 1 / 24, 1 / 16, 1 / 12, 1 / 8, 1 / 6, 1 / 4, 1 / 3, 1 / 2, 2 / 3, 1, 1.5, 2, 3, 4, 5, 6, 8, 12, 16, 24, 32, 48, 64];
const MIN_ZOOM = ZOOMS[0]!;
const MAX_ZOOM = ZOOMS[ZOOMS.length - 1]!;
const MARGIN = 48;

export class View {
  zoom = 1;
  // Where the image's top left corner is, in CSS pixels from the workspace's.
  ox = 0;
  oy = 0;
  // The pointer over the image, in image coordinates; null when it is elsewhere.
  cursor: { x: number; y: number } | null = null;
  readonly ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private frame = 0;
  private ants = 0;
  private checker: CanvasPattern | null = null;
  private checkerDark = false;
  private pointers = new Map<number, { x: number; y: number }>();
  private mode: 'tool' | 'pan' | 'pinch' | null = null;
  private toolPointer = -1;
  private last = { x: 0, y: 0 };
  private pinch = { distance: 0, zoom: 1, mx: 0, my: 0 };
  private space = false;

  constructor(
    readonly host: HTMLElement,
    readonly canvas: HTMLCanvasElement,
  ) {
    this.ctx = canvas.getContext('2d')!;
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    canvas.addEventListener('pointerup', (e) => this.onUp(e));
    canvas.addEventListener('pointercancel', (e) => this.onUp(e, true));
    canvas.addEventListener('pointerleave', () => this.leave());
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    host.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    // The ants march only when there is a selection to show; the timer costs nothing otherwise.
    setInterval(() => {
      if (app.doc.selection) {
        this.ants = (this.ants + 1) % 16;
        this.requestDraw();
      }
    }, 110);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !isTyping(e.target)) {
        if (!this.space) {
          this.space = true;
          this.updateCursor();
        }
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.space = false;
        this.updateCursor();
      }
    });
    window.addEventListener('blur', () => {
      this.space = false;
      this.updateCursor();
    });
  }

  get width(): number {
    return this.host.clientWidth;
  }

  get height(): number {
    return this.host.clientHeight;
  }

  private resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.round(this.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(this.height * this.dpr));
    this.clamp();
    this.draw();
    app.emit('view');
  }

  requestDraw(): void {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.draw();
    });
  }

  // The image is drawn from whole CSS pixels, so that at 100% its pixels are the screen's;
  // pointer positions are taken from the same place.
  private get left(): number {
    return Math.round(this.ox);
  }

  private get top(): number {
    return Math.round(this.oy);
  }

  toImage(clientX: number, clientY: number): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: (clientX - r.left - this.left) / this.zoom, y: (clientY - r.top - this.top) / this.zoom };
  }

  // An image point in CSS pixels from the workspace's top left corner.
  toScreen(x: number, y: number): { x: number; y: number } {
    return { x: this.left + x * this.zoom, y: this.top + y * this.zoom };
  }

  draw(): void {
    const { ctx, dpr, zoom } = this;
    const { width: w, height: h } = app.doc;
    const styles = getComputedStyle(this.host);
    const dark = styles.getPropertyValue('--checker-dark').trim() === '1';
    if (!this.checker || dark !== this.checkerDark) {
      this.checker = checkerPattern(ctx, 8, dark);
      this.checkerDark = dark;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = styles.getPropertyValue('--workspace').trim() || '#808080';
    ctx.fillRect(0, 0, this.width, this.height);

    const x = this.left;
    const y = this.top;
    const sw = w * zoom;
    const sh = h * zoom;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = this.checker;
    ctx.fillRect(x, y, sw, sh);
    ctx.restore();

    const image = app.composite();
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, sw, sh);
    ctx.clip();
    ctx.translate(x, y);
    ctx.scale(zoom, zoom);
    ctx.imageSmoothingEnabled = zoom < 1;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0);
    ctx.restore();

    if (app.settings.grid && zoom >= 8) this.drawGrid(x, y);

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(zoom, zoom);
    const selection = app.doc.selection;
    // Floating pixels carry the selection with them; the move tool outlines them itself.
    if (selection && app.live?.kind !== 'float') this.strokeAnts(selection.outline);
    app.tool?.overlay?.(ctx, 1 / zoom);
    ctx.restore();
  }

  // Marching ants along a path in image coordinates: black dashes over white.
  strokeAnts(path: Path2D): void {
    const { ctx } = this;
    const px = 1 / this.zoom;
    ctx.save();
    ctx.lineWidth = px;
    ctx.strokeStyle = '#fff';
    ctx.setLineDash([]);
    ctx.stroke(path);
    ctx.strokeStyle = '#000';
    ctx.setLineDash([4 * px, 4 * px]);
    ctx.lineDashOffset = -this.ants * px * 0.5;
    ctx.stroke(path);
    ctx.restore();
  }

  private drawGrid(x: number, y: number): void {
    const { ctx, zoom } = this;
    const { width: w, height: h } = app.doc;
    const x0 = Math.max(0, Math.floor(-x / zoom));
    const y0 = Math.max(0, Math.floor(-y / zoom));
    const x1 = Math.min(w, Math.ceil((this.width - x) / zoom));
    const y1 = Math.min(h, Math.ceil((this.height - y) / zoom));
    ctx.save();
    ctx.beginPath();
    for (let i = x0; i <= x1; i++) {
      const sx = Math.round(x + i * zoom) + 0.5;
      ctx.moveTo(sx, y + y0 * zoom);
      ctx.lineTo(sx, y + y1 * zoom);
    }
    for (let j = y0; j <= y1; j++) {
      const sy = Math.round(y + j * zoom) + 0.5;
      ctx.moveTo(x + x0 * zoom, sy);
      ctx.lineTo(x + x1 * zoom, sy);
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(128, 128, 128, 0.45)';
    ctx.stroke();
    ctx.restore();
  }

  // Keeps the image in view: centred along a side it fits in, otherwise no further in
  // than a margin from either edge.
  private clamp(): void {
    const sw = app.doc.width * this.zoom;
    const sh = app.doc.height * this.zoom;
    const fit = (offset: number, size: number, room: number) =>
      size + MARGIN * 2 <= room ? (room - size) / 2 : Math.min(MARGIN, Math.max(room - size - MARGIN, offset));
    this.ox = fit(this.ox, sw, this.width);
    this.oy = fit(this.oy, sh, this.height);
  }

  // Zooms keeping the image point under (sx, sy) — CSS pixels in the workspace — in place.
  zoomTo(zoom: number, sx = this.width / 2, sy = this.height / 2): void {
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
    const ix = (sx - this.ox) / this.zoom;
    const iy = (sy - this.oy) / this.zoom;
    this.zoom = z;
    this.ox = sx - ix * z;
    this.oy = sy - iy * z;
    this.changed();
  }

  zoomStep(direction: 1 | -1, sx?: number, sy?: number): void {
    const next = direction > 0 ? ZOOMS.find((z) => z > this.zoom * 1.001) : [...ZOOMS].reverse().find((z) => z < this.zoom / 1.001);
    if (next) this.zoomTo(next, sx, sy);
  }

  fit(): void {
    const { width: w, height: h } = app.doc;
    this.zoom = Math.min(1, (this.width - MARGIN * 2) / w, (this.height - MARGIN * 2) / h);
    this.zoom = Math.max(MIN_ZOOM, this.zoom);
    this.ox = (this.width - w * this.zoom) / 2;
    this.oy = (this.height - h * this.zoom) / 2;
    this.changed();
  }

  actualSize(): void {
    this.zoomTo(1);
  }

  // Shows a rectangle of the image as large as fits.
  zoomToRect(x: number, y: number, w: number, h: number): void {
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(this.width / w, this.height / h) * 0.9));
    this.zoom = z;
    this.ox = this.width / 2 - (x + w / 2) * z;
    this.oy = this.height / 2 - (y + h / 2) * z;
    this.changed();
  }

  panBy(dx: number, dy: number): void {
    this.ox += dx;
    this.oy += dy;
    this.changed();
  }

  private changed(): void {
    this.clamp();
    this.requestDraw();
    app.emit('view');
  }

  updateCursor(): void {
    const tool = app.tool;
    let cursor = tool?.cursor ?? 'crosshair';
    if (this.mode === 'pan') cursor = 'grabbing';
    else if (this.space || tool?.id === 'pan') cursor = 'grab';
    this.canvas.style.cursor = cursor;
  }

  private event(e: PointerEvent, button: 0 | 2): ToolEvent {
    const p = this.toImage(e.clientX, e.clientY);
    return {
      x: p.x,
      y: p.y,
      button,
      shift: e.shiftKey,
      alt: e.altKey,
      mod: e.metaKey || e.ctrlKey,
      pressure: e.pointerType === 'pen' ? Math.max(0.05, e.pressure) : 1,
    };
  }

  private toolButton = 0 as 0 | 2;

  private onDown(e: PointerEvent): void {
    if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body && !app.tool?.id.startsWith('text')) {
      document.activeElement.blur();
    }
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.canvas.setPointerCapture(e.pointerId);
    if (e.pointerType === 'touch' && this.pointers.size === 2) {
      // A second finger turns a stroke just begun into a pinch.
      if (this.mode === 'tool') this.abortGesture();
      this.startPinch();
      return;
    }
    if (this.mode) return;
    e.preventDefault();
    this.last = { x: e.clientX, y: e.clientY };
    if (e.button === 1 || this.space || app.tool.id === 'pan') {
      this.mode = 'pan';
      this.updateCursor();
      return;
    }
    if (e.button !== 0 && e.button !== 2) return;
    this.mode = 'tool';
    this.toolPointer = e.pointerId;
    this.toolButton = e.button === 2 ? 2 : 0;
    app.tool.down?.(this.event(e, this.toolButton));
  }

  private onMove(e: PointerEvent): void {
    const p = this.toImage(e.clientX, e.clientY);
    this.cursor = p;
    if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.mode === 'pinch') {
      this.movePinch();
    } else if (this.mode === 'pan') {
      this.panBy(e.clientX - this.last.x, e.clientY - this.last.y);
      this.last = { x: e.clientX, y: e.clientY };
    } else if (this.mode === 'tool' && e.pointerId === this.toolPointer) {
      const events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
      for (const c of events.length ? events : [e]) app.tool.move?.(this.event(c, this.toolButton));
    } else if (!this.mode) {
      app.tool.hover?.(this.event(e, 0));
    }
    app.emit('view');
    if (app.tool.brushCursor || app.tool.hover) this.requestDraw();
  }

  private onUp(e: PointerEvent, cancelled = false): void {
    this.pointers.delete(e.pointerId);
    if (this.mode === 'pinch') {
      if (this.pointers.size < 2) this.mode = this.pointers.size ? 'pan' : null;
      const rest = [...this.pointers.values()][0];
      if (rest) this.last = rest;
      return;
    }
    if (this.mode === 'tool' && e.pointerId === this.toolPointer) {
      this.mode = null;
      if (cancelled) {
        this.abortGesture();
      } else {
        app.tool.up?.(this.event(e, this.toolButton));
      }
    } else if (this.mode === 'pan' && !this.pointers.size) {
      this.mode = null;
    }
    this.updateCursor();
  }

  // Breaks off a stroke or drag that has begun, leaving the tool as it was before it.
  abortGesture(): void {
    if (this.mode !== 'tool') return;
    this.mode = null;
    this.toolPointer = -1;
    const tool = app.tool;
    if (tool.abort) tool.abort();
    else tool.cancel?.();
    this.updateCursor();
  }

  private leave(): void {
    if (this.mode) return;
    this.cursor = null;
    app.tool.hover?.(null);
    app.emit('view');
    this.requestDraw();
  }

  private startPinch(): void {
    const [a, b] = [...this.pointers.values()];
    if (!a || !b) return;
    this.mode = 'pinch';
    const r = this.canvas.getBoundingClientRect();
    this.pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: this.zoom, mx: (a.x + b.x) / 2 - r.left, my: (a.y + b.y) / 2 - r.top };
  }

  private movePinch(): void {
    const [a, b] = [...this.pointers.values()];
    if (!a || !b) return;
    const r = this.canvas.getBoundingClientRect();
    const mx = (a.x + b.x) / 2 - r.left;
    const my = (a.y + b.y) / 2 - r.top;
    this.ox += mx - this.pinch.mx;
    this.oy += my - this.pinch.my;
    this.pinch.mx = mx;
    this.pinch.my = my;
    this.zoomTo((this.pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / this.pinch.distance, mx, my);
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const r = this.canvas.getBoundingClientRect();
    const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.height : 1;
    if (e.ctrlKey || e.metaKey) {
      // A trackpad pinch arrives as the wheel with Ctrl held, in small steps.
      this.zoomTo(this.zoom * Math.exp(-e.deltaY * scale * 0.0025 * (Math.abs(e.deltaY) < 50 ? 2 : 1)), e.clientX - r.left, e.clientY - r.top);
    } else if (e.shiftKey && !e.deltaX) {
      this.panBy(-e.deltaY * scale, 0);
    } else {
      this.panBy(-e.deltaX * scale, -e.deltaY * scale);
    }
  }
}

export function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target instanceof HTMLTextAreaElement || (target instanceof HTMLInputElement && !['checkbox', 'radio', 'range', 'button'].includes(target.type)) || target instanceof HTMLSelectElement)
  );
}
