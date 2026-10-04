// Pixel geometry with no canvas: the flood fill behind the paint bucket and the magic wand,
// pencil lines, mask outlines and rectangles.

import { distance, type RGBA } from './color';

export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Region {
  // 255 where taken, 0 elsewhere, one byte a pixel.
  mask: Uint8Array;
  bounds: Rect;
}

export const pixelAt = (p: Pixels, x: number, y: number): RGBA => {
  const i = (y * p.width + x) * 4;
  return { r: p.data[i]!, g: p.data[i + 1]!, b: p.data[i + 2]!, a: p.data[i + 3]! };
};

// tolerance is 0–1: 0 takes only the very colour clicked, 1 takes everything.
export function floodRegion(p: Pixels, x: number, y: number, tolerance: number, contiguous: boolean): Region | null {
  const { width: w, height: h, data } = p;
  x = Math.floor(x);
  y = Math.floor(y);
  if (x < 0 || y < 0 || x >= w || y >= h) return null;
  const seed = pixelAt(p, x, y);
  const mask = new Uint8Array(w * h);
  // A tolerance of 0 must still take the colour itself despite rounding.
  const limit = tolerance * tolerance + 1e-9;
  const near = (i: number): boolean => {
    const o = i * 4;
    const a = data[o + 3]!;
    if (a === 0 && seed.a === 0) return true;
    const d = distance(seed, { r: data[o]!, g: data[o + 1]!, b: data[o + 2]!, a });
    return d * d <= limit;
  };

  let minX = x;
  let maxX = x;
  let minY = y;
  let maxY = y;
  const grow = (px: number, py: number) => {
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  };

  if (!contiguous) {
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const i = py * w + px;
        if (near(i)) {
          mask[i] = 255;
          grow(px, py);
        }
      }
    }
  } else {
    // Scanline fill: each run is filled left and right as far as it goes, and the rows
    // above and below are searched for runs that start a new span.
    const stack: number[] = [x, y];
    while (stack.length) {
      const sy = stack.pop()!;
      const sx = stack.pop()!;
      const row = sy * w;
      if (mask[row + sx] || !near(row + sx)) continue;
      let left = sx;
      while (left > 0 && !mask[row + left - 1] && near(row + left - 1)) left--;
      let right = sx;
      while (right < w - 1 && !mask[row + right + 1] && near(row + right + 1)) right++;
      mask.fill(255, row + left, row + right + 1);
      grow(left, sy);
      grow(right, sy);
      for (const ny of [sy - 1, sy + 1]) {
        if (ny < 0 || ny >= h) continue;
        const nrow = ny * w;
        let open = false;
        for (let nx = left; nx <= right; nx++) {
          const take = !mask[nrow + nx] && near(nrow + nx);
          if (take && !open) stack.push(nx, ny);
          open = take;
        }
      }
    }
  }
  return { mask, bounds: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } };
}

// The points between two pixels, both included, as a one-pixel pencil sets them.
export function linePixels(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  x0 = Math.floor(x0);
  y0 = Math.floor(y0);
  x1 = Math.floor(x1);
  y1 = Math.floor(y1);
  const out: [number, number][] = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    out.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
  return out;
}

// The outline of a mask as horizontal and vertical segments along pixel edges, joined into
// runs, for marching ants: [x0, y0, x1, y1, …]. A pixel is inside from half opacity up.
export function maskOutline(alpha: Uint8Array | Uint8ClampedArray, w: number, h: number, stride = 1, offset = 0): number[] {
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && alpha[(y * w + x) * stride + offset]! >= 128;
  const out: number[] = [];
  // Horizontal edges: between row y-1 and row y.
  for (let y = 0; y <= h; y++) {
    let start = -1;
    for (let x = 0; x <= w; x++) {
      const edge = x < w && inside(x, y - 1) !== inside(x, y);
      if (edge && start < 0) start = x;
      if (!edge && start >= 0) {
        out.push(start, y, x, y);
        start = -1;
      }
    }
  }
  // Vertical edges: between column x-1 and column x.
  for (let x = 0; x <= w; x++) {
    let start = -1;
    for (let y = 0; y <= h; y++) {
      const edge = y < h && inside(x - 1, y) !== inside(x, y);
      if (edge && start < 0) start = y;
      if (!edge && start >= 0) {
        out.push(x, start, x, y);
        start = -1;
      }
    }
  }
  return out;
}

// The smallest rectangle holding every pixel at or above the threshold, or null for none.
export function alphaBounds(alpha: Uint8Array | Uint8ClampedArray, w: number, h: number, stride = 1, offset = 0, threshold = 1): Rect | null {
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      if (alpha[(row + x) * stride + offset]! >= threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

export function intersect(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const r = Math.min(a.x + a.w, b.x + b.w);
  const bottom = Math.min(a.y + a.h, b.y + b.h);
  return r > x && bottom > y ? { x, y, w: r - x, h: bottom - y } : null;
}

export function union(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

// Grown to whole pixels and by a margin, a brush's reach for instance.
export function inflate(r: Rect, by: number): Rect {
  const x = Math.floor(r.x - by);
  const y = Math.floor(r.y - by);
  return { x, y, w: Math.ceil(r.x + r.w + by) - x, h: Math.ceil(r.y + r.h + by) - y };
}
