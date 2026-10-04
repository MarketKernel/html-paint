// Lines, rectangles and ellipses, drawn by dragging. The outline is in the primary
// colour (secondary with the right button); a shape both outlined and filled is filled
// with the other one, as in Paint.NET. Shift makes a square, a circle or a line at a
// multiple of 15°; Alt draws from the centre.

import { toCss, type RGBA } from '../../core/color';
import { N_ } from '../../core/i18n';
import { inflate, type Rect } from '../../core/raster';
import { app } from '../app';
import { clear, harden } from '../canvas';
import { snap } from './fill';
import type { Tool, ToolEvent } from './tool';

type Kind = 'line' | 'rect' | 'ellipse';

const NAMES: Record<Kind, string> = { line: N_('Line'), rect: N_('Rectangle'), ellipse: N_('Ellipse') };

export function dashFor(width: number): number[] {
  switch (app.settings.dash) {
    case 'dash':
      return [width * 3, width * 2];
    case 'dot':
      return [0.001, width * 2];
    default:
      return [];
  }
}

export function arrowHead(ctx: CanvasRenderingContext2D, tip: { x: number; y: number }, from: { x: number; y: number }, width: number): void {
  const size = Math.max(8, width * 3.5);
  const angle = Math.atan2(tip.y - from.y, tip.x - from.x);
  ctx.beginPath();
  ctx.moveTo(tip.x + Math.cos(angle) * width * 0.5, tip.y + Math.sin(angle) * width * 0.5);
  ctx.lineTo(tip.x - Math.cos(angle - 0.45) * size, tip.y - Math.sin(angle - 0.45) * size);
  ctx.lineTo(tip.x - Math.cos(angle + 0.45) * size, tip.y - Math.sin(angle + 0.45) * size);
  ctx.closePath();
  ctx.fill();
}

function shapeTool(kind: Kind, key: string, hint: string): Tool {
  let start: { x: number; y: number } | null = null;
  let end: { x: number; y: number } | null = null;
  let mods = { shift: false, alt: false };
  let button: 0 | 2 = 0;
  let rect: Rect | null = null;

  // A stroke of odd width sits on pixel centres, an even one on pixel edges: both crisp.
  const align = (v: number, width: number) => (width % 2 === 1 ? Math.floor(v) + 0.5 : Math.round(v));

  const draw = () => {
    if (!start || !end) return;
    const s = app.settings;
    const width = s.brushSize;
    // Without antialiasing every pixel is all in or all out, so the shape is drawn opaque
    // and shown at the outline colour's opacity, as the brushes are.
    const solid = (c: RGBA): RGBA => (s.antialias ? c : { ...c, a: 255 });
    const outline: RGBA = solid(app.colorFor(button));
    const fill: RGBA = s.shapeStyle === 'both' ? solid(app.colorFor(button === 0 ? 2 : 0)) : outline;
    const alpha = s.antialias ? 1 : app.colorFor(button).a / 255;
    const ctx = clear(app.stroke);
    ctx.lineWidth = width;
    ctx.lineCap = s.dash === 'dot' ? 'round' : kind === 'line' ? 'round' : 'butt';
    ctx.lineJoin = s.radius > 0 ? 'round' : 'miter';
    ctx.setLineDash(dashFor(width));
    ctx.strokeStyle = toCss(outline);
    ctx.fillStyle = toCss(fill);

    if (kind === 'line') {
      const a = { x: align(start.x, width), y: align(start.y, width) };
      const p = snap(start, end, mods.shift);
      const b = { x: align(p.x, width), y: align(p.y, width) };
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.fillStyle = toCss(outline);
      if (s.arrows !== 'none') arrowHead(ctx, b, a, width);
      if (s.arrows === 'both') arrowHead(ctx, a, b, width);
      const reach = Math.max(8, width * 3.5) + width;
      rect = inflate({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) }, reach);
    } else {
      let w = end.x - start.x;
      let h = end.y - start.y;
      if (mods.shift) {
        const side = Math.max(Math.abs(w), Math.abs(h));
        w = Math.sign(w || 1) * side;
        h = Math.sign(h || 1) * side;
      }
      let x0 = start.x;
      let y0 = start.y;
      if (mods.alt) {
        x0 -= w;
        y0 -= h;
        w *= 2;
        h *= 2;
      }
      const left = Math.round(Math.min(x0, x0 + w));
      const top = Math.round(Math.min(y0, y0 + h));
      const right = Math.round(Math.max(x0, x0 + w));
      const bottom = Math.round(Math.max(y0, y0 + h));
      // The outline stays inside the rectangle dragged out, as wide as it is.
      const inset = s.shapeStyle === 'fill' ? 0 : width / 2;
      const bx = left + inset;
      const by = top + inset;
      const bw = Math.max(0, right - left - inset * 2);
      const bh = Math.max(0, bottom - top - inset * 2);
      const path = new Path2D();
      if (kind === 'rect') {
        if (s.radius > 0) path.roundRect(bx, by, bw, bh, Math.min(s.radius, bw / 2, bh / 2));
        else path.rect(bx, by, bw, bh);
      } else {
        path.ellipse(bx + bw / 2, by + bh / 2, bw / 2, bh / 2, 0, 0, Math.PI * 2);
      }
      if (s.shapeStyle !== 'outline') ctx.fill(path);
      if (s.shapeStyle !== 'fill') ctx.stroke(path);
      rect = inflate({ x: left, y: top, w: right - left, h: bottom - top }, 2);
    }
    if (!s.antialias && rect) harden(app.stroke, intersectDoc(rect));
    app.setLive({ kind: 'paint', layer: app.layer, canvas: app.stroke, alpha });
    app.setStatus(`${Math.round(Math.abs(end.x - start.x))} × ${Math.round(Math.abs(end.y - start.y))}`);
  };

  const track = (e: ToolEvent) => {
    end = { x: e.x, y: e.y };
    mods = { shift: e.shift, alt: e.alt };
    draw();
  };

  return {
    id: kind,
    label: NAMES[kind],
    hint,
    key,
    icon: kind,
    options: kind === 'line' ? ['size', 'dash', 'arrows', 'antialias'] : kind === 'rect' ? ['size', 'shapeStyle', 'dash', 'radius', 'antialias'] : ['size', 'shapeStyle', 'dash', 'antialias'],
    down(e) {
      button = e.button;
      start = { x: e.x, y: e.y };
      track(e);
    },
    move(e) {
      if (start) track(e);
    },
    up(e) {
      if (!start) return;
      track(e);
      app.commitLive(NAMES[kind], kind, rect);
      app.useColor(app.colorFor(button));
      start = end = null;
      app.setStatus('');
    },
    cancel() {
      if (!start) return false;
      start = end = null;
      app.setLive(null);
      return true;
    },
    optionsChanged() {
      if (start) draw();
    },
  };
}

export function intersectDoc(r: Rect): Rect {
  const x = Math.max(0, r.x);
  const y = Math.max(0, r.y);
  return { x, y, w: Math.max(0, Math.min(app.doc.width, r.x + r.w) - x), h: Math.max(0, Math.min(app.doc.height, r.y + r.h) - y) };
}

export const line = shapeTool('line', 'O', N_('Drag to draw a line. Shift snaps the angle to 15°.'));
export const rectangle = shapeTool('rect', 'O', N_('Drag to draw a rectangle. Shift: a square, Alt: from the center.'));
export const ellipse = shapeTool('ellipse', 'O', N_('Drag to draw an ellipse. Shift: a circle, Alt: from the center.'));
