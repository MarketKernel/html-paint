// Move selected pixels. The first drag lifts the selection's pixels (the whole layer when
// nothing is selected) off the layer; from then on they float, and can be dragged, scaled
// by the eight handles (Shift keeps the proportions) and rotated by dragging outside them
// (Shift: steps of 15°). They land on the layer when the tool is done with them — another
// tool, a command, Enter — as one step in the history; Esc puts them back.

import { N_, t } from '../../core/i18n';
import type { Rect } from '../../core/raster';
import { app } from '../app';
import { cloneCanvas, copyInto, clear } from '../canvas';
import type { Layer } from '../document';
import { Selection } from '../selection';
import type { Tool, ToolEvent } from './tool';

// Where the pixels are: their rectangle before the move, then an offset, a scale and an
// angle about its centre.
interface Frame {
  base: Rect;
  tx: number;
  ty: number;
  sx: number;
  sy: number;
  angle: number;
}

interface Float extends Frame {
  layer: Layer;
  canvas: HTMLCanvasElement;
  original: HTMLCanvasElement;
  selection: Selection | null;
  // Pasted rather than lifted: nothing was taken off the layer.
  pasted?: boolean;
}

type Grip = { kind: 'move' } | { kind: 'rotate' } | { kind: 'scale'; hx: number; hy: number };

let float: Float | null = null;
let drag: { grip: Grip; from: { x: number; y: number }; start: Frame; anchor: { x: number; y: number } } | null = null;

// Before anything is lifted, the handles sit around what would be.
function frame(): Frame {
  if (float) return float;
  const base = app.doc.selection?.bounds ?? { x: 0, y: 0, w: app.doc.width, h: app.doc.height };
  return { base: { ...base }, tx: 0, ty: 0, sx: 1, sy: 1, angle: 0 };
}

const HANDLES: [number, number][] = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
];

// Maps the floating canvas (its own pixels, 0 to w across) onto the image.
function matrixOf(f: Frame): DOMMatrix {
  const { x, y, w, h } = f.base;
  return new DOMMatrix()
    .translateSelf(x + w / 2 + f.tx, y + h / 2 + f.ty)
    .rotateSelf((f.angle * 180) / Math.PI)
    .scaleSelf(f.sx, f.sy)
    .translateSelf(-w / 2, -h / 2);
}

const isPlainMove = (f: Frame) => f.sx === 1 && f.sy === 1 && f.angle === 0;

function show(): void {
  if (!float) return;
  app.setLive({ kind: 'float', layer: float.layer, canvas: float.canvas, matrix: matrixOf(float), smooth: !isPlainMove(float) });
  const f = float;
  app.setStatus(
    isPlainMove(f)
      ? t('Offset {x}, {y}', { x: Math.round(f.tx), y: Math.round(f.ty) })
      : t('Size {w} × {h}, angle {a}°', { w: Math.round(Math.abs(f.base.w * f.sx)), h: Math.round(Math.abs(f.base.h * f.sy)), a: Math.round((f.angle * 180) / Math.PI) }),
  );
}

function lift(): Float {
  const layer = app.layer;
  const selection = app.doc.selection;
  const original = cloneCanvas(layer.canvas);
  let canvas: HTMLCanvasElement;
  let base: Rect;
  if (selection) {
    base = { ...selection.bounds };
    canvas = selection.extract(layer.canvas);
    selection.erase(layer.canvas);
  } else {
    base = { x: 0, y: 0, w: layer.canvas.width, h: layer.canvas.height };
    canvas = cloneCanvas(layer.canvas);
    clear(layer.canvas);
  }
  float = { layer, canvas, original, selection, base, tx: 0, ty: 0, sx: 1, sy: 1, angle: 0 };
  show();
  return float;
}

// The corners and edge midpoints of the floating pixels, on the image.
function handlePoints(f: Frame): { hx: number; hy: number; x: number; y: number }[] {
  const m = matrixOf(f);
  const { w, h } = f.base;
  return HANDLES.map(([hx, hy]) => {
    const p = new DOMPoint(((hx + 1) / 2) * w, ((hy + 1) / 2) * h).matrixTransform(m);
    return { hx, hy, x: p.x, y: p.y };
  });
}

function inside(f: Frame, x: number, y: number): boolean {
  const p = new DOMPoint(x, y).matrixTransform(matrixOf(f).inverse());
  return p.x >= 0 && p.y >= 0 && p.x <= f.base.w && p.y <= f.base.h;
}

