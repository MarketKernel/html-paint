// The Adjustments and Effects menus, on plain pixel arrays so they run the same in a
// page and in Node. Each takes the pixels it changes in place; the page hands it a copy.

import { hslToRgb, luma, rgbToHsl } from './color';
import type { Pixels } from './raster';

const clamp = (n: number): number => (n < 0 ? 0 : n > 255 ? 255 : n);

// Calls fn with each pixel's red, green and blue; what it returns replaces them.
function eachRgb(p: Pixels, fn: (r: number, g: number, b: number) => [number, number, number]): void {
  const d = p.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const [r, g, b] = fn(d[i]!, d[i + 1]!, d[i + 2]!);
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
  }
}

// Builds a lookup table of 256 entries and applies it to the three colour channels.
function eachChannel(p: Pixels, fn: (v: number) => number): void {
  const table = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) table[v] = Math.round(fn(v));
  const d = p.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = table[d[i]!]!;
    d[i + 1] = table[d[i + 1]!]!;
    d[i + 2] = table[d[i + 2]!]!;
  }
}

export function invert(p: Pixels): void {
  eachChannel(p, (v) => 255 - v);
}

export function blackAndWhite(p: Pixels): void {
  eachRgb(p, (r, g, b) => {
    const y = luma(r, g, b);
    return [y, y, y];
  });
}

export function sepia(p: Pixels): void {
  eachRgb(p, (r, g, b) => [
    clamp(r * 0.393 + g * 0.769 + b * 0.189),
    clamp(r * 0.349 + g * 0.686 + b * 0.168),
    clamp(r * 0.272 + g * 0.534 + b * 0.131),
  ]);
}

// Both from -100 to 100. Contrast turns about the middle grey.
export function brightnessContrast(p: Pixels, brightness: number, contrast: number): void {
  const c = contrast >= 0 ? 1 / Math.max(0.01, 1 - contrast / 100) : 1 + contrast / 100;
  const b = brightness * 2.55;
  eachChannel(p, (v) => clamp((v + b - 127.5) * c + 127.5));
}

// hue in degrees, -180 to 180; saturation and lightness from -100 to 100.
export function hueSaturation(p: Pixels, hue: number, saturation: number, lightness: number): void {
  const s = 1 + saturation / 100;
  const l = lightness / 100;
  eachRgb(p, (r, g, b) => {
    const hsl = rgbToHsl({ r, g, b, a: 255 });
    hsl.h = (hsl.h + hue + 360) % 360;
    hsl.s = Math.min(1, hsl.s * s);
    hsl.l = l >= 0 ? hsl.l + (1 - hsl.l) * l : hsl.l * (1 + l);
    const c = hslToRgb(hsl);
    return [c.r, c.g, c.b];
  });
}

// levels per channel, 2 to 64.
export function posterize(p: Pixels, levels: number): void {
  const n = Math.max(2, Math.round(levels)) - 1;
  eachChannel(p, (v) => (Math.round((v / 255) * n) / n) * 255);
}

// Pixels lighter than the level turn white, the others black.
export function threshold(p: Pixels, level: number): void {
  eachRgb(p, (r, g, b) => {
    const v = luma(r, g, b) >= level ? 255 : 0;
    return [v, v, v];
  });
}

// Stretches each channel so that its darkest and lightest values (leaving out the
// extreme 0.5% at either end, stray pixels) reach 0 and 255.
export function autoLevel(p: Pixels): void {
  const d = p.data;
  const hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
  let count = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    count++;
    for (let c = 0; c < 3; c++) hist[c]![d[i + c]!]!++;
  }
  if (!count) return;
  const cut = count * 0.005;
  const tables = hist.map((h) => {
    let lo = 0;
    let hi = 255;
    for (let sum = 0; lo < 255 && (sum += h[lo]!) <= cut; ) lo++;
    for (let sum = 0; hi > 0 && (sum += h[hi]!) <= cut; ) hi--;
    const table = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) table[v] = hi > lo ? Math.round(((v - lo) / (hi - lo)) * 255) : v;
    return table;
  });
  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c++) d[i + c] = tables[c]![d[i + c]!]!;
  }
}

// Box sizes whose three passes come closest to a Gaussian of this sigma.
function boxesForGauss(sigma: number, n = 3): number[] {
  const ideal = Math.sqrt((12 * sigma * sigma) / n + 1);
  let wl = Math.floor(ideal);
  if (wl % 2 === 0) wl--;
  const wu = wl + 2;
  const m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4));
  return Array.from({ length: n }, (_, i) => (i < m ? wl : wu));
}

