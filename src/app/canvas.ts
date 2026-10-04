// Small helpers over the 2D canvas the rest of the page draws with.

import type { Rect } from '../core/raster';

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(width));
  c.height = Math.max(1, Math.round(height));
  return c;
}

export function ctxOf(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('No 2D canvas');
  return ctx;
}

// A context back in its default state: whatever the last user left set is undone.
export function fresh(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = ctxOf(c);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.filter = 'none';
  ctx.setLineDash([]);
  return ctx;
}

export function clear(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = fresh(c);
  ctx.clearRect(0, 0, c.width, c.height);
  return ctx;
}

export function cloneCanvas(src: HTMLCanvasElement | ImageBitmap, width = src.width, height = src.height): HTMLCanvasElement {
  const c = createCanvas(width, height);
  ctxOf(c).drawImage(src, 0, 0);
  return c;
}

// Copies src into dst, which keeps its own size.
export function copyInto(dst: HTMLCanvasElement, src: CanvasImageSource): void {
  clear(dst).drawImage(src, 0, 0);
}

export const fullRect = (c: { width: number; height: number }): Rect => ({ x: 0, y: 0, w: c.width, h: c.height });

export function read(c: HTMLCanvasElement, r: Rect = fullRect(c)): ImageData {
  return ctxOf(c).getImageData(r.x, r.y, r.w, r.h);
}

// Every pixel's alpha snapped to 0 or 255, which is how a canvas path is drawn without
// antialiasing; the colour of a pixel kept is its own, made opaque.
export function harden(c: HTMLCanvasElement, r: Rect): void {
  if (r.w <= 0 || r.h <= 0) return;
  const ctx = ctxOf(c);
  const data = ctx.getImageData(r.x, r.y, r.w, r.h);
  const d = data.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i]! >= 128 ? 255 : 0;
  ctx.putImageData(data, r.x, r.y);
}

export function canvasToBlob(c: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((blob) => (blob ? resolve(blob) : reject(new Error(`Could not encode ${type}`))), type, quality),
  );
}

// A canvas pattern of grey and white squares, the usual sign of transparency.
export function checkerPattern(ctx: CanvasRenderingContext2D, size: number, dark: boolean): CanvasPattern {
  const tile = createCanvas(size * 2, size * 2);
  const t = ctxOf(tile);
  t.fillStyle = dark ? '#3a3a3a' : '#ffffff';
  t.fillRect(0, 0, size * 2, size * 2);
  t.fillStyle = dark ? '#2c2c2c' : '#d9d9d9';
  t.fillRect(0, 0, size, size);
  t.fillRect(size, size, size, size);
  return ctx.createPattern(tile, 'repeat')!;
}
