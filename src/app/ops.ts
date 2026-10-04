// What the Edit, Image and Layers menus do: selections, the clipboard, cropping and
// resizing, flips and rotations, and layers added, removed, merged and reordered.

import { toCss } from '../core/color';
import { N_, t } from '../core/i18n';
import { compositeOp, type BlendMode } from '../core/ora';
import { app } from './app';
import { canvasToBlob, clear, cloneCanvas, createCanvas, ctxOf, fresh } from './canvas';
import { Layer, PaintDocument } from './document';
import { Selection } from './selection';
import { confirmDiscard } from './io';
import { floatPasted } from './tools/move';
import { ask, toast } from './ui/dialog';

// ---- Selection

export function selectAll(): void {
  app.finish();
  app.setSelection(Selection.all(app.doc.width, app.doc.height), N_('Select all'), 'select');
}

export function deselect(): void {
  app.finish();
  if (app.doc.selection) app.setSelection(null, N_('Deselect'), 'deselect');
}

export function invertSelection(): void {
  app.finish();
  const s = app.doc.selection;
  app.setSelection(s ? s.inverted() : Selection.all(app.doc.width, app.doc.height), N_('Invert selection'), 'select');
}

export function eraseSelection(name = N_('Erase selection')): void {
  app.finish();
  const layer = app.layer;
  const s = app.doc.selection;
  app.patch(name, 'eraser', layer, s?.bounds ?? null, () => {
    if (s) s.erase(layer.canvas);
    else clear(layer.canvas);
  });
}

export function fillSelection(): void {
  app.finish();
  const color = app.primary;
  const ctx = clear(app.stroke);
  ctx.fillStyle = toCss({ ...color, a: 255 });
  ctx.fillRect(0, 0, app.stroke.width, app.stroke.height);
  app.setLive({ kind: 'paint', layer: app.layer, canvas: app.stroke, alpha: color.a / 255 });
  app.commitLive(N_('Fill selection'), 'fill', app.doc.selection?.bounds ?? null);
}

// ---- Clipboard

// What was copied here, with where it came from, so pasting it back puts it in place, and
// when.
let clipboard: { canvas: HTMLCanvasElement; x: number; y: number; at: number } | null = null;

// When the page last lost the focus. A copy made here since then is the newest thing on any
// clipboard, whatever the system clipboard holds (the write to it may have been refused).
let lastBlur = 0;
window.addEventListener('blur', () => (lastBlur = performance.now()));

function samePixels(a: HTMLCanvasElement, b: HTMLCanvasElement): boolean {
  if (a.width !== b.width || a.height !== b.height) return false;
  const x = ctxOf(a).getImageData(0, 0, a.width, a.height).data;
  const y = ctxOf(b).getImageData(0, 0, b.width, b.height).data;
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
  return true;
}

export async function copy(merged = false): Promise<void> {
  app.finish();
  const source = merged ? app.flatten() : app.layer.canvas;
  const s = app.doc.selection;
  const canvas = s ? s.extract(source) : cloneCanvas(source);
  clipboard = { canvas, x: s?.bounds.x ?? 0, y: s?.bounds.y ?? 0, at: performance.now() };
  try {
    // The blob is handed over as a promise: Safari wants the write started at once.
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': canvasToBlob(canvas) })]);
  } catch {
    // No access to the system clipboard (an old browser, a file:// page in some): pasting
    // here still works from the copy kept above.
  }
}

export async function cut(): Promise<void> {
  await copy();
  eraseSelection(N_('Cut'));
}

export type PasteTarget = 'layer' | 'new-layer' | 'new-image';

