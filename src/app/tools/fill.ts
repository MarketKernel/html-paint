// The paint bucket and the gradient.

import { toCss, type RGBA } from '../../core/color';
import { N_ } from '../../core/i18n';
import { floodRegion } from '../../core/raster';
import { app } from '../app';
import { clear, read } from '../canvas';
import type { Tool } from './tool';

// The pixels the bucket and the wand look at: the layer's own, or the whole image's.
export function sampled(): ImageData {
  return read(app.settings.sampling === 'image' ? app.composite() : app.layer.canvas);
}

export const bucket: Tool = {
  id: 'fill',
  label: N_('Paint bucket'),
  hint: N_('Fills similar colors with the primary color; right button: secondary color.'),
  key: 'F',
  icon: 'fill',
  options: ['floodMode', 'tolerance', 'sampling', 'antialias'],
  down(e) {
    const s = app.settings;
    const pixels = sampled();
    const region = floodRegion(pixels, e.x, e.y, s.tolerance / 100, s.floodMode === 'contiguous');
    if (!region) return;
    const color = app.colorFor(e.button);
    const { x, y, w, h } = region.bounds;
    const data = new ImageData(w, h);
    const { width } = pixels;
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        if (!region.mask[(py + y) * width + px + x]) continue;
        data.data.set([color.r, color.g, color.b, 255], (py * w + px) * 4);
      }
    }
    const ctx = clear(app.stroke);
    ctx.putImageData(data, x, y);
    // An antialiased fill softens its edge by half a pixel, so it meets an antialiased
    // outline without a seam.
    if (s.antialias) {
      ctx.globalCompositeOperation = 'destination-over';
      ctx.filter = 'blur(0.5px)';
      ctx.drawImage(app.stroke, 0, 0);
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'source-over';
    }
    app.setLive({ kind: 'paint', layer: app.layer, canvas: app.stroke, alpha: color.a / 255 });
    app.commitLive(N_('Paint bucket'), 'fill', { x: x - 2, y: y - 2, w: w + 4, h: h + 4 });
    app.useColor(color);
  },
};

// A gradient between two points, from the primary colour to the secondary one (the
// other way round with the right button). Shift keeps the line to steps of 15°.
export const gradient: Tool = (() => {
  let from: { x: number; y: number } | null = null;
  let to: { x: number; y: number } | null = null;
  let colors: [RGBA, RGBA] = [app.primary, app.secondary];

  const draw = () => {
    if (!from || !to) return;
    const ctx = clear(app.stroke);
    const [a, b] = colors.map(toCss) as [string, string];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    let g: CanvasGradient;
    switch (app.settings.gradient) {
      case 'reflected':
        g = ctx.createLinearGradient(from.x - dx, from.y - dy, to.x, to.y);
        g.addColorStop(0, b);
        g.addColorStop(0.5, a);
        g.addColorStop(1, b);
        break;
      case 'radial':
        g = ctx.createRadialGradient(from.x, from.y, 0, from.x, from.y, Math.max(0.5, Math.hypot(dx, dy)));
        g.addColorStop(0, a);
        g.addColorStop(1, b);
        break;
      case 'conic':
        g = ctx.createConicGradient(Math.atan2(dy, dx), from.x, from.y);
        g.addColorStop(0, a);
        g.addColorStop(1, b);
        break;
      default:
        g = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
        g.addColorStop(0, a);
        g.addColorStop(1, b);
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, app.stroke.width, app.stroke.height);
    app.setLive({ kind: 'paint', layer: app.layer, canvas: app.stroke, alpha: 1 });
  };

  return {
    id: 'gradient',
    label: N_('Gradient'),
    hint: N_('Drag to draw a gradient from the primary to the secondary color. Shift snaps the angle.'),
    key: 'G',
    icon: 'gradient',
    options: ['gradient'],
    down(e) {
      colors = e.button === 2 ? [app.secondary, app.primary] : [app.primary, app.secondary];
      from = { x: e.x, y: e.y };
      to = { x: e.x + 1, y: e.y };
      draw();
    },
    move(e) {
      if (!from) return;
      to = snap(from, e, e.shift);
      draw();
    },
    up() {
      if (!from) return;
      app.commitLive(N_('Gradient'), 'gradient', null);
      from = to = null;
    },
    cancel() {
      if (!from) return false;
      from = to = null;
      app.setLive(null);
      return true;
    },
    optionsChanged() {
      if (from) draw();
    },
    overlay(ctx, px) {
      if (!from || !to) return;
      ctx.save();
      ctx.lineWidth = px * 1.5;
      ctx.strokeStyle = '#fff';
      ctx.fillStyle = '#2f6df6';
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      for (const p of [from, to]) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 * px, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    },
  };
})();

// The point, moved onto the nearest line from `from` at a multiple of 15° when asked.
export function snap(from: { x: number; y: number }, p: { x: number; y: number }, on: boolean): { x: number; y: number } {
  if (!on) return { x: p.x, y: p.y };
  const step = Math.PI / 12;
  const angle = Math.round(Math.atan2(p.y - from.y, p.x - from.x) / step) * step;
  const d = Math.hypot(p.x - from.x, p.y - from.y);
  return { x: from.x + Math.cos(angle) * d, y: from.y + Math.sin(angle) * d };
}