function gripAt(x: number, y: number): Grip {
  const f = frame();
  const reach = 7 / app.view.zoom;
  const hit = handlePoints(f).find((p) => Math.abs(p.x - x) <= reach && Math.abs(p.y - y) <= reach);
  if (hit) return { kind: 'scale', hx: hit.hx, hy: hit.hy };
  return inside(f, x, y) ? { kind: 'move' } : { kind: 'rotate' };
}

const CURSORS: Record<string, string> = { '-1,-1': 'nwse-resize', '1,1': 'nwse-resize', '1,-1': 'nesw-resize', '-1,1': 'nesw-resize', '0,-1': 'ns-resize', '0,1': 'ns-resize', '-1,0': 'ew-resize', '1,0': 'ew-resize' };

function cursorFor(grip: Grip): string {
  if (grip.kind === 'scale') return CURSORS[`${grip.hx},${grip.hy}`] ?? 'move';
  return grip.kind === 'rotate' ? 'alias' : 'move';
}

function center(f: Frame): { x: number; y: number } {
  return { x: f.base.x + f.base.w / 2 + f.tx, y: f.base.y + f.base.h / 2 + f.ty };
}

function dragTo(e: ToolEvent): void {
  if (!float || !drag) return;
  const s = drag.start;
  const f = float;
  const dx = e.x - drag.from.x;
  const dy = e.y - drag.from.y;
  if (drag.grip.kind === 'move') {
    f.tx = s.tx + dx;
    f.ty = s.ty + dy;
    // A plain move stays on whole pixels, so nothing is resampled.
    if (isPlainMove(f)) {
      f.tx = Math.round(f.tx);
      f.ty = Math.round(f.ty);
    }
  } else if (drag.grip.kind === 'rotate') {
    const c = center(s);
    let angle = s.angle + Math.atan2(e.y - c.y, e.x - c.x) - Math.atan2(drag.from.y - c.y, drag.from.x - c.x);
    if (e.shift) angle = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12);
    f.angle = angle;
  } else {
    // In the floating pixels' own axes, the handle opposite the one dragged stays put.
    const { hx, hy } = drag.grip;
    const u = { x: Math.cos(s.angle), y: Math.sin(s.angle) };
    const v = { x: -Math.sin(s.angle), y: Math.cos(s.angle) };
    const a = drag.anchor;
    const du = (e.x - a.x) * u.x + (e.y - a.y) * u.y;
    const dv = (e.x - a.x) * v.x + (e.y - a.y) * v.y;
    const W0 = s.base.w * s.sx;
    const H0 = s.base.h * s.sy;
    let W = hx ? du * hx : W0;
    let H = hy ? dv * hy : H0;
    if (e.shift && hx && hy) {
      const k = Math.max(Math.abs(W / W0), Math.abs(H / H0));
      W = Math.sign(W || 1) * Math.abs(W0) * k;
      H = Math.sign(H || 1) * Math.abs(H0) * k;
    }
    // Whole pixels across and down, never less than one.
    W = Math.round(W) || (W < 0 ? -1 : 1);
    H = Math.round(H) || (H < 0 ? -1 : 1);
    f.sx = W / s.base.w;
    f.sy = H / s.base.h;
    const cx = a.x + u.x * ((hx * W) / 2) + v.x * ((hy * H) / 2);
    const cy = a.y + u.y * ((hx * W) / 2) + v.y * ((hy * H) / 2);
    // An edge handle leaves the other axis where it was.
    const keepU = hx ? 0 : 1;
    const keepV = hy ? 0 : 1;
    const c0 = center(s);
    const offU = ((c0.x - a.x) * u.x + (c0.y - a.y) * u.y) * keepU;
    const offV = ((c0.x - a.x) * v.x + (c0.y - a.y) * v.y) * keepV;
    f.tx = cx + u.x * offU + v.x * offV - (s.base.x + s.base.w / 2);
    f.ty = cy + u.y * offU + v.y * offV - (s.base.y + s.base.h / 2);
  }
  show();
}

