// Selection tools. The mode set in the toolbar applies unless a key says otherwise when
// the button goes down: Shift adds, Alt takes away, both keep only the overlap. A click
// without a drag deselects.

import { N_, t } from '../../core/i18n';
import { floodRegion } from '../../core/raster';
import { app } from '../app';
import { Selection, type SelectMode } from '../selection';
import { sampled } from './fill';
import type { Tool, ToolEvent } from './tool';

function modeOf(e: ToolEvent): SelectMode {
  if (e.shift && e.alt) return 'intersect';
  if (e.shift) return 'add';
  if (e.alt) return 'subtract';
  return app.settings.selectMode;
}

function apply(shape: Selection | null, mode: SelectMode, name: string, icon: string): void {
  app.finish();
  app.setSelection(Selection.combine(app.doc.selection, shape, mode), name, icon);
}

const deselect = () => app.setSelection(null, N_('Deselect'), 'deselect');

function sizeStatus(w: number, h: number): void {
  app.setStatus(t('Selection {w} × {h}', { w: Math.round(Math.abs(w)), h: Math.round(Math.abs(h)) }));
}

function boxTool(kind: 'rect' | 'ellipse'): Tool {
  let start: { x: number; y: number } | null = null;
  let end: { x: number; y: number } | null = null;
  let mode: SelectMode = 'replace';
  let square = false;

  // Whole pixels, so a rectangle's edges fall on pixel edges.
  const box = () => {
    if (!start || !end) return null;
    let w = end.x - start.x;
    let h = end.y - start.y;
    if (square) {
      const side = Math.max(Math.abs(w), Math.abs(h));
      w = Math.sign(w || 1) * side;
      h = Math.sign(h || 1) * side;
    }
    const x0 = Math.round(Math.min(start.x, start.x + w));
    const y0 = Math.round(Math.min(start.y, start.y + h));
    const x1 = Math.round(Math.max(start.x, start.x + w));
    const y1 = Math.round(Math.max(start.y, start.y + h));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };

  const path = (r: { x: number; y: number; w: number; h: number }) => {
    const p = new Path2D();
    if (kind === 'rect') p.rect(r.x, r.y, r.w, r.h);
    else p.ellipse(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, r.h / 2, 0, 0, Math.PI * 2);
    return p;
  };

  const name = kind === 'rect' ? N_('Rectangle select') : N_('Ellipse select');
  const icon = kind === 'rect' ? 'select-rect' : 'select-ellipse';

  return {
    id: icon,
    label: name,
    hint: N_('Drag to select. Shift adds, Alt subtracts; hold Shift after starting for a square.'),
    key: 'S',
    icon,
    options: ['selectMode'],
    down(e) {
      mode = modeOf(e);
      start = { x: e.x, y: e.y };
      end = start;
      square = false;
    },
    move(e) {
      if (!start) return;
      end = { x: e.x, y: e.y };
      // Shift held from the start means "add"; pressed during the drag it means a square.
      square = e.shift && mode !== 'add' && mode !== 'intersect';
      const r = box()!;
      sizeStatus(r.w, r.h);
      app.view.requestDraw();
    },
    up() {
      const r = box();
      start = end = null;
      app.setStatus('');
      if (!r || r.w < 1 || r.h < 1) {
        if (mode === 'replace') deselect();
        app.view.requestDraw();
        return;
      }
      const { width, height } = app.doc;
      const shape = kind === 'rect' ? Selection.rect(width, height, r) : Selection.path(width, height, path(r));
      apply(shape, mode, name, icon);
    },
    cancel() {
      if (!start) return false;
      start = end = null;
      app.view.requestDraw();
      return true;
    },
    overlay() {
      const r = box();
      if (r && (r.w || r.h)) app.view.strokeAnts(path(r));
    },
  };
}

export const rectSelect = boxTool('rect');
export const ellipseSelect = boxTool('ellipse');

