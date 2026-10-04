// Tools that paint along the pointer: the pencil, the paintbrush, the eraser, the
// airbrush and the clone stamp. A stroke is drawn opaque onto app.stroke and shown over
// the layer at the colour's opacity, so where a stroke crosses itself it does not get
// darker; on release it is committed as one step.

import { toCss, type RGBA } from '../../core/color';
import { N_, t } from '../../core/i18n';
import { inflate, linePixels, union, type Rect } from '../../core/raster';
import { app } from '../app';
import { clear, cloneCanvas, createCanvas, ctxOf } from '../canvas';
import type { Tool, ToolEvent } from './tool';

interface Point {
  x: number;
  y: number;
  pressure: number;
}

const opacity = () => app.settings.opacity / 100;

// Round dabs of a brush, by diameter, hardness, colour and antialiasing, so a stroke
// does not build its brush again for every dab.
const stamps = new Map<string, HTMLCanvasElement>();

function stamp(diameter: number, hardness: number, color: string, antialias: boolean): HTMLCanvasElement {
  const d = antialias ? Math.max(1, Math.round(diameter * 2) / 2) : Math.max(1, Math.round(diameter));
  const key = `${d}|${hardness}|${color}|${antialias}`;
  let c = stamps.get(key);
  if (c) return c;
  if (stamps.size > 96) stamps.clear();
  const size = Math.ceil(d) + 2;
  c = createCanvas(size, size);
  const ctx = ctxOf(c);
  const r = d / 2;
  const mid = size / 2;
  if (!antialias) {
    // Every pixel whose centre falls inside the circle, nothing in between.
    ctx.fillStyle = color;
    const o = Math.floor(mid - r);
    for (let y = 0; y < d; y++) {
      for (let x = 0; x < d; x++) {
        if ((x + 0.5 - r) ** 2 + (y + 0.5 - r) ** 2 <= r * r + 0.25) ctx.fillRect(o + x, o + y, 1, 1);
      }
    }
  } else {
    const g = ctx.createRadialGradient(mid, mid, 0, mid, mid, r);
    const hard = Math.min(0.99, hardness / 100);
    g.addColorStop(0, color);
    g.addColorStop(hard, color);
    g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(mid, mid, r, 0, Math.PI * 2);
    ctx.fill();
  }
  stamps.set(key, c);
  return c;
}

const opaque = (c: RGBA): string => toCss({ ...c, a: 255 });

// Draws a brush along segments onto app.stroke, keeping the rectangle it touched.
class Brush {
  rect: Rect | null = null;
  private last: Point | null = null;
  // How far along the path the next dab is due, for stamped brushes.
  private due = 0;

  constructor(
    private size: number,
    private hardness: number,
    private antialias: boolean,
    private color: string,
  ) {
    clear(app.stroke);
  }

  private touch(x: number, y: number, r: number): void {
    const box = inflate({ x: x - r, y: y - r, w: r * 2, h: r * 2 }, 2);
    this.rect = this.rect ? union(this.rect, box) : box;
  }

  private get smooth(): boolean {
    return this.antialias && this.hardness >= 100;
  }

  private dab(p: Point): void {
    const d = Math.max(1, this.size * p.pressure);
    const ctx = ctxOf(app.stroke);
    if (this.smooth) {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, d / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const s = stamp(d, this.hardness, this.color, this.antialias);
      const mid = s.width / 2;
      // A hard-edged dab lands on whole pixels, or its edge would blur after all.
      if (this.antialias) ctx.drawImage(s, p.x - mid, p.y - mid);
      else ctx.drawImage(s, Math.round(p.x - mid), Math.round(p.y - mid));
    }
    this.touch(p.x, p.y, d / 2 + 1);
  }

  to(p: Point): void {
    const last = this.last;
    this.last = p;
    if (!last) {
      this.dab(p);
      return;
    }
    const dist = Math.hypot(p.x - last.x, p.y - last.y);
    if (dist === 0) return;
    if (this.smooth) {
      const ctx = ctxOf(app.stroke);
      ctx.strokeStyle = this.color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(1, (this.size * (last.pressure + p.pressure)) / 2);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      this.touch(last.x, last.y, ctx.lineWidth / 2 + 1);
      this.touch(p.x, p.y, ctx.lineWidth / 2 + 1);
      return;
    }
    // Stamped: dabs at even spacing along the way, a fraction of the brush apart.
    const spacing = Math.max(1, this.size * (this.antialias ? 0.1 : 0.25));
    let along = this.due;
    while (along <= dist) {
      const k = along / dist;
      this.dab({ x: last.x + (p.x - last.x) * k, y: last.y + (p.y - last.y) * k, pressure: last.pressure + (p.pressure - last.pressure) * k });
      along += spacing;
    }
    this.due = along - dist;
  }
}

