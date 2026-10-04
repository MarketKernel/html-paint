// Colours as the canvas stores them: red, green, blue and alpha, each 0–255.
// Hue is in degrees, saturation, value and lightness are 0–1.

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface HSV {
  h: number;
  s: number;
  v: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

const clamp255 = (n: number): number => Math.max(0, Math.min(255, Math.round(n)));
const hex2 = (n: number): string => clamp255(n).toString(16).padStart(2, '0');

export const rgba = (r: number, g: number, b: number, a = 255): RGBA => ({ r: clamp255(r), g: clamp255(g), b: clamp255(b), a: clamp255(a) });

export const sameColor = (x: RGBA, y: RGBA): boolean => x.r === y.r && x.g === y.g && x.b === y.b && x.a === y.a;

// #rgb, #rgba, #rrggbb and #rrggbbaa, with or without the #.
export function parseHex(text: string): RGBA | null {
  const s = text.trim().replace(/^#/, '');
  if (!/^[0-9a-f]+$/i.test(s)) return null;
  if (s.length === 3 || s.length === 4) {
    const n = [...s].map((c) => parseInt(c + c, 16));
    return rgba(n[0]!, n[1]!, n[2]!, n[3] ?? 255);
  }
  if (s.length === 6 || s.length === 8) {
    const n = [0, 2, 4, 6].map((i) => (i < s.length ? parseInt(s.slice(i, i + 2), 16) : 255));
    return rgba(n[0]!, n[1]!, n[2]!, n[3]!);
  }
  return null;
}

// The alpha is written only when the colour is not opaque, unless asked for.
export function toHex(c: RGBA, alpha: boolean | 'auto' = 'auto'): string {
  const withAlpha = alpha === true || (alpha === 'auto' && c.a !== 255);
  return `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}${withAlpha ? hex2(c.a) : ''}`.toUpperCase();
}

export const toCss = (c: RGBA): string => `rgba(${c.r}, ${c.g}, ${c.b}, ${+(c.a / 255).toFixed(4)})`;

export function rgbToHsv({ r, g, b }: RGBA): HSV {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const d = max - Math.min(R, G, B);
  return { h: hueOf(R, G, B, max, d), s: max === 0 ? 0 : d / max, v: max };
}

export function hsvToRgb({ h, s, v }: HSV, a = 255): RGBA {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return rgba(f(5) * 255, f(3) * 255, f(1) * 255, a);
}

export function rgbToHsl({ r, g, b }: RGBA): HSL {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h: hueOf(R, G, B, max, d), s, l };
}

export function hslToRgb({ h, s, l }: HSL, a = 255): RGBA {
  const k = (n: number) => (n + h / 30) % 12;
  const q = s * Math.min(l, 1 - l);
  const f = (n: number) => l - q * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return rgba(f(0) * 255, f(8) * 255, f(4) * 255, a);
}

function hueOf(R: number, G: number, B: number, max: number, d: number): number {
  if (d === 0) return 0;
  let h: number;
  if (max === R) h = ((G - B) / d) % 6;
  else if (max === G) h = (B - R) / d + 2;
  else h = (R - G) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

// How far apart two colours are, 0 for the same one and 1 for opaque black against
// transparent white: the root mean square of the four channels' differences. A
// transparent pixel's colour does not count, so all of them are one colour.
export function distance(x: RGBA, y: RGBA): number {
  if (x.a === 0 && y.a === 0) return 0;
  const dr = x.r - y.r;
  const dg = x.g - y.g;
  const db = x.b - y.b;
  const da = x.a - y.a;
  return Math.sqrt((dr * dr + dg * dg + db * db + da * da) / 4) / 255;
}

// Rec. 601 luma, the grey a colour turns into.
export const luma = (r: number, g: number, b: number): number => 0.299 * r + 0.587 * g + 0.114 * b;

// Paint.NET's default palette, in its order: a row of full colours, then lighter and darker ones.
export const DEFAULT_PALETTE: readonly string[] = [
  '#000000', '#404040', '#FF0000', '#FF6A00', '#FFD800', '#B6FF00', '#4CFF00', '#00FF21',
  '#00FF90', '#00FFFF', '#0094FF', '#0026FF', '#4800FF', '#B200FF', '#FF00DC', '#FF006E',
  '#FFFFFF', '#808080', '#FF7F7F', '#FFB27F', '#FFE97F', '#DAFF7F', '#A5FF7F', '#7FFF8E',
  '#7FFFC5', '#7FFFFF', '#7FC9FF', '#7F92FF', '#A17FFF', '#D67FFF', '#FF7FED', '#FF7FB6',
  '#A0A0A0', '#303030', '#7F0000', '#7F3300', '#7F6A00', '#5B7F00', '#267F00', '#007F0E',
  '#007F46', '#007F7F', '#004A7F', '#00137F', '#21007F', '#57007F', '#7F006E', '#7F0037',
];
