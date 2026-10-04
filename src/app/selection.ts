// A selection is a mask the size of the image: white where selected, transparent
// elsewhere, partly opaque along an antialiased edge. Painting is clipped to it by
// drawing it with destination-in. Selections never change once made — combining,
// inverting or moving one makes a new one — so the history can keep them by reference.

import { alphaBounds, maskOutline, union, type Rect, type Region } from '../core/raster';
import { clear, createCanvas, ctxOf, fresh } from './canvas';

export const SELECT_MODES = ['replace', 'add', 'subtract', 'intersect'] as const;
export type SelectMode = (typeof SELECT_MODES)[number];

export class Selection {
  private path: Path2D | null = null;

  private constructor(
    readonly mask: HTMLCanvasElement,
    readonly bounds: Rect,
  ) {}

  get width(): number {
    return this.mask.width;
  }

  get height(): number {
    return this.mask.height;
  }

  // Scans the mask for its bounds, or returns null when nothing is selected. `within`
  // limits the scan to where the mask can have anything.
  static fromMask(mask: HTMLCanvasElement, within?: Rect): Selection | null {
    const r = clipRect(within ?? { x: 0, y: 0, w: mask.width, h: mask.height }, mask.width, mask.height);
    if (!r) return null;
    const data = ctxOf(mask).getImageData(r.x, r.y, r.w, r.h);
    const b = alphaBounds(data.data, r.w, r.h, 4, 3);
    return b ? new Selection(mask, { x: b.x + r.x, y: b.y + r.y, w: b.w, h: b.h }) : null;
  }

  static rect(width: number, height: number, r: Rect): Selection | null {
    const c = clipRect(r, width, height);
    if (!c) return null;
    const mask = createCanvas(width, height);
    const ctx = ctxOf(mask);
    ctx.fillStyle = '#fff';
    ctx.fillRect(c.x, c.y, c.w, c.h);
    return new Selection(mask, c);
  }

  static all(width: number, height: number): Selection {
    return Selection.rect(width, height, { x: 0, y: 0, w: width, h: height })!;
  }

  static path(width: number, height: number, path: Path2D, antialias = true): Selection | null {
    const mask = createCanvas(width, height);
    const ctx = ctxOf(mask);
    ctx.fillStyle = '#fff';
    ctx.fill(path, 'evenodd');
    if (!antialias) {
      const data = ctx.getImageData(0, 0, width, height);
      for (let i = 3; i < data.data.length; i += 4) data.data[i] = data.data[i]! >= 128 ? 255 : 0;
      ctx.putImageData(data, 0, 0);
    }
    return Selection.fromMask(mask);
  }

  static region(width: number, height: number, region: Region): Selection | null {
    const { x, y, w, h } = region.bounds;
    const mask = createCanvas(width, height);
    const data = new ImageData(w, h);
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        if (!region.mask[(py + y) * width + px + x]) continue;
        data.data.fill(255, ((py * w + px) * 4), ((py * w + px) * 4) + 4);
      }
    }
    ctxOf(mask).putImageData(data, x, y);
    return Selection.fromMask(mask, region.bounds);
  }

  // The new shape taken together with what was selected before, as the mode says.
  static combine(previous: Selection | null, shape: Selection | null, mode: SelectMode): Selection | null {
    // Taking away from nothing, or keeping what nothing shares, leaves nothing.
    if (mode === 'replace' || !previous) return mode === 'replace' || mode === 'add' ? shape : null;
    if (!shape) return mode === 'intersect' ? null : previous;
    const mask = createCanvas(previous.width, previous.height);
    const ctx = ctxOf(mask);
    ctx.drawImage(previous.mask, 0, 0);
    ctx.globalCompositeOperation = mode === 'add' ? 'source-over' : mode === 'subtract' ? 'destination-out' : 'destination-in';
    ctx.drawImage(shape.mask, 0, 0);
    const within = mode === 'add' ? union(previous.bounds, shape.bounds) : previous.bounds;
    return Selection.fromMask(mask, within);
  }

  inverted(): Selection | null {
    const mask = createCanvas(this.width, this.height);
    const ctx = ctxOf(mask);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(this.mask, 0, 0);
    return Selection.fromMask(mask);
  }

  translated(dx: number, dy: number): Selection | null {
    return this.transformed(new DOMMatrix([1, 0, 0, 1, dx, dy]), false);
  }

  // The mask drawn through a matrix onto a canvas of the given size.
  transformed(m: DOMMatrix, smooth = true, width = this.width, height = this.height): Selection | null {
    const mask = createCanvas(width, height);
    const ctx = fresh(mask);
    ctx.imageSmoothingEnabled = smooth;
    ctx.setTransform(m);
    ctx.drawImage(this.mask, 0, 0);
    const b = this.bounds;
    const corners = [new DOMPoint(b.x, b.y), new DOMPoint(b.x + b.w, b.y), new DOMPoint(b.x, b.y + b.h), new DOMPoint(b.x + b.w, b.y + b.h)].map((p) => p.matrixTransform(m));
    const xs = corners.map((p) => p.x);
    const ys = corners.map((p) => p.y);
    const x = Math.floor(Math.min(...xs)) - 1;
    const y = Math.floor(Math.min(...ys)) - 1;
    return Selection.fromMask(mask, { x, y, w: Math.ceil(Math.max(...xs)) + 2 - x, h: Math.ceil(Math.max(...ys)) + 2 - y });
  }

  // The outline along pixel edges, for marching ants, in image coordinates.
  get outline(): Path2D {
    if (this.path) return this.path;
    const { x, y, w, h } = this.bounds;
    const data = ctxOf(this.mask).getImageData(x, y, w, h);
    const segments = maskOutline(data.data, w, h, 4, 3);
    const path = new Path2D();
    for (let i = 0; i < segments.length; i += 4) {
      path.moveTo(segments[i]! + x, segments[i + 1]! + y);
      path.lineTo(segments[i + 2]! + x, segments[i + 3]! + y);
    }
    this.path = path;
    return path;
  }

  // Clips what is drawn on c to the selection: c keeps only its selected part.
  clip(c: HTMLCanvasElement, offsetX = 0, offsetY = 0): void {
    const ctx = fresh(c);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(this.mask, -offsetX, -offsetY);
    ctx.globalCompositeOperation = 'source-over';
  }

  // The selected part of the canvas cut out (with the selection's bounds as its size).
  extract(src: HTMLCanvasElement): HTMLCanvasElement {
    const { x, y, w, h } = this.bounds;
    const out = createCanvas(w, h);
    ctxOf(out).drawImage(src, -x, -y);
    this.clip(out, x, y);
    return out;
  }

  // The selected part of the canvas made transparent.
  erase(c: HTMLCanvasElement): void {
    const ctx = fresh(c);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(this.mask, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  }

  // A copy of the mask at another canvas size, its content placed at an offset.
  resized(width: number, height: number, dx: number, dy: number): Selection | null {
    const mask = createCanvas(width, height);
    clear(mask).drawImage(this.mask, dx, dy);
    return Selection.fromMask(mask, { x: this.bounds.x + dx, y: this.bounds.y + dy, w: this.bounds.w, h: this.bounds.h });
  }
}

function clipRect(r: Rect, width: number, height: number): Rect | null {
  const x = Math.max(0, Math.floor(r.x));
  const y = Math.max(0, Math.floor(r.y));
  const right = Math.min(width, Math.ceil(r.x + r.w));
  const bottom = Math.min(height, Math.ceil(r.y + r.h));
  return right > x && bottom > y ? { x, y, w: right - x, h: bottom - y } : null;
}
