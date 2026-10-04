// A cubic Bézier curve, drawn as Paint.NET draws one: drag out a line, then bend it by
// its two control points — the handles a third and two thirds of the way along. The ends
// can be dragged too. The curve stays editable until Enter, a click away from its
// handles (which starts the next curve), another tool or a command puts it on the layer;
// Esc throws it away. Shift while dragging a handle keeps it at a multiple of 15° from
// the end it belongs to.

import { toCss, type RGBA } from '../../core/color';
import { N_ } from '../../core/i18n';
import { inflate, type Rect } from '../../core/raster';
import { app } from '../app';
import { clear, harden } from '../canvas';
import { snap } from './fill';
import { arrowHead, dashFor, intersectDoc } from './shapes';
import type { Tool, ToolEvent } from './tool';

interface Point {
  x: number;
  y: number;
}

// The ends and the control points: p[0] and p[3] are the ends, p[1] and p[2] bend it.
let points: Point[] | null = null;
let button: 0 | 2 = 0;
let rect: Rect | null = null;
// What a drag moves: a point by index, or -1 while the first line is drawn (moving p[3]
// and keeping the controls on the line); the points as they were, for an abort.
let drag: { index: number; before: Point[] } | null = null;

const at = (a: Point, b: Point, k: number): Point => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });

function draw(): void {
  if (!points) return;
  const [p0, p1, p2, p3] = points as [Point, Point, Point, Point];
  const s = app.settings;
  const width = s.brushSize;
  // As for the other shapes: without antialiasing, opaque and shown at the colour's opacity.
  const color: RGBA = app.colorFor(button);
  const ctx = clear(app.stroke);
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash(dashFor(width));
  ctx.strokeStyle = toCss(s.antialias ? color : { ...color, a: 255 });
  ctx.fillStyle = ctx.strokeStyle;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
  ctx.stroke();
  // An arrow points along the curve where it ends: from the nearest control point that
  // is not on top of the end.
  const toward = (end: Point, ...others: Point[]) => others.find((o) => Math.hypot(o.x - end.x, o.y - end.y) > 0.5) ?? end;
  if (s.arrows !== 'none') arrowHead(ctx, p3, toward(p3, p2, p1, p0), width);
  if (s.arrows === 'both') arrowHead(ctx, p0, toward(p0, p1, p2, p3), width);
  // The curve stays inside the hull of its four points.
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  rect = inflate({ x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }, Math.max(8, width * 3.5) + width);
  if (!s.antialias) harden(app.stroke, intersectDoc(rect));
  app.setLive({ kind: 'paint', layer: app.layer, canvas: app.stroke, alpha: s.antialias ? 1 : color.a / 255 });
}

function handleAt(e: ToolEvent): number {
  if (!points) return -1;
  const reach = 8 / app.view.zoom;
  // The control points first: at the start they may sit close to the ends.
  for (const i of [1, 2, 0, 3]) {
    const p = points[i]!;
    if (Math.abs(p.x - e.x) <= reach && Math.abs(p.y - e.y) <= reach) return i;
  }
  return -1;
}

function finish(): void {
  if (!points) return;
  const color = app.colorFor(button);
  points = null;
  drag = null;
  app.commitLive(N_('Curve'), 'curve', rect);
  app.useColor(color);
}

function discard(): boolean {
  if (!points) return false;
  points = null;
  drag = null;
  app.setLive(null);
  return true;
}

export const curve: Tool = {
  id: 'curve',
  label: N_('Curve'),
  hint: N_('Drag to draw a line, then drag its handles to bend it. Enter or a click elsewhere applies, Esc cancels.'),
  key: 'O',
  icon: 'curve',
  options: ['size', 'dash', 'arrows', 'antialias'],
  down(e) {
    const index = handleAt(e);
    if (points && index >= 0) {
      drag = { index, before: points.map((p) => ({ ...p })) };
      return;
    }
    finish();
    button = e.button;
    const p = { x: e.x, y: e.y };
    points = [p, { ...p }, { ...p }, { ...p }];
    drag = { index: -1, before: [] };
    draw();
  },
  move(e) {
    if (!points || !drag) return;
    if (drag.index < 0) {
      const p0 = points[0]!;
      const p3 = snap(p0, e, e.shift);
      points = [p0, at(p0, p3, 1 / 3), at(p0, p3, 2 / 3), p3];
    } else {
      // A control point snaps about the end it belongs to, an end about the other end.
      const anchor = points[drag.index === 1 ? 0 : drag.index === 2 ? 3 : 3 - drag.index]!;
      points[drag.index] = snap(anchor, e, e.shift);
    }
    draw();
  },
  up() {
    if (!points || !drag) return;
    // A click without a drag draws nothing.
    if (drag.index < 0 && Math.hypot(points[3]!.x - points[0]!.x, points[3]!.y - points[0]!.y) < 1) discard();
    drag = null;
  },
  hover(e) {
    if (e) app.view.canvas.style.cursor = handleAt(e) >= 0 ? 'move' : 'crosshair';
  },
  keydown(e) {
    if (!points) return false;
    if (e.key === 'Enter') {
      finish();
      return true;
    }
    if (e.key === 'Escape') return discard();
    return false;
  },
  commit: finish,
  cancel: discard,
  deactivate: finish,
  abort() {
    if (!drag) return;
    if (drag.index < 0) discard();
    else {
      points = drag.before;
      drag = null;
      draw();
    }
  },
  optionsChanged: draw,
  overlay(ctx, px) {
    if (!points || (drag && drag.index < 0)) return;
    const [p0, p1, p2, p3] = points as [Point, Point, Point, Point];
    ctx.save();
    ctx.lineWidth = px;
    ctx.strokeStyle = '#2f6df6';
    ctx.setLineDash([4 * px, 3 * px]);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.moveTo(p3.x, p3.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#fff';
    const r = 4.5 * px;
    // Ends as squares, control points as circles.
    for (const p of [p0, p3]) {
      ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
      ctx.strokeRect(p.x - r, p.y - r, r * 2, r * 2);
    }
    ctx.fillStyle = '#2f6df6';
    for (const p of [p1, p2]) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.stroke();
    }
    ctx.restore();
  },
};
