// OpenRaster's stack.xml, the layered format GIMP, Krita and MyPaint share: a list of
// layers, top first, each a PNG in the archive with its name, offset, opacity, visibility
// and blend mode. Groups are read as the layers inside them.

export const BLEND_MODES = [
  'normal', 'multiply', 'additive', 'color-burn', 'color-dodge', 'overlay', 'screen', 'lighten', 'darken',
  'difference', 'exclusion', 'hard-light', 'soft-light', 'hue', 'saturation', 'color', 'luminosity',
] as const;

export type BlendMode = (typeof BLEND_MODES)[number];

// The canvas's globalCompositeOperation for each.
export const compositeOp = (mode: BlendMode): GlobalCompositeOperation =>
  mode === 'normal' ? 'source-over' : mode === 'additive' ? 'lighter' : mode;

const toOra = (mode: BlendMode): string => (mode === 'normal' ? 'svg:src-over' : mode === 'additive' ? 'svg:plus' : `svg:${mode}`);

function fromOra(op: string | undefined): BlendMode {
  const name = (op ?? '').replace(/^(svg|krita):/, '');
  if (name === 'src-over' || !name) return 'normal';
  if (name === 'plus' || name === 'add' || name === 'addition') return 'additive';
  return (BLEND_MODES as readonly string[]).includes(name) ? (name as BlendMode) : 'normal';
}

export interface StackLayer {
  name: string;
  src: string;
  x: number;
  y: number;
  opacity: number;
  visible: boolean;
  blend: BlendMode;
}

export interface Stack {
  width: number;
  height: number;
  // Bottom first, as the page keeps them.
  layers: StackLayer[];
}

const escape = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const unescape = (s: string): string =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');

export function writeStack(stack: Stack): string {
  const layers = [...stack.layers]
    .reverse()
    .map(
      (l) =>
        `    <layer name="${escape(l.name)}" src="${escape(l.src)}" x="${l.x}" y="${l.y}" opacity="${+l.opacity.toFixed(3)}"` +
        ` visibility="${l.visible ? 'visible' : 'hidden'}" composite-op="${toOra(l.blend)}"/>`,
    );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<image version="0.0.5" w="${stack.width}" h="${stack.height}">\n  <stack>\n${layers.join('\n')}\n  </stack>\n</image>\n`;
}

function attributes(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [, key, , value] of tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)) out[key!] = unescape(value!);
  return out;
}

export function readStack(xml: string): Stack {
  const image = /<image\b[^>]*>/.exec(xml);
  if (!image) throw new Error('stack.xml has no <image>');
  const size = attributes(image[0]);
  const width = Number(size.w);
  const height = Number(size.h);
  if (!(width > 0 && height > 0)) throw new Error('stack.xml gives no image size');

  const layers: StackLayer[] = [];
  // A group's offset and visibility pass to the layers in it.
  // The root <stack> is the bottom of this list too, with nothing to pass on.
  const groups: { x: number; y: number; visible: boolean; opacity: number }[] = [];
  for (const [tag] of xml.matchAll(/<\/?(?:stack|layer)\b[^>]*>/g)) {
    const top = groups[groups.length - 1] ?? { x: 0, y: 0, visible: true, opacity: 1 };
    if (tag.startsWith('</stack')) {
      groups.pop();
      continue;
    }
    const a = attributes(tag);
    const x = top.x + (Number(a.x) || 0);
    const y = top.y + (Number(a.y) || 0);
    const visible = top.visible && a.visibility !== 'hidden';
    const opacity = top.opacity * (a.opacity === undefined ? 1 : Math.max(0, Math.min(1, Number(a.opacity) || 0)));
    if (tag.startsWith('<stack')) {
      if (!tag.endsWith('/>')) groups.push({ x, y, visible, opacity });
      continue;
    }
    if (!a.src) continue;
    layers.push({ name: a.name ?? '', src: a.src, x, y, opacity, visible, blend: fromOra(a['composite-op']) });
  }
  return { width, height, layers: layers.reverse() };
}
