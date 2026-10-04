// The page's state and the operations everything else goes through: the document, its
// history, the colours and settings, the tool in use, and the "live" layer — a stroke
// or a preview drawn over a layer on screen before it is committed to the layer.

import { parseHex, rgba, toHex, type RGBA } from '../core/color';
import { compositeOp } from '../core/ora';
import { intersect, type Rect } from '../core/raster';
import { clear, createCanvas, fresh, fullRect, read } from './canvas';
import { PaintDocument, type DocState, type Layer } from './document';
import { History, type Entry } from './history';
import type { Selection } from './selection';
import { loadSettings, saveSettings, type Settings } from './settings';
import type { Tool } from './tools/tool';
import type { View } from './view';

export type Live =
  // A stroke on a canvas the size of the image, painted (or erased) at an opacity and
  // clipped to the selection.
  | { kind: 'paint'; layer: Layer; canvas: HTMLCanvasElement; alpha: number; erase?: boolean }
  // The source image, shifted, shows through a stroke used as a mask.
  | { kind: 'clone'; layer: Layer; canvas: HTMLCanvasElement; source: HTMLCanvasElement; dx: number; dy: number; alpha: number }
  // Pixels lifted off the layer, drawn over it through a matrix.
  | { kind: 'float'; layer: Layer; canvas: HTMLCanvasElement; matrix: DOMMatrix; smooth: boolean }
  // The layer shown as another canvas altogether: an effect's preview.
  | { kind: 'replace'; layer: Layer; canvas: HTMLCanvasElement };

export type AppEvent = 'doc' | 'layers' | 'pixels' | 'history' | 'selection' | 'colors' | 'tool' | 'settings' | 'view' | 'lang' | 'status';

class App {
  doc = PaintDocument.blank(1, 1, '', null, '');
  history = new History();
  settings: Settings = loadSettings();
  primary: RGBA = parseHex(this.settings.primary) ?? rgba(0, 0, 0);
  secondary: RGBA = parseHex(this.settings.secondary) ?? rgba(255, 255, 255);
  tools: Tool[] = [];
  tool!: Tool;
  previousTool: Tool | null = null;
  live: Live | null = null;
  // Set by main.ts before anything is drawn.
  view!: View;
  // The text for the status bar: what the pointer is over, the size of a selection being made.
  status = '';

  // Canvases the size of the image, reused: a stroke being drawn, a scratch copy, the
  // live layer's preview, the layers under it, and everything put together.
  stroke = createCanvas(1, 1);
  private scratch = createCanvas(1, 1);
  private preview = createCanvas(1, 1);
  private below = createCanvas(1, 1);
  private composed = createCanvas(1, 1);
  private composedValid = false;
  private belowFor = -1;

  private listeners = new Map<AppEvent, Set<() => void>>();
  private settingsTimer = 0;

