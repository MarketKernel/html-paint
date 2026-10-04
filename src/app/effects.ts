// The Adjustments and Effects menus: each runs a filter from core/filters.ts on the
// current layer, inside the selection if there is one. Those with settings open a dialog
// and preview the result on the image as the settings change.

import * as F from '../core/filters';
import { N_, t } from '../core/i18n';
import { inflate, intersect, type Pixels, type Rect } from '../core/raster';
import { app } from './app';
import { cloneCanvas, copyInto, createCanvas, ctxOf, fresh, read } from './canvas';
import { form, type Field, type Values } from './ui/dialog';

export interface Effect {
  id: string;
  label: string;
  menu: 'adjustments' | 'effects';
  keys?: string[];
  // The settings, built when the dialog opens so their labels are in the current language.
  fields?: () => Field[];
  run(p: Pixels, v: Values): void;
  // How far outside the selection the filter reads, so its edge comes out right.
  margin?(v: Values): number;
}

const n = (v: Values, key: string) => Number(v[key]);

export const EFFECTS: Effect[] = [
  { id: 'auto-level', label: N_('Auto-level'), menu: 'adjustments', run: (p) => F.autoLevel(p) },
  { id: 'black-white', label: N_('Black and white'), menu: 'adjustments', keys: ['Mod+Shift+G'], run: (p) => F.blackAndWhite(p) },
  {
    id: 'brightness-contrast',
    label: N_('Brightness / Contrast'),
    menu: 'adjustments',
    fields: () => [
      { kind: 'range', id: 'brightness', label: t('Brightness'), value: 0, min: -100, max: 100 },
      { kind: 'range', id: 'contrast', label: t('Contrast'), value: 0, min: -100, max: 100 },
    ],
    run: (p, v) => F.brightnessContrast(p, n(v, 'brightness'), n(v, 'contrast')),
  },
  {
    id: 'hue-saturation',
    label: N_('Hue / Saturation'),
    menu: 'adjustments',
    keys: ['Mod+Shift+U'],
    fields: () => [
      { kind: 'range', id: 'hue', label: t('Hue'), value: 0, min: -180, max: 180, unit: '°' },
      { kind: 'range', id: 'saturation', label: t('Saturation'), value: 0, min: -100, max: 100 },
      { kind: 'range', id: 'lightness', label: t('Lightness'), value: 0, min: -100, max: 100 },
    ],
    run: (p, v) => F.hueSaturation(p, n(v, 'hue'), n(v, 'saturation'), n(v, 'lightness')),
  },
  { id: 'invert', label: N_('Invert colors'), menu: 'adjustments', keys: ['Mod+Shift+I'], run: (p) => F.invert(p) },
  {
    id: 'posterize',
    label: N_('Posterize'),
    menu: 'adjustments',
    keys: ['Mod+Shift+P'],
    fields: () => [{ kind: 'range', id: 'levels', label: t('Levels'), value: 6, min: 2, max: 64 }],
    run: (p, v) => F.posterize(p, n(v, 'levels')),
  },
  { id: 'sepia', label: N_('Sepia'), menu: 'adjustments', keys: ['Mod+Shift+E'], run: (p) => F.sepia(p) },
  {
    id: 'threshold',
    label: N_('Threshold'),
    menu: 'adjustments',
    fields: () => [{ kind: 'range', id: 'level', label: t('Level'), value: 128, min: 0, max: 255 }],
    run: (p, v) => F.threshold(p, n(v, 'level')),
  },

  {
    id: 'gaussian-blur',
    label: N_('Gaussian blur'),
    menu: 'effects',
    fields: () => [{ kind: 'range', id: 'radius', label: t('Radius'), value: 4, min: 0, max: 200, unit: 'px' }],
    run: (p, v) => F.gaussianBlur(p, n(v, 'radius')),
    margin: (v) => n(v, 'radius') * 1.5,
  },
  {
    id: 'motion-blur',
    label: N_('Motion blur'),
    menu: 'effects',
    fields: () => [
      { kind: 'range', id: 'angle', label: t('Angle'), value: 25, min: -180, max: 180, unit: '°' },
      { kind: 'range', id: 'distance', label: t('Distance'), value: 10, min: 1, max: 200, unit: 'px' },
    ],
    run: (p, v) => F.motionBlur(p, n(v, 'angle'), n(v, 'distance')),
    margin: (v) => n(v, 'distance'),
  },
  {
    id: 'sharpen',
    label: N_('Sharpen'),
    menu: 'effects',
    fields: () => [
      { kind: 'range', id: 'amount', label: t('Amount'), value: 80, min: 0, max: 500, unit: '%' },
      { kind: 'range', id: 'radius', label: t('Radius'), value: 2, min: 0.5, max: 20, step: 0.5, unit: 'px' },
    ],
    run: (p, v) => F.sharpen(p, n(v, 'amount'), n(v, 'radius')),
    margin: (v) => n(v, 'radius') * 1.5,
  },
  {
    id: 'add-noise',
    label: N_('Add noise'),
    menu: 'effects',
    fields: () => [
      { kind: 'range', id: 'intensity', label: t('Intensity'), value: 40, min: 0, max: 100 },
      { kind: 'range', id: 'saturation', label: t('Color saturation'), value: 50, min: 0, max: 100 },
      { kind: 'range', id: 'coverage', label: t('Coverage'), value: 100, min: 0, max: 100, unit: '%' },
    ],
    run: (p, v) => F.addNoise(p, n(v, 'intensity'), n(v, 'saturation'), n(v, 'coverage'), n(v, 'seed')),
  },
  {
    id: 'pixelate',
    label: N_('Pixelate'),
    menu: 'effects',
    fields: () => [{ kind: 'range', id: 'cell', label: t('Cell size'), value: 8, min: 1, max: 100, unit: 'px' }],
    run: (p, v) => F.pixelate(p, n(v, 'cell')),
  },
  {
    id: 'emboss',
    label: N_('Emboss'),
    menu: 'effects',
    fields: () => [{ kind: 'range', id: 'angle', label: t('Angle'), value: 45, min: 0, max: 360, unit: '°' }],
    run: (p, v) => F.emboss(p, n(v, 'angle')),
    margin: () => 1,
  },
  { id: 'edge-detect', label: N_('Edge detect'), menu: 'effects', run: (p) => F.edgeDetect(p), margin: () => 1 },
  {
    id: 'oil-painting',
    label: N_('Oil painting'),
    menu: 'effects',
    fields: () => [
      { kind: 'range', id: 'radius', label: t('Brush size'), value: 3, min: 1, max: 8 },
      { kind: 'range', id: 'levels', label: t('Coarseness'), value: 20, min: 3, max: 50 },
    ],
    run: (p, v) => F.oilPaint(p, n(v, 'radius'), n(v, 'levels')),
    margin: (v) => n(v, 'radius'),
  },
  {
    id: 'vignette',
    label: N_('Vignette'),
    menu: 'effects',
    fields: () => [
      { kind: 'range', id: 'radius', label: t('Radius'), value: 100, min: 10, max: 200, unit: '%' },
      { kind: 'range', id: 'strength', label: t('Strength'), value: 60, min: 0, max: 100, unit: '%' },
    ],
    run: (p, v) => F.vignette(p, n(v, 'radius'), n(v, 'strength')),
  },
];