export async function decodeImage(blob: Blob): Promise<HTMLCanvasElement> {
  try {
    const bitmap = await createImageBitmap(blob);
    const c = cloneCanvas(bitmap);
    bitmap.close();
    return c;
  } catch {
    // SVG and a few others: through an <img>.
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const c = createCanvas(img.naturalWidth || 300, img.naturalHeight || 150);
      ctxOf(c).drawImage(img, 0, 0, c.width, c.height);
      return c;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

// Pastes from the system clipboard when it holds an image, from the copy kept here otherwise.
export async function pasteFromClipboard(target: PasteTarget, data?: DataTransfer | null): Promise<void> {
  if (clipboard && clipboard.at > lastBlur) {
    await pasteImage(clipboard.canvas, target, { x: clipboard.x, y: clipboard.y });
    return;
  }
  let blob: Blob | null = null;
  if (data) {
    blob = [...data.files].find((f) => f.type.startsWith('image/')) ?? null;
  } else {
    try {
      for (const item of await navigator.clipboard.read()) {
        const type = item.types.find((ty) => ty.startsWith('image/'));
        if (type) {
          blob = await item.getType(type);
          break;
        }
      }
    } catch {
      // Not allowed or not supported: the copy kept here will do.
    }
  }
  let image: HTMLCanvasElement | null = null;
  let at: { x: number; y: number } | null = null;
  if (blob) {
    image = await decodeImage(blob);
    // The image copied here, back from the system clipboard, goes where it came from.
    if (clipboard && samePixels(clipboard.canvas, image)) {
      image = clipboard.canvas;
      at = { x: clipboard.x, y: clipboard.y };
    }
  } else if (clipboard) {
    image = clipboard.canvas;
    at = { x: clipboard.x, y: clipboard.y };
  }
  if (!image) {
    toast(t('The clipboard has no image.'));
    return;
  }
  await pasteImage(image, target, at);
}

// Where a pasted image goes when it has no place of its own: the top left of what is in view.
function visibleCorner(): { x: number; y: number } {
  const p = app.view.toImage(app.view.canvas.getBoundingClientRect().left, app.view.canvas.getBoundingClientRect().top);
  return { x: Math.max(0, Math.round(p.x)), y: Math.max(0, Math.round(p.y)) };
}

export async function pasteImage(image: HTMLCanvasElement, target: PasteTarget, at: { x: number; y: number } | null, name = t('Pasted')): Promise<void> {
  app.finish();
  if (target === 'new-image') {
    if (!(await confirmDiscard())) return;
    const doc = new PaintDocument(image.width, image.height, t('Untitled'));
    doc.layers.push(new Layer(cloneCanvas(image), t('Background')));
    app.setDocument(doc);
    return;
  }
  const { width, height } = app.doc;
  if (image.width > width || image.height > height) {
    const answer = await ask(t('The image is larger than the canvas'), t('Expand the canvas to fit it?'), [
      { id: 'keep', label: t('Keep canvas size') },
      { id: 'expand', label: t('Expand canvas'), primary: true },
    ]);
    if (answer === null) return;
    if (answer === 'expand') resizeCanvas(Math.max(width, image.width), Math.max(height, image.height), 'tl');
  }
  let pos = at ?? visibleCorner();
  if (pos.x + image.width > app.doc.width || pos.y + image.height > app.doc.height) {
    pos = { x: Math.max(0, Math.min(pos.x, app.doc.width - image.width)), y: Math.max(0, Math.min(pos.y, app.doc.height - image.height)) };
  }
  const rect = { x: pos.x, y: pos.y, w: image.width, h: image.height };
  if (target === 'new-layer') {
    app.change(N_('Paste into new layer'), 'paste', () => {
      const layer = new Layer(app.doc.newLayerCanvas(), name);
      ctxOf(layer.canvas).drawImage(image, pos.x, pos.y);
      app.doc.layers.splice(app.doc.active + 1, 0, layer);
      app.doc.active += 1;
      app.doc.selection = Selection.rect(app.doc.width, app.doc.height, rect);
    });
    app.setTool('move');
    return;
  }
  // Into the current layer: floating, to be moved into place with the move tool.
  app.setTool('move');
  floatPasted(image, pos.x, pos.y);
}

// ---- Image

function eachLayerCanvas(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, layer: Layer, index: number) => void): void {
  app.doc.layers.forEach((layer, index) => {
    const c = createCanvas(width, height);
    draw(fresh(c), layer, index);
    layer.canvas = c;
  });
  app.doc.width = width;
  app.doc.height = height;
}

export function cropToSelection(): void {
  app.finish();
  const s = app.doc.selection;
  if (!s) return;
  const { x, y, w, h } = s.bounds;
  app.change(N_('Crop to selection'), 'crop', () => {
    eachLayerCanvas(w, h, (ctx, layer) => {
      ctx.drawImage(layer.canvas, -x, -y);
      // What lies outside an irregular selection is cut away too.
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(s.mask, -x, -y);
    });
    app.doc.selection = null;
  });
}

export function resizeImage(width: number, height: number, smooth: boolean): void {
  app.finish();
  if (width === app.doc.width && height === app.doc.height) return;
  app.change(N_('Resize image'), 'resize', () => {
    const sel = app.doc.selection;
    const sw = app.doc.width;
    const sh = app.doc.height;
    eachLayerCanvas(width, height, (ctx, layer) => {
      ctx.imageSmoothingEnabled = smooth;
      drawScaled(ctx, layer.canvas, width, height, smooth);
    });
    app.doc.selection = sel ? sel.transformed(new DOMMatrix().scaleSelf(width / sw, height / sh), smooth, width, height) : null;
  });
}

// A large reduction in one go skips pixels even when smoothed; halving step by step
// lets every pixel count.
function drawScaled(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, width: number, height: number, smooth: boolean): void {
  let image: HTMLCanvasElement = src;
  if (smooth) {
    while (image.width / 2 >= width && image.height / 2 >= height) {
      const half = createCanvas(Math.ceil(image.width / 2), Math.ceil(image.height / 2));
      const h = fresh(half);
      h.drawImage(image, 0, 0, half.width, half.height);
      image = half;
    }
  }
  ctx.drawImage(image, 0, 0, width, height);
}

// The offset of the old image in the new canvas for an anchor: tl, t, tr, l, c, r, bl, b, br.
function anchorOffset(anchor: string, dw: number, dh: number): { x: number; y: number } {
  const x = anchor.includes('l') ? 0 : anchor.includes('r') ? dw : Math.round(dw / 2);
  const y = anchor.startsWith('t') ? 0 : anchor.startsWith('b') ? dh : Math.round(dh / 2);
  return { x, y };
}

export function resizeCanvas(width: number, height: number, anchor: string): void {
  app.finish();
  if (width === app.doc.width && height === app.doc.height) return;
  const o = anchorOffset(anchor, width - app.doc.width, height - app.doc.height);
  app.change(N_('Canvas size'), 'resize', () => {
    const sel = app.doc.selection;
    const { width: ow, height: oh } = app.doc;
    eachLayerCanvas(width, height, (ctx, layer, index) => {
      // The bottom layer's new border takes the secondary colour, as a background would.
      if (index === 0 && isOpaque(layer.canvas)) {
        ctx.fillStyle = toCss(app.secondary);
        ctx.fillRect(0, 0, width, height);
        ctx.clearRect(o.x, o.y, ow, oh);
      }
      ctx.drawImage(layer.canvas, o.x, o.y);
    });
    app.doc.selection = sel ? sel.resized(width, height, o.x, o.y) : null;
  });
}

// Whether a canvas's corners are all opaque: a background layer, not a transparent one.
function isOpaque(c: HTMLCanvasElement): boolean {
  const ctx = ctxOf(c);
  return [
    [0, 0],
    [c.width - 1, 0],
    [0, c.height - 1],
    [c.width - 1, c.height - 1],
  ].every(([x, y]) => ctx.getImageData(x!, y!, 1, 1).data[3] === 255);
}

function flipped(c: HTMLCanvasElement, horizontal: boolean): HTMLCanvasElement {
  const out = createCanvas(c.width, c.height);
  const ctx = fresh(out);
  if (horizontal) ctx.setTransform(-1, 0, 0, 1, c.width, 0);
  else ctx.setTransform(1, 0, 0, -1, 0, c.height);
  ctx.drawImage(c, 0, 0);
  return out;
}

export function flipImage(horizontal: boolean): void {
  app.finish();
  app.change(horizontal ? N_('Flip horizontal') : N_('Flip vertical'), horizontal ? 'flip-h' : 'flip-v', () => {
    for (const layer of app.doc.layers) layer.canvas = flipped(layer.canvas, horizontal);
    const sel = app.doc.selection;
    if (sel) app.doc.selection = Selection.fromMask(flipped(sel.mask, horizontal));
  });
}

export function flipLayer(horizontal: boolean): void {
  app.finish();
  app.change(horizontal ? N_('Flip layer horizontal') : N_('Flip layer vertical'), horizontal ? 'flip-h' : 'flip-v', () => {
    app.layer.canvas = flipped(app.layer.canvas, horizontal);
  });
}

// Turns a canvas a quarter (1), half (2) or three quarters (3) of the way clockwise.
function rotated(c: HTMLCanvasElement, quarters: 1 | 2 | 3): HTMLCanvasElement {
  const swap = quarters !== 2;
  const out = createCanvas(swap ? c.height : c.width, swap ? c.width : c.height);
  const ctx = fresh(out);
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate((quarters * Math.PI) / 2);
  ctx.drawImage(c, -c.width / 2, -c.height / 2);
  return out;
}

export function rotateImage(quarters: 1 | 2 | 3): void {
  app.finish();
  const names = { 1: N_('Rotate 90° clockwise'), 2: N_('Rotate 180°'), 3: N_('Rotate 90° counter-clockwise') };
  app.change(names[quarters], 'rotate', () => {
    for (const layer of app.doc.layers) layer.canvas = rotated(layer.canvas, quarters);
    const first = app.doc.layers[0]!.canvas;
    app.doc.width = first.width;
    app.doc.height = first.height;
    const sel = app.doc.selection;
    app.doc.selection = sel ? Selection.fromMask(rotated(sel.mask, quarters)) : null;
  });
}

export function flatten(): void {
  app.finish();
  if (app.doc.layers.length < 2) return;
  app.change(N_('Flatten'), 'layers', () => {
    const canvas = app.flatten();
    const bottom = app.doc.layers[0]!;
    app.doc.layers = [new Layer(canvas, bottom.name)];
    app.doc.active = 0;
  });
}

// ---- Layers

export function addLayer(): void {
  app.finish();
  app.change(N_('Add new layer'), 'plus', () => {
    const doc = app.doc;
    doc.layers.splice(doc.active + 1, 0, new Layer(doc.newLayerCanvas(), doc.freshName(t('Layer'))));
    doc.active += 1;
  });
}

export function deleteLayer(): void {
  app.finish();
  if (app.doc.layers.length < 2) return;
  app.change(N_('Delete layer'), 'trash', () => {
    const doc = app.doc;
    doc.layers.splice(doc.active, 1);
    doc.active = Math.min(doc.active, doc.layers.length - 1);
  });
}

export function duplicateLayer(): void {
  app.finish();
  app.change(N_('Duplicate layer'), 'duplicate', () => {
    const doc = app.doc;
    doc.layers.splice(doc.active + 1, 0, doc.layer.copy(t('{name} copy', { name: doc.layer.name })));
    doc.active += 1;
  });
}

export function mergeDown(): void {
  app.finish();
  const doc = app.doc;
  if (doc.active < 1) return;
  app.change(N_('Merge layer down'), 'merge', () => {
    const upper = doc.layers[doc.active]!;
    const lower = doc.layers[doc.active - 1]!;
    const merged = cloneCanvas(lower.canvas);
    if (upper.visible) {
      const ctx = fresh(merged);
      ctx.globalAlpha = upper.opacity;
      ctx.globalCompositeOperation = compositeOp(upper.blend);
      ctx.drawImage(upper.canvas, 0, 0);
    }
    lower.canvas = merged;
    doc.layers.splice(doc.active, 1);
    doc.active -= 1;
  });
}

export function moveLayer(direction: 1 | -1, index = app.doc.active): void {
  app.finish();
  const to = index + direction;
  if (to < 0 || to >= app.doc.layers.length) return;
  reorderLayer(index, to);
}

export function reorderLayer(from: number, to: number): void {
  if (from === to) return;
  app.change(to > from ? N_('Move layer up') : N_('Move layer down'), to > from ? 'up' : 'down', () => {
    const doc = app.doc;
    const [layer] = doc.layers.splice(from, 1);
    doc.layers.splice(to, 0, layer!);
    doc.active = to;
  });
}

export interface LayerProps {
  name: string;
  visible: boolean;
  opacity: number;
  blend: BlendMode;
}

export function setLayerProps(layer: Layer, props: Partial<LayerProps>, name: string = N_('Layer properties')): void {
  app.finish();
  const changes = Object.entries(props).filter(([k, v]) => layer[k as keyof LayerProps] !== v);
  if (!changes.length) return;
  app.change(name, 'props', () => Object.assign(layer, Object.fromEntries(changes)));
}

export function blankDocument(width: number, height: number, background: 'white' | 'secondary' | 'transparent'): void {
  const fill = background === 'white' ? '#ffffff' : background === 'secondary' ? toCss(app.secondary) : null;
  app.setDocument(PaintDocument.blank(width, height, t('Untitled'), fill, t('Background')));
}