  on(event: AppEvent, fn: () => void): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn);
  }

  emit(...events: AppEvent[]): void {
    for (const event of events) for (const fn of this.listeners.get(event) ?? []) fn();
  }

  get layer(): Layer {
    return this.doc.layer;
  }

  get docRect(): Rect {
    return { x: 0, y: 0, w: this.doc.width, h: this.doc.height };
  }

  setDocument(doc: PaintDocument): void {
    this.tool?.cancel?.();
    this.live = null;
    this.doc = doc;
    this.history.clear();
    this.sizeScratch();
    this.markDirty();
    this.emit('doc', 'layers', 'history', 'selection');
    this.view.fit();
  }

  private sizeScratch(): void {
    const { width, height } = this.doc;
    if (this.stroke.width === width && this.stroke.height === height) return;
    for (const c of [this.stroke, this.scratch, this.preview, this.below, this.composed]) {
      c.width = width;
      c.height = height;
    }
  }

  // Something in the image changed: everything is put together again on the next draw.
  markDirty(): void {
    this.composedValid = false;
    this.belowFor = -1;
    this.view.requestDraw();
  }

  setLive(live: Live | null): void {
    this.live = live;
    this.composedValid = false;
    this.view.requestDraw();
  }

  // All visible layers blended together, the live one with its stroke or preview.
  composite(): HTMLCanvasElement {
    if (this.composedValid) return this.composed;
    const { layers } = this.doc;
    const live = this.live;
    const at = live ? layers.indexOf(live.layer) : -1;
    const ctx = clear(this.composed);
    let start = 0;
    // While a stroke is drawn only its layer changes: the ones under it are kept blended.
    if (at > 0) {
      if (this.belowFor !== at) {
        this.blend(clear(this.below), layers.slice(0, at));
        this.belowFor = at;
      }
      ctx.drawImage(this.below, 0, 0);
      start = at;
    }
    this.blend(ctx, layers.slice(start), live);
    this.composedValid = true;
    return this.composed;
  }

  private blend(ctx: CanvasRenderingContext2D, layers: Layer[], live: Live | null = null): void {
    for (const layer of layers) {
      if (!layer.visible) continue;
      let source = layer.canvas;
      if (live && live.layer === layer) {
        clear(this.preview).drawImage(layer.canvas, 0, 0);
        this.applyLive(this.preview, live);
        source = this.preview;
      }
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = compositeOp(layer.blend);
      ctx.drawImage(source, 0, 0);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // The flattened image as a new canvas, on a background colour if one is given.
  flatten(background?: string): HTMLCanvasElement {
    const saved = this.live;
    this.live = null;
    this.composedValid = false;
    const out = createCanvas(this.doc.width, this.doc.height);
    const ctx = clear(out);
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, out.width, out.height);
    }
    ctx.drawImage(this.composite(), 0, 0);
    this.live = saved;
    this.composedValid = false;
    return out;
  }

  applyLive(target: HTMLCanvasElement, live: Live): void {
    const ctx = fresh(target);
    const selection = this.doc.selection;
    switch (live.kind) {
      case 'paint': {
        let source = live.canvas;
        if (selection) {
          clear(this.scratch).drawImage(source, 0, 0);
          selection.clip(this.scratch);
          source = this.scratch;
        }
        ctx.globalAlpha = live.alpha;
        ctx.globalCompositeOperation = live.erase ? 'destination-out' : 'source-over';
        ctx.drawImage(source, 0, 0);
        break;
      }
      case 'clone': {
        const s = clear(this.scratch);
        s.drawImage(live.source, live.dx, live.dy);
        s.globalCompositeOperation = 'destination-in';
        s.drawImage(live.canvas, 0, 0);
        if (selection) selection.clip(this.scratch);
        ctx.globalAlpha = live.alpha;
        ctx.drawImage(this.scratch, 0, 0);
        break;
      }
      case 'float':
        ctx.imageSmoothingEnabled = live.smooth;
        ctx.setTransform(live.matrix);
        ctx.drawImage(live.canvas, 0, 0);
        break;
      case 'replace':
        ctx.clearRect(0, 0, target.width, target.height);
        ctx.drawImage(live.canvas, 0, 0);
        break;
    }
    fresh(target);
  }

  // Puts the live stroke into its layer, as one step in the history covering `rect`.
  commitLive(name: string, icon: string, rect: Rect | null): void {
    const live = this.live;
    if (!live) return;
    this.live = null;
    this.patch(name, icon, live.layer, rect, () => this.applyLive(live.layer.canvas, live));
  }

  // Runs draw() on a layer and records the pixels it changed inside rect (null: all of
  // them) as one history step. A selection given replaces the current one in the same step.
  patch(name: string, icon: string, layer: Layer, rect: Rect | null, draw: () => void, selection?: Selection | null): void {
    const r = intersect(rect ?? this.docRect, fullRect(layer.canvas));
    const before = r ? read(layer.canvas, r) : null;
    const selectionBefore = this.doc.selection;
    draw();
    if (selection !== undefined) this.doc.selection = selection;
    const after = r ? read(layer.canvas, r) : null;
    const selectionAfter = this.doc.selection;
    const doc = this.doc;
    const put = (data: ImageData | null) => {
      if (data && r) fresh(layer.canvas).putImageData(data, r.x, r.y);
    };
    this.record({
      name,
      icon,
      bytes: (r ? r.w * r.h * 8 : 0) + (selectionAfter && selectionAfter !== selectionBefore ? selectionAfter.width * selectionAfter.height * 4 : 0),
      undo: () => {
        put(before);
        doc.selection = selectionBefore;
      },
      redo: () => {
        put(after);
        doc.selection = selectionAfter;
      },
    });
    this.changed(false, selection !== undefined);
  }

  // Runs fn, which may change anything in the document — layers, their order, sizes,
  // canvases, the selection — and records the states before and after as one step.
  change(name: string, icon: string, fn: () => void): void {
    const before = this.doc.snapshot();
    fn();
    const after = this.doc.snapshot();
    const doc = this.doc;
    const sized = (s: DocState) => () => {
      const resized = doc.width !== s.width || doc.height !== s.height;
      doc.restore(s);
      if (resized) this.sizeScratch();
    };
    // New canvases are what a step holds on to: layers replaced, and a new selection's mask.
    const mask = after.selection && after.selection !== before.selection ? after.selection.width * after.selection.height * 4 : 0;
    const bytes = mask + after.layers.filter((l, i) => before.layers[i]?.canvas !== l.canvas).reduce((n, l) => n + l.canvas.width * l.canvas.height * 4, 0);
    this.record({ name, icon, bytes, undo: sized(before), redo: sized(after) });
    const resized = before.width !== after.width || before.height !== after.height;
    if (resized) this.sizeScratch();
    this.changed(resized, true);
  }

  setSelection(selection: Selection | null, name: string, icon: string): void {
    if (selection === this.doc.selection) return;
    this.change(name, icon, () => {
      this.doc.selection = selection;
    });
  }

  private record(entry: Entry): void {
    this.history.push(entry);
  }

  // After the document changed: listeners are told and the image is drawn again.
  private changed(resized: boolean, selection: boolean): void {
    this.markDirty();
    if (resized) {
      this.emit('doc');
      this.view.fit();
    }
    this.emit('layers', 'pixels', 'history');
    if (selection) this.emit('selection');
  }

  undo(): void {
    if (this.tool.cancel?.()) return;
    this.travel(() => this.history.undo());
  }

  redo(): void {
    this.finish();
    this.travel(() => this.history.redo());
  }

  goTo(index: number): void {
    this.tool.cancel?.();
    this.travel(() => this.history.goTo(index));
  }

  private travel(step: () => void): void {
    const { width, height } = this.doc;
    step();
    const resized = width !== this.doc.width || height !== this.doc.height;
    if (resized) this.sizeScratch();
    this.live = null;
    this.changed(resized, true);
  }

  // Finishes whatever the tool has open, before something else changes the document.
  finish(): void {
    this.tool?.commit?.();
  }

  setTool(id: string): void {
    const tool = this.tools.find((t) => t.id === id);
    if (!tool || tool === this.tool) return;
    this.view?.abortGesture();
    if (this.tool) {
      this.tool.commit?.();
      this.tool.deactivate?.();
      this.previousTool = this.tool;
    }
    this.tool = tool;
    this.setStatus('');
    tool.activate?.();
    this.emit('tool');
    this.view.requestDraw();
  }

  setActiveLayer(index: number): void {
    if (index === this.doc.active || index < 0 || index >= this.doc.layers.length) return;
    this.finish();
    this.doc.active = index;
    this.emit('layers');
  }

  // The colour for a button: the primary one for the main button, the secondary otherwise.
  colorFor(button: 0 | 2): RGBA {
    return button === 2 ? this.secondary : this.primary;
  }

  setColor(which: 'primary' | 'secondary', color: RGBA): void {
    this[which] = color;
    this.settings[which] = toHex(color);
    this.emit('colors');
    this.storeSettings();
    this.tool?.optionsChanged?.();
  }

  // Remembers a colour that was painted with, for the "recent" row of the palette.
  useColor(color: RGBA): void {
    const hex = toHex(color);
    const recent = [hex, ...this.settings.recent.filter((h) => h !== hex)].slice(0, 10);
    if (recent.join() === this.settings.recent.join()) return;
    this.settings.recent = recent;
    this.emit('colors');
    this.storeSettings();
  }

  setting<K extends keyof Settings>(key: K, value: Settings[K]): void {
    this.settings[key] = value;
    this.storeSettings();
    this.emit('settings');
    this.tool?.optionsChanged?.();
  }

  storeSettings(): void {
    clearTimeout(this.settingsTimer);
    this.settingsTimer = window.setTimeout(() => saveSettings(this.settings), 300);
  }

  setStatus(text: string): void {
    if (text === this.status) return;
    this.status = text;
    this.emit('status');
  }
}

export const app = new App();