// One box pass along rows (or along columns, with the strides swapped), edges clamped.
function boxPass(src: Float32Array, dst: Float32Array, w: number, h: number, r: number, horizontal: boolean): void {
  const len = horizontal ? w : h;
  const lines = horizontal ? h : w;
  const step = horizontal ? 4 : w * 4;
  const scale = 1 / (2 * r + 1);
  for (let line = 0; line < lines; line++) {
    const base = horizontal ? line * w * 4 : line * 4;
    for (let c = 0; c < 4; c++) {
      const at = (k: number) => src[base + Math.max(0, Math.min(len - 1, k)) * step + c]!;
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += at(k);
      for (let k = 0; k < len; k++) {
        dst[base + k * step + c] = sum * scale;
        sum += at(k + r + 1) - at(k - r);
      }
    }
  }
}

// Premultiplied, so that transparent pixels lend no colour to their neighbours.
function toPremultiplied(p: Pixels): Float32Array {
  const d = p.data;
  const f = new Float32Array(d.length);
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3]! / 255;
    f[i] = d[i]! * a;
    f[i + 1] = d[i + 1]! * a;
    f[i + 2] = d[i + 2]! * a;
    f[i + 3] = d[i + 3]!;
  }
  return f;
}

function fromPremultiplied(f: Float32Array, p: Pixels): void {
  const d = p.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = f[i + 3]!;
    const k = a > 0 ? 255 / a : 0;
    d[i] = f[i]! * k;
    d[i + 1] = f[i + 1]! * k;
    d[i + 2] = f[i + 2]! * k;
    d[i + 3] = a;
  }
}

function blurred(p: Pixels, radius: number): Float32Array {
  const f = toPremultiplied(p);
  if (radius < 0.5) return f;
  const tmp = new Float32Array(f.length);
  for (const size of boxesForGauss(radius / 2)) {
    const r = (size - 1) / 2;
    boxPass(f, tmp, p.width, p.height, r, true);
    boxPass(tmp, f, p.width, p.height, r, false);
  }
  return f;
}

// radius in pixels; the Gaussian's sigma is half of it, as in Paint.NET.
export function gaussianBlur(p: Pixels, radius: number): void {
  fromPremultiplied(blurred(p, radius), p);
}

// Unsharp mask: the difference from a blurred copy, amount in percent, added back.
export function sharpen(p: Pixels, amount: number, radius = 2): void {
  const blur = blurred(p, radius);
  const k = amount / 100;
  const d = p.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3]!;
    if (a === 0) continue;
    const ba = blur[i + 3]! || 1;
    for (let c = 0; c < 3; c++) {
      const v = d[i + c]!;
      const soft = (blur[i + c]! * 255) / ba;
      d[i + c] = v + (v - soft) * k;
    }
  }
}

// Averages along a line through each pixel: angle in degrees, distance in pixels.
export function motionBlur(p: Pixels, angle: number, distance: number): void {
  const { width: w, height: h } = p;
  const src = toPremultiplied(p);
  const out = new Float32Array(src.length);
  const steps = Math.max(1, Math.round(distance));
  const dx = Math.cos((angle * Math.PI) / 180);
  const dy = -Math.sin((angle * Math.PI) / 180);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      for (let s = -steps / 2; s <= steps / 2; s++) {
        const sx = Math.round(x + dx * s);
        const sy = Math.round(y + dy * s);
        if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
        const i = (sy * w + sx) * 4;
        r += src[i]!;
        g += src[i + 1]!;
        b += src[i + 2]!;
        a += src[i + 3]!;
        n++;
      }
      const o = (y * w + x) * 4;
      out[o] = r / n;
      out[o + 1] = g / n;
      out[o + 2] = b / n;
      out[o + 3] = a / n;
    }
  }
  fromPremultiplied(out, p);
}

// A small, seedable generator, so a preview and the result it previews are the same.
export function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// intensity, colour saturation and coverage, each 0–100.
export function addNoise(p: Pixels, intensity: number, saturation: number, coverage: number, seed = 1): void {
  const rnd = random(seed);
  const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) * 1.7;
  const amp = intensity * 1.28;
  const sat = saturation / 100;
  const cover = coverage / 100;
  const d = p.data;
  for (let i = 0; i < d.length; i += 4) {
    if (rnd() > cover || d[i + 3] === 0) continue;
    const grey = gauss() * amp;
    for (let c = 0; c < 3; c++) d[i + c] = d[i + c]! + grey * (1 - sat) + gauss() * amp * sat;
  }
}

// Squares of cell × cell pixels, each filled with its average.
export function pixelate(p: Pixels, cell: number): void {
  const { width: w, height: h, data: d } = p;
  const size = Math.max(1, Math.round(cell));
  for (let y0 = 0; y0 < h; y0 += size) {
    for (let x0 = 0; x0 < w; x0 += size) {
      const x1 = Math.min(w, x0 + size);
      const y1 = Math.min(h, y0 + size);
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * w + x) * 4;
          const al = d[i + 3]!;
          r += d[i]! * al;
          g += d[i + 1]! * al;
          b += d[i + 2]! * al;
          a += al;
          n++;
        }
      }
      const k = a ? 1 / a : 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * w + x) * 4;
          d[i] = r * k;
          d[i + 1] = g * k;
          d[i + 2] = b * k;
          d[i + 3] = a / n;
        }
      }
    }
  }
}