function polygon(points: { x: number; y: number }[]): Path2D {
  const p = new Path2D();
  points.forEach((pt, i) => (i ? p.lineTo(pt.x, pt.y) : p.moveTo(pt.x, pt.y)));
  p.closePath();
  return p;
}

export const lasso: Tool = (() => {
  let points: { x: number; y: number }[] = [];
  let mode: SelectMode = 'replace';
  return {
    id: 'lasso',
    label: N_('Lasso select'),
    hint: N_('Draw around what to select. Shift adds, Alt subtracts.'),
    key: 'S',
    icon: 'lasso',
    options: ['selectMode'],
    down(e) {
      mode = modeOf(e);
      points = [{ x: e.x, y: e.y }];
    },
    move(e) {
      if (!points.length) return;
      const last = points[points.length - 1]!;
      if (Math.hypot(e.x - last.x, e.y - last.y) * app.view.zoom < 2) return;
      points.push({ x: e.x, y: e.y });
      app.view.requestDraw();
    },
    up() {
      const pts = points;
      points = [];
      if (pts.length < 3) {
        if (mode === 'replace') deselect();
        return;
      }
      apply(Selection.path(app.doc.width, app.doc.height, polygon(pts)), mode, N_('Lasso select'), 'lasso');
    },
    cancel() {
      if (!points.length) return false;
      points = [];
      app.view.requestDraw();
      return true;
    },
    overlay() {
      if (points.length > 1) app.view.strokeAnts(polygon(points));
    },
  };
})();

export const magicWand: Tool = {
  id: 'wand',
  label: N_('Magic wand'),
  hint: N_('Selects similar colors. Shift adds, Alt subtracts.'),
  key: 'W',
  icon: 'wand',
  options: ['selectMode', 'floodMode', 'tolerance', 'sampling'],
  down(e) {
    const s = app.settings;
    const pixels = sampled();
    const region = floodRegion(pixels, e.x, e.y, s.tolerance / 100, s.floodMode === 'contiguous');
    if (!region) return;
    apply(Selection.region(app.doc.width, app.doc.height, region), modeOf(e), N_('Magic wand'), 'wand');
  },
};

// Drags the selection's outline, leaving the pixels where they are.
export const moveSelection: Tool = (() => {
  let start: { x: number; y: number } | null = null;
  let offset = { x: 0, y: 0 };
  return {
    id: 'move-selection',
    label: N_('Move selection'),
    hint: N_('Drag to move the selection outline; the pixels stay. Arrow keys nudge it.'),
    key: 'M',
    icon: 'move-selection',
    cursor: 'move',
    options: [],
    down(e) {
      if (!app.doc.selection) return;
      start = { x: e.x, y: e.y };
      offset = { x: 0, y: 0 };
    },
    move(e) {
      if (!start) return;
      offset = { x: Math.round(e.x - start.x), y: Math.round(e.y - start.y) };
      app.setStatus(t('Offset {x}, {y}', offset));
      app.view.requestDraw();
    },
    up() {
      const selection = app.doc.selection;
      start = null;
      app.setStatus('');
      if (!selection || (!offset.x && !offset.y)) return;
      const moved = selection.translated(offset.x, offset.y);
      offset = { x: 0, y: 0 };
      app.setSelection(moved, N_('Move selection'), 'move-selection');
    },
    keydown(e) {
      const step = e.shiftKey ? 10 : 1;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      const selection = app.doc.selection;
      if (!d || !selection) return false;
      app.setSelection(selection.translated(d[0]!, d[1]!), N_('Move selection'), 'move-selection');
      return true;
    },
    cancel() {
      if (!start) return false;
      start = null;
      offset = { x: 0, y: 0 };
      app.view.requestDraw();
      return true;
    },
    overlay(ctx) {
      const selection = app.doc.selection;
      if (!start || !selection) return;
      ctx.save();
      ctx.translate(offset.x, offset.y);
      app.view.strokeAnts(selection.outline);
      ctx.restore();
    },
  };
})();
