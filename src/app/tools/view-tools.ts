// Tools that look rather than paint: the colour picker, the zoom and the hand.

import { N_ } from '../../core/i18n';
import { pixelAt } from '../../core/raster';
import { app } from '../app';
import { ctxOf } from '../canvas';
import type { Tool, ToolEvent } from './tool';

function pick(e: ToolEvent): void {
  const x = Math.floor(e.x);
  const y = Math.floor(e.y);
  if (x < 0 || y < 0 || x >= app.doc.width || y >= app.doc.height) return;
  const source = app.settings.sampling === 'image' ? app.composite() : app.layer.canvas;
  const data = ctxOf(source).getImageData(x, y, 1, 1);
  app.setColor(e.button === 2 ? 'secondary' : 'primary', pixelAt({ data: data.data, width: 1, height: 1 }, 0, 0));
}

export const picker: Tool = {
  id: 'picker',
  label: N_('Color picker'),
  hint: N_('Click to take a color: left button for the primary, right button for the secondary.'),
  key: 'K',
  icon: 'picker',
  options: ['sampling', 'pickerAfter'],
  down: pick,
  move: pick,
  up() {
    if (app.settings.pickerAfter === 'previous' && app.previousTool) app.setTool(app.previousTool.id);
  },
};

export const zoom: Tool = (() => {
  let start: { x: number; y: number } | null = null;
  let end: { x: number; y: number } | null = null;
  return {
    id: 'zoom',
    label: N_('Zoom'),
    hint: N_('Click to zoom in, right-click or Alt+click to zoom out, drag to zoom to a rectangle.'),
    key: 'Z',
    icon: 'zoom',
    cursor: 'zoom-in',
    options: [],
    down(e) {
      start = end = { x: e.x, y: e.y };
    },
    move(e) {
      if (!start) return;
      end = { x: e.x, y: e.y };
      app.view.requestDraw();
    },
    up(e) {
      const a = start;
      const b = end;
      start = end = null;
      if (!a || !b) return;
      const view = app.view;
      const w = Math.abs(b.x - a.x);
      const h = Math.abs(b.y - a.y);
      if (w * view.zoom > 6 && h * view.zoom > 6) {
        view.zoomToRect(Math.min(a.x, b.x), Math.min(a.y, b.y), w, h);
        return;
      }
      const p = view.toScreen(e.x, e.y);
      view.zoomStep(e.button === 2 || e.alt ? -1 : 1, p.x, p.y);
    },
    cancel() {
      if (!start) return false;
      start = end = null;
      return true;
    },
    overlay(ctx, px) {
      if (!start || !end) return;
      ctx.save();
      ctx.lineWidth = px;
      ctx.strokeStyle = '#2f6df6';
      ctx.fillStyle = 'rgba(47, 109, 246, 0.12)';
      ctx.fillRect(start.x, start.y, end.x - start.x, end.y - start.y);
      ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
      ctx.restore();
    },
  };
})();

// The view does the panning itself for this tool, as it does for the space bar.
export const pan: Tool = {
  id: 'pan',
  label: N_('Pan'),
  hint: N_('Drag to scroll the image. The space bar or the middle button pans with any tool.'),
  key: 'H',
  icon: 'pan',
  cursor: 'grab',
  options: [],
};
