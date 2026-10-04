// The dialogs behind menu commands: a new image, the image and canvas sizes, a layer's
// properties, the language, and About.

import { N_, t } from '../core/i18n';
import { BLEND_MODES, type BlendMode } from '../core/ora';
import { app } from './app';
import type { Layer } from './document';
import { confirmDiscard } from './io';
import { applyLanguage, LANGUAGES } from './language';
import { blankDocument, resizeCanvas, resizeImage, setLayerProps } from './ops';
import { form, showHtml } from './ui/dialog';

const MAX = 16384;

export const BLEND_LABELS: Record<BlendMode, string> = {
  normal: N_('Normal'),
  multiply: N_('Multiply'),
  additive: N_('Additive'),
  'color-burn': N_('Color burn'),
  'color-dodge': N_('Color dodge'),
  overlay: N_('Overlay'),
  screen: N_('Screen'),
  lighten: N_('Lighten'),
  darken: N_('Darken'),
  difference: N_('Difference'),
  exclusion: N_('Exclusion'),
  'hard-light': N_('Hard light'),
  'soft-light': N_('Soft light'),
  hue: N_('Hue'),
  saturation: N_('Saturation'),
  color: N_('Color'),
  luminosity: N_('Luminosity'),
};

export const blendOptions = (): [string, string][] => BLEND_MODES.map((m) => [m, t(BLEND_LABELS[m])]);

// Width and height kept in proportion: changing one changes the other.
function linked(ratio: number, keep = 'keep') {
  return (values: Record<string, unknown>, changed: string, set: (id: string, v: number) => void) => {
    if (!values[keep]) return;
    if (changed === 'width') set('height', Math.max(1, Math.round(Number(values.width) / ratio)));
    if (changed === 'height') set('width', Math.max(1, Math.round(Number(values.height) * ratio)));
  };
}

export async function newImage(): Promise<void> {
  app.finish();
  if (!(await confirmDiscard())) return;
  const values = await form({
    title: t('New image'),
    ok: t('Create'),
    fields: [
      { kind: 'number', id: 'width', label: t('Width'), value: app.doc.width, min: 1, max: MAX, unit: 'px' },
      { kind: 'number', id: 'height', label: t('Height'), value: app.doc.height, min: 1, max: MAX, unit: 'px' },
      {
        kind: 'select',
        id: 'background',
        label: t('Background'),
        value: 'white',
        options: [
          ['white', t('White')],
          ['secondary', t('Secondary color')],
          ['transparent', t('Transparent')],
        ],
      },
    ],
  });
  if (values) blankDocument(Number(values.width), Number(values.height), values.background as 'white' | 'secondary' | 'transparent');
}

export async function resizeImageDialog(): Promise<void> {
  app.finish();
  const { width, height } = app.doc;
  const values = await form({
    title: t('Resize image'),
    fields: [
      { kind: 'number', id: 'width', label: t('Width'), value: width, min: 1, max: MAX, unit: 'px' },
      { kind: 'number', id: 'height', label: t('Height'), value: height, min: 1, max: MAX, unit: 'px' },
      { kind: 'number', id: 'percent', label: t('By percentage'), value: 100, min: 1, max: 1000, unit: '%' },
      { kind: 'check', id: 'keep', label: t('Keep proportions'), value: true },
      {
        kind: 'select',
        id: 'resampling',
        label: t('Resampling'),
        value: 'smooth',
        options: [
          ['smooth', t('Smooth')],
          ['nearest', t('Nearest neighbor (pixel art)')],
        ],
      },
    ],
    onInput(values, changed, set) {
      if (changed === 'percent') {
        const k = Number(values.percent) / 100;
        set('width', Math.max(1, Math.round(width * k)));
        set('height', Math.max(1, Math.round(height * k)));
        return;
      }
      linked(width / height)(values, changed, set);
      if (changed === 'width') set('percent', Math.round((Number(values.width) / width) * 100));
    },
  });
  if (values) resizeImage(Number(values.width), Number(values.height), values.resampling === 'smooth');
}

export async function canvasSizeDialog(): Promise<void> {
  app.finish();
  const { width, height } = app.doc;
  const values = await form({
    title: t('Canvas size'),
    fields: [
      { kind: 'number', id: 'width', label: t('Width'), value: width, min: 1, max: MAX, unit: 'px' },
      { kind: 'number', id: 'height', label: t('Height'), value: height, min: 1, max: MAX, unit: 'px' },
      { kind: 'check', id: 'keep', label: t('Keep proportions'), value: false },
      { kind: 'anchor', id: 'anchor', label: t('Anchor'), value: 'c' },
    ],
    onInput: linked(width / height),
  });
  if (values) resizeCanvas(Number(values.width), Number(values.height), String(values.anchor));
}

// The changes show on the image as they are made, and go back if the dialog is cancelled.
export async function layerPropertiesDialog(layer: Layer = app.layer): Promise<void> {
  app.finish();
  const before = { name: layer.name, visible: layer.visible, opacity: layer.opacity, blend: layer.blend };
  const values = await form({
    title: t('Layer properties'),
    preview: true,
    fields: [
      { kind: 'text', id: 'name', label: t('Name'), value: layer.name },
      { kind: 'check', id: 'visible', label: t('Visible'), value: layer.visible },
      { kind: 'select', id: 'blend', label: t('Blend mode'), value: layer.blend, options: blendOptions() },
      { kind: 'range', id: 'opacity', label: t('Opacity'), value: Math.round(layer.opacity * 100), min: 0, max: 100, unit: '%' },
    ],
    onInput(v) {
      Object.assign(layer, { visible: Boolean(v.visible), blend: v.blend as BlendMode, opacity: Number(v.opacity) / 100 });
      app.markDirty();
    },
  });
  Object.assign(layer, before);
  app.markDirty();
  if (!values) return;
  // An opacity from a file (0.555) that shows as 56% stays as it was unless it was moved.
  const opacity = Number(values.opacity) === Math.round(before.opacity * 100) ? before.opacity : Number(values.opacity) / 100;
  setLayerProps(layer, { name: String(values.name).trim() || before.name, visible: Boolean(values.visible), blend: values.blend as BlendMode, opacity });
}

// Seventeen languages are too many for the View menu: they are a list in a dialog.
export async function languageDialog(): Promise<void> {
  const values = await form({
    title: t('Language'),
    fields: [{ kind: 'select', id: 'language', label: t('Language'), value: app.settings.language, options: [['auto', t('As the browser')], ...LANGUAGES.map((l): [string, string] => [l.code, l.name])] }],
  });
  if (!values) return;
  app.setting('language', String(values.language));
  applyLanguage();
}

export function about(): void {
  showHtml(
    t('About'),
    `<div class="about"><p class="about-title">HTML Paint <span class="about-version">${__APP_VERSION__}</span></p>
    <p>${t('An image editor in the spirit of Paint.NET, in one HTML file. It works offline; nothing you draw leaves this page.')}</p>
    <p>${t('Layers are kept in OpenRaster (.ora) files, which GIMP and Krita open too.')}</p></div>`,
  );
}