// Puts the floating pixels down on the layer, as one step.
function land(): void {
  const f = float;
  if (!f) return;
  float = null;
  drag = null;
  app.setLive(null);
  app.setStatus('');
  const moved = f.pasted || f.tx !== 0 || f.ty !== 0 || !isPlainMove(f);
  // The layer goes back to how it was before the lift, and the whole move is redone as
  // one patch, so undo has the true "before".
  copyInto(f.layer.canvas, f.original);
  if (!moved) {
    app.markDirty();
    return;
  }
  const smooth = !isPlainMove(f);
  const m = matrixOf(f);
  const onImage = m.multiply(new DOMMatrix().translateSelf(-f.base.x, -f.base.y));
  // A pasted image is selected where it lands: its rectangle through the same matrix, so
  // a part that hung off the canvas before the move counts too.
  let selection: Selection | null = null;
  if (f.selection) selection = f.selection.transformed(onImage, smooth);
  else if (f.pasted) {
    const corners = [[0, 0], [f.base.w, 0], [f.base.w, f.base.h], [0, f.base.h]].map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));
    const path = new Path2D();
    corners.forEach((p, i) => (i ? path.lineTo(p.x, p.y) : path.moveTo(p.x, p.y)));
    path.closePath();
    selection = Selection.path(app.doc.width, app.doc.height, path, smooth);
  }
  const selects = Boolean(f.selection || f.pasted);
  app.patch(
    f.pasted ? N_('Paste') : N_('Move selected pixels'),
    f.pasted ? 'paste' : 'move',
    f.layer,
    null,
    () => {
      if (f.selection) f.selection.erase(f.layer.canvas);
      else if (!f.pasted) clear(f.layer.canvas);
      app.applyLive(f.layer.canvas, { kind: 'float', layer: f.layer, canvas: f.canvas, matrix: m, smooth });
    },
    selects ? selection : undefined,
  );
}

function putBack(): boolean {
  const f = float;
  if (!f) return false;
  float = null;
  drag = null;
  copyInto(f.layer.canvas, f.original);
  app.setLive(null);
  app.setStatus('');
  app.markDirty();
  return true;
}

export const movePixels: Tool = {
  id: 'move',
  label: N_('Move selected pixels'),
  hint: N_('Drag to move. Handles scale (Shift keeps proportions); drag outside to rotate. Enter applies, Esc puts back.'),
  key: 'M',
  icon: 'move',
  cursor: 'move',
  options: ['moveHint'],
  down(e) {
    if (float && float.layer !== app.layer) land();
    const grip = gripAt(e.x, e.y);
    const f = float ?? lift();
    const start: Frame = { base: f.base, tx: f.tx, ty: f.ty, sx: f.sx, sy: f.sy, angle: f.angle };
    let anchor = center(f);
    if (grip.kind === 'scale') {
      // An edge's opposite is an edge too; a corner's, a corner.
      const opposite = handlePoints(f).find((p) => p.hx === -grip.hx && p.hy === -grip.hy);
      if (opposite) anchor = { x: opposite.x, y: opposite.y };
    }
    drag = { grip, from: { x: e.x, y: e.y }, start, anchor };
  },
  move(e) {
    dragTo(e);
  },
  up(e) {
    dragTo(e);
    drag = null;
  },
  hover(e) {
    if (!e) return;
    app.view.canvas.style.cursor = cursorFor(gripAt(e.x, e.y));
  },
  keydown(e) {
    if (e.key === 'Enter') {
      land();
      return true;
    }
    if (e.key === 'Escape') return putBack();
    const step = e.shiftKey ? 10 : 1;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return false;
    const f = float ?? lift();
    f.tx += d[0]!;
    f.ty += d[1]!;
    show();
    return true;
  },
  commit: land,
  cancel: putBack,
  abort() {
    if (float && drag) Object.assign(float, drag.start);
    drag = null;
    show();
  },
  deactivate() {
    land();
  },
  overlay(ctx, px) {
    // Without a selection, the handles would sit on the edges of the image: left out.
    if (!float && !app.doc.selection) return;
    const f = frame();
    const pts = handlePoints(f);
    const corner = (hx: number, hy: number) => pts.find((p) => p.hx === hx && p.hy === hy)!;
    ctx.save();
    ctx.lineWidth = px;
    ctx.strokeStyle = '#2f6df6';
    ctx.beginPath();
    for (const [i, [hx, hy]] of ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).entries()) {
      const p = corner(hx, hy);
      if (i) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    const s = 4 * px;
    for (const p of pts) {
      ctx.fillRect(p.x - s, p.y - s, s * 2, s * 2);
      ctx.strokeRect(p.x - s, p.y - s, s * 2, s * 2);
    }
    ctx.restore();
  },
};

// A pasted image, floating over the current layer at (x, y) until it is put down.
export function floatPasted(image: HTMLCanvasElement, x: number, y: number): void {
  land();
  const layer = app.layer;
  float = { layer, canvas: cloneCanvas(image), original: cloneCanvas(layer.canvas), selection: null, pasted: true, base: { x, y, w: image.width, h: image.height }, tx: 0, ty: 0, sx: 1, sy: 1, angle: 0 };
  show();
}
