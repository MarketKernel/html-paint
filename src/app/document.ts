// The image being edited: its size, its layers (bottom first) and the selection.

import type { BlendMode } from '../core/ora';
import { clear, cloneCanvas, createCanvas, ctxOf } from './canvas';
import type { Selection } from './selection';

let nextId = 1;

export class Layer {
  readonly id = nextId++;

  constructor(
    public canvas: HTMLCanvasElement,
    public name: string,
    public visible = true,
    public opacity = 1,
    public blend: BlendMode = 'normal',
  ) {}

  get ctx(): CanvasRenderingContext2D {
    return ctxOf(this.canvas);
  }

  copy(name = this.name): Layer {
    return new Layer(cloneCanvas(this.canvas), name, this.visible, this.opacity, this.blend);
  }
}

// What a history entry for a whole-document change keeps: canvases by reference, as an
// operation that changes a layer's size or orientation puts a new canvas in its place.
export interface DocState {
  width: number;
  height: number;
  active: number;
  selection: Selection | null;
  layers: { layer: Layer; canvas: HTMLCanvasElement; name: string; visible: boolean; opacity: number; blend: BlendMode }[];
}

export class PaintDocument {
  layers: Layer[] = [];
  active = 0;
  selection: Selection | null = null;
  // Where it was opened from or last saved to, to save there again with ⌘S.
  file: { name: string; handle?: FileSystemFileHandle } | null = null;

  constructor(
    public width: number,
    public height: number,
    public name: string,
  ) {}

  get layer(): Layer {
    return this.layers[this.active]!;
  }

  newLayerCanvas(): HTMLCanvasElement {
    return createCanvas(this.width, this.height);
  }

  // A plain image: one layer, filled with a colour or left transparent.
  static blank(width: number, height: number, name: string, background: string | null, layerName: string): PaintDocument {
    const doc = new PaintDocument(width, height, name);
    const canvas = createCanvas(width, height);
    if (background) {
      const ctx = clear(canvas);
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
    }
    doc.layers.push(new Layer(canvas, layerName));
    return doc;
  }

  snapshot(): DocState {
    return {
      width: this.width,
      height: this.height,
      active: this.active,
      selection: this.selection,
      layers: this.layers.map((layer) => ({ layer, canvas: layer.canvas, name: layer.name, visible: layer.visible, opacity: layer.opacity, blend: layer.blend })),
    };
  }

  restore(s: DocState): void {
    this.width = s.width;
    this.height = s.height;
    this.selection = s.selection;
    this.layers = s.layers.map((l) => {
      Object.assign(l.layer, { canvas: l.canvas, name: l.name, visible: l.visible, opacity: l.opacity, blend: l.blend });
      return l.layer;
    });
    this.active = Math.min(s.active, this.layers.length - 1);
  }

  // A name not yet used, "Layer 2", "Layer 3"…, for a new layer.
  freshName(base: string): string {
    const used = new Set(this.layers.map((l) => l.name));
    for (let n = this.layers.length + 1; ; n++) {
      const name = `${base} ${n}`;
      if (!used.has(name)) return name;
    }
  }
}