// The brush's outline under the pointer.
function brushOutline(ctx: CanvasRenderingContext2D, px: number, x: number, y: number, size: number): void {
  ctx.save();
  ctx.lineWidth = px;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(size / 2, px * 2), 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.stroke();
  ctx.setLineDash([3 * px, 3 * px]);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
  ctx.stroke();
  ctx.restore();
}

interface BrushToolSpec {
  id: string;
  label: string;
  hint: string;
  key: string;
  icon: string;
  mode: 'paint' | 'erase' | 'clone';
}

function brushTool(spec: BrushToolSpec): Tool {
  let brush: Brush | null = null;
  let color: RGBA | null = null;
  let hover: { x: number; y: number } | null = null;
  // The clone stamp's source: the point picked, then the offset from the first stroke's start.
  let source: { x: number; y: number } | null = null;
  let offset: { x: number; y: number } | null = null;

  const point = (e: ToolEvent): Point => ({ x: e.x, y: e.y, pressure: e.pressure });

  return {
    id: spec.id,
    label: spec.label,
    hint: spec.hint,
    key: spec.key,
    icon: spec.icon,
    options: spec.mode === 'clone' ? ['size', 'hardness', 'opacity', 'antialias', 'cloneHint'] : ['size', 'hardness', 'opacity', 'antialias'],
    brushCursor: true,
    down(e) {
      const s = app.settings;
      if (spec.mode === 'clone') {
        if (e.mod || e.alt) {
          source = { x: e.x, y: e.y };
          offset = null;
          app.setStatus(t('Source set. Now paint where the copy should go.'));
          app.view.requestDraw();
          return;
        }
        if (!source) {
          app.setStatus(t('First Ctrl+click (⌘+click on a Mac) where to copy from.'));
          return;
        }
        offset ??= { x: source.x - e.x, y: source.y - e.y };
      }
      color = app.colorFor(e.button);
      brush = new Brush(s.brushSize, s.hardness, s.antialias, spec.mode === 'paint' ? opaque(color) : 'rgba(0, 0, 0, 1)');
      const layer = app.layer;
      if (spec.mode === 'paint') app.setLive({ kind: 'paint', layer, canvas: app.stroke, alpha: (color.a / 255) * opacity() });
      else if (spec.mode === 'erase') app.setLive({ kind: 'paint', layer, canvas: app.stroke, alpha: opacity(), erase: true });
      else app.setLive({ kind: 'clone', layer, canvas: app.stroke, source: cloneCanvas(layer.canvas), dx: -Math.round(offset!.x), dy: -Math.round(offset!.y), alpha: opacity() });
      brush.to(point(e));
      app.setLive(app.live);
    },
    move(e) {
      hover = { x: e.x, y: e.y };
      if (!brush) return;
      brush.to(point(e));
      app.setLive(app.live);
    },
    up() {
      if (!brush) return;
      const names = { paint: N_('Paintbrush'), erase: N_('Eraser'), clone: N_('Clone stamp') };
      app.commitLive(names[spec.mode], spec.icon, brush.rect);
      if (spec.mode === 'paint' && color) app.useColor(color);
      brush = null;
    },
    hover(e) {
      hover = e && { x: e.x, y: e.y };
    },
    cancel() {
      if (!brush) return false;
      brush = null;
      app.setLive(null);
      return true;
    },
    overlay(ctx, px) {
      if (!hover) return;
      brushOutline(ctx, px, hover.x, hover.y, app.settings.brushSize);
      if (spec.mode === 'clone' && source) {
        const at = offset ? { x: hover.x + offset.x, y: hover.y + offset.y } : source;
        ctx.save();
        ctx.lineWidth = px;
        ctx.strokeStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(at.x - 6 * px, at.y);
        ctx.lineTo(at.x + 6 * px, at.y);
        ctx.moveTo(at.x, at.y - 6 * px);
        ctx.lineTo(at.x, at.y + 6 * px);
        ctx.stroke();
        ctx.restore();
        brushOutline(ctx, px, at.x, at.y, app.settings.brushSize);
      }
    },
  };
}

export const paintbrush = brushTool({ id: 'brush', label: N_('Paintbrush'), hint: N_('Left button: primary color, right button: secondary color.'), key: 'B', icon: 'brush', mode: 'paint' });