export async function applyEffect(effect: Effect): Promise<void> {
  app.finish();
  const layer = app.layer;
  const selection = app.doc.selection;
  const preview = cloneCanvas(layer.canvas);
  const seed = Math.floor(Math.random() * 2 ** 31);

  // The part of the layer the filter sees: the selection with a margin, or all of it.
  const areaFor = (v: Values): Rect => {
    const all = app.docRect;
    if (!selection) return all;
    return intersect(inflate(selection.bounds, Math.ceil(effect.margin?.(v) ?? 0)), all) ?? all;
  };

  const render = (v: Values) => {
    const values = { ...v, seed };
    const area = areaFor(values);
    const data = read(layer.canvas, area);
    effect.run({ data: data.data, width: data.width, height: data.height }, values);
    const piece = createCanvas(area.w, area.h);
    ctxOf(piece).putImageData(data, 0, 0);
    copyInto(preview, layer.canvas);
    if (selection) {
      selection.clip(piece, area.x, area.y);
      selection.erase(preview);
      fresh(preview).drawImage(piece, area.x, area.y);
    } else {
      fresh(preview).drawImage(piece, area.x, area.y);
    }
    app.setLive({ kind: 'replace', layer, canvas: preview });
    return area;
  };

  let values: Values | null = {};
  if (effect.fields) {
    let timer = 0;
    values = await form({
      title: t(effect.label),
      fields: effect.fields(),
      preview: true,
      onInput: (v) => {
        clearTimeout(timer);
        timer = window.setTimeout(() => render(v), 60);
      },
    });
    clearTimeout(timer);
  }
  if (!values) {
    app.setLive(null);
    return;
  }
  const area = render(values);
  app.live = null;
  app.patch(effect.label, effect.menu === 'adjustments' ? 'adjust' : 'effect', layer, area, () => copyInto(layer.canvas, preview));
}