// A 3×3 kernel over the colour channels, edges clamped; alpha is kept.
function convolve(p: Pixels, kernel: number[], bias = 0, grey = false): void {
  const { width: w, height: h, data: d } = p;
  const src = new Uint8ClampedArray(d);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let ky = -1; ky <= 1; ky++) {
        const sy = Math.max(0, Math.min(h - 1, y + ky));
        for (let kx = -1; kx <= 1; kx++) {
          const sx = Math.max(0, Math.min(w - 1, x + kx));
          const k = kernel[(ky + 1) * 3 + kx + 1]!;
          if (!k) continue;
          const i = (sy * w + sx) * 4;
          r += src[i]! * k;
          g += src[i + 1]! * k;
          b += src[i + 2]! * k;
        }
      }
      const o = (y * w + x) * 4;
      if (grey) {
        const v = luma(r, g, b) + bias;
        d[o] = d[o + 1] = d[o + 2] = v;
      } else {
        d[o] = r + bias;
        d[o + 1] = g + bias;
        d[o + 2] = b + bias;
      }
    }
  }
}

// Grey relief lit from the angle given, in degrees.
export function emboss(p: Pixels, angle: number): void {
  const a = (angle * Math.PI) / 180;
  const cx = Math.cos(a);
  const cy = Math.sin(a);
  // A directional derivative: weights follow how far each neighbour lies towards the light.
  const kernel = [-1, -1, -1, 0, 0, 0, 1, 1, 1].map((_, i) => {
    const kx = (i % 3) - 1;
    const ky = Math.floor(i / 3) - 1;
    return -(kx * cx - ky * cy);
  });
  convolve(p, kernel, 128, true);
}

// Edges dark on a light ground, as if drawn in pencil.
export function edgeDetect(p: Pixels): void {
  const { width: w, height: h, data: d } = p;
  const grey = new Float32Array(w * h);
  for (let i = 0; i < grey.length; i++) grey[i] = luma(d[i * 4]!, d[i * 4 + 1]!, d[i * 4 + 2]!);
  const at = (x: number, y: number) => grey[Math.max(0, Math.min(h - 1, y)) * w + Math.max(0, Math.min(w - 1, x))]!;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
      const gy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1);
      const v = 255 - Math.min(255, Math.hypot(gx, gy));
      const o = (y * w + x) * 4;
      d[o] = d[o + 1] = d[o + 2] = v;
    }
  }
}

// Darkens towards the corners: radius as a percentage of the half-diagonal where the
// darkening starts to reach full strength, strength 0–100.
export function vignette(p: Pixels, radius: number, strength: number): void {
  const { width: w, height: h, data: d } = p;
  const cx = w / 2;
  const cy = h / 2;
  const reach = Math.max(1e-6, (Math.hypot(cx, cy) * radius) / 100);
  const k = strength / 100;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = Math.min(1, Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / reach);
      const f = 1 - k * t * t * (3 - 2 * t);
      const o = (y * w + x) * 4;
      d[o] = d[o]! * f;
      d[o + 1] = d[o + 1]! * f;
      d[o + 2] = d[o + 2]! * f;
    }
  }
}

// Each pixel's colour is replaced by the most common intensity around it, in a radius,
// averaged over the pixels of that intensity: brush strokes from a photograph.
export function oilPaint(p: Pixels, radius: number, levels = 20): void {
  const { width: w, height: h, data: d } = p;
  const src = new Uint8ClampedArray(d);
  const r = Math.max(1, Math.round(radius));
  const count = new Uint32Array(levels);
  const sum = new Float64Array(levels * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      count.fill(0);
      sum.fill(0);
      for (let sy = Math.max(0, y - r); sy <= Math.min(h - 1, y + r); sy++) {
        for (let sx = Math.max(0, x - r); sx <= Math.min(w - 1, x + r); sx++) {
          const i = (sy * w + sx) * 4;
          const bin = Math.min(levels - 1, Math.floor((luma(src[i]!, src[i + 1]!, src[i + 2]!) * levels) / 256));
          count[bin]!++;
          sum[bin * 3] = sum[bin * 3]! + src[i]!;
          sum[bin * 3 + 1] = sum[bin * 3 + 1]! + src[i + 1]!;
          sum[bin * 3 + 2] = sum[bin * 3 + 2]! + src[i + 2]!;
        }
      }
      let best = 0;
      for (let b = 1; b < levels; b++) if (count[b]! > count[best]!) best = b;
      const n = count[best]!;
      const o = (y * w + x) * 4;
      d[o] = sum[best * 3]! / n;
      d[o + 1] = sum[best * 3 + 1]! / n;
      d[o + 2] = sum[best * 3 + 2]! / n;
    }
  }
}