export const eraser = brushTool({ id: 'eraser', label: N_('Eraser'), hint: N_('Makes pixels transparent.'), key: 'E', icon: 'eraser', mode: 'erase' });

export const cloneStamp = brushTool({ id: 'clone', label: N_('Clone stamp'), hint: N_('Ctrl+click (⌘+click) picks the source, then paint to copy it.'), key: 'L', icon: 'clone', mode: 'clone' });

// One pixel, no antialiasing, as the pencil in Paint draws.
export const pencil: Tool = (() => {
  let last: { x: number; y: number } | null = null;
  let rect: Rect | null = null;
  let color: RGBA | null = null;
  const plot = (x: number, y: number) => {
    const ctx = ctxOf(app.stroke);
    for (const [px, py] of linePixels(last?.x ?? x, last?.y ?? y, x, y)) {
      ctx.fillRect(px, py, 1, 1);
      const box = { x: px, y: py, w: 1, h: 1 };
      rect = rect ? union(rect, box) : box;
    }
    last = { x, y };
  };
  return {
    id: 'pencil',
    label: N_('Pencil'),
    hint: N_('Draws single pixels. Left button: primary color, right button: secondary color.'),
    key: 'P',
    icon: 'pencil',
    options: [],
    down(e) {
      color = app.colorFor(e.button);
      clear(app.stroke).fillStyle = opaque(color);
      last = null;
      rect = null;
      app.setLive({ kind: 'paint', layer: app.layer, canvas: app.stroke, alpha: color.a / 255 });
      plot(e.x, e.y);
    },
    move(e) {
      if (!color) return;
      plot(e.x, e.y);
      app.setLive(app.live);
    },
    up() {
      if (!color) return;
      app.commitLive(N_('Pencil'), 'pencil', rect);
      app.useColor(color);
      color = null;
    },
    cancel() {
      if (!color) return false;
      color = null;
      app.setLive(null);
      return true;
    },
  };
})();

// Sprays dots around the pointer for as long as the button is held, even standing still.
export const airbrush: Tool = (() => {
  let at: { x: number; y: number } | null = null;
  let rect: Rect | null = null;
  let color: RGBA | null = null;
  let timer = 0;
  const spray = () => {
    if (!at) return;
    const s = app.settings;
    const r = s.brushSize / 2;
    const dot = Math.max(1, s.brushSize / 40);
    const count = Math.max(1, Math.round((s.density / 100) * s.brushSize * 0.8));
    const ctx = ctxOf(app.stroke);
    for (let i = 0; i < count; i++) {
      // Uniform over the disc: the square root keeps the edge from thinning out.
      const a = Math.random() * Math.PI * 2;
      const d = r * Math.sqrt(Math.random());
      ctx.fillRect(Math.floor(at.x + Math.cos(a) * d), Math.floor(at.y + Math.sin(a) * d), dot, dot);
    }
    const box = inflate({ x: at.x - r, y: at.y - r, w: r * 2, h: r * 2 }, dot + 1);
    rect = rect ? union(rect, box) : box;
    app.setLive(app.live);
  };
  return {
    id: 'airbrush',
    label: N_('Airbrush'),
    hint: N_('Sprays paint while the button is held.'),
    key: 'A',
    icon: 'airbrush',
    options: ['size', 'density', 'opacity'],
    brushCursor: true,
    down(e) {
      clearInterval(timer);
      color = app.colorFor(e.button);
      clear(app.stroke).fillStyle = opaque(color);
      rect = null;
      at = { x: e.x, y: e.y };
      app.setLive({ kind: 'paint', layer: app.layer, canvas: app.stroke, alpha: (color.a / 255) * opacity() });
      spray();
      timer = window.setInterval(spray, 30);
    },
    move(e) {
      if (!color) {
        at = { x: e.x, y: e.y };
        return;
      }
      at = { x: e.x, y: e.y };
    },
    up() {
      clearInterval(timer);
      if (!color) return;
      app.commitLive(N_('Airbrush'), 'airbrush', rect);
      app.useColor(color);
      color = null;
    },
    hover(e) {
      at = e && { x: e.x, y: e.y };
    },
    cancel() {
      clearInterval(timer);
      if (!color) return false;
      color = null;
      app.setLive(null);
      return true;
    },
    deactivate() {
      clearInterval(timer);
    },
    overlay(ctx, px) {
      if (at) brushOutline(ctx, px, at.x, at.y, app.settings.brushSize);
    },
  };
})();
