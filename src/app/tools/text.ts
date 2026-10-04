// Text, typed in place. A click puts a text box there: a textarea over the image whose
// own letters are invisible, so what shows is the text as it will be drawn, in the font,
// size and colour chosen. Clicking elsewhere, another tool or ⌘Enter puts it on the
// layer; Esc throws it away.

import { toCss, type RGBA } from '../../core/color';
import { N_ } from '../../core/i18n';
import { inflate, type Rect } from '../../core/raster';
import { app } from '../app';
import { clear, harden } from '../canvas';
import type { Tool } from './tool';

export const FONTS = ['sans-serif', 'serif', 'monospace', 'system-ui', 'Arial', 'Helvetica', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Georgia', 'Times New Roman', 'Courier New', 'Impact', 'Comic Sans MS'];

interface Edit {
  x: number;
  y: number;
  color: RGBA;
  area: HTMLTextAreaElement;
  rect: Rect | null;
}

let edit: Edit | null = null;
let host: HTMLElement | null = null;

export function setTextHost(element: HTMLElement): void {
  host = element;
  app.on('view', place);
}

function font(size: number): string {
  const s = app.settings;
  // A family with a space in its name needs quotes; a list or a quoted name is left alone.
  const family = /\s/.test(s.font) && !/[",']/.test(s.font) ? `"${s.font}"` : s.font;
  return `${s.italic ? 'italic ' : ''}${s.bold ? 'bold ' : ''}${size}px ${family}`;
}

const lineHeight = () => Math.round(app.settings.fontSize * 1.25);

// Draws the text onto app.stroke and fits the text box around it.
function render(): void {
  if (!edit) return;
  const s = app.settings;
  const lines = edit.area.value.split('\n');
  const ctx = clear(app.stroke);
  ctx.font = font(s.fontSize);
  ctx.textBaseline = 'top';
  // Without antialiasing, opaque letters shown at the colour's opacity (see shapes.ts).
  ctx.fillStyle = toCss(s.antialias ? edit.color : { ...edit.color, a: 255 });
  const widths = lines.map((l) => ctx.measureText(l).width);
  const box = Math.max(0, ...widths);
  const lh = lineHeight();
  lines.forEach((line, i) => {
    const x = edit!.x + (box - widths[i]!) * (s.align === 'center' ? 0.5 : s.align === 'right' ? 1 : 0);
    const y = edit!.y + i * lh + (lh - s.fontSize) / 2;
    ctx.fillText(line, x, y);
    if (s.underline && line) ctx.fillRect(x, y + s.fontSize * 1.02, widths[i]!, Math.max(1, s.fontSize / 14));
  });
  edit.rect = inflate({ x: edit.x, y: edit.y, w: box, h: lines.length * lh }, s.fontSize * 0.5 + 2);
  if (!s.antialias) harden(app.stroke, clip(edit.rect));
  app.setLive({ kind: 'paint', layer: app.layer, canvas: app.stroke, alpha: s.antialias ? 1 : edit.color.a / 255 });
  place();
}

function clip(r: Rect): Rect {
  const x = Math.max(0, r.x);
  const y = Math.max(0, r.y);
  return { x, y, w: Math.max(0, Math.min(app.doc.width, r.x + r.w) - x), h: Math.max(0, Math.min(app.doc.height, r.y + r.h) - y) };
}

// Keeps the text box over the text as the view zooms and scrolls.
function place(): void {
  if (!edit) return;
  const { area } = edit;
  const z = app.view.zoom;
  const p = app.view.toScreen(edit.x, edit.y);
  const s = app.settings;
  const lines = area.value.split('\n');
  const ctx = app.stroke.getContext('2d')!;
  ctx.font = font(s.fontSize);
  const box = Math.max(s.fontSize * 0.6, ...lines.map((l) => ctx.measureText(l).width));
  Object.assign(area.style, {
    left: `${p.x - 3}px`,
    top: `${p.y - 3}px`,
    width: `${box * z + s.fontSize * z + 8}px`,
    height: `${lines.length * lineHeight() * z + 6}px`,
    font: font(s.fontSize * z),
    lineHeight: `${lineHeight() * z}px`,
    textAlign: s.align,
    caretColor: toCss({ ...edit.color, a: 255 }),
  });
}

function start(x: number, y: number, color: RGBA): void {
  if (!host) return;
  const area = document.createElement('textarea');
  area.className = 'text-editor';
  area.spellcheck = false;
  area.setAttribute('autocomplete', 'off');
  area.addEventListener('input', render);
  area.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      discard();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      finish();
    }
  });
  host.append(area);
  edit = { x: Math.round(x), y: Math.round(y), color, area, rect: null };
  render();
  // After the pointer is released, or the click would take the focus back.
  setTimeout(() => area.focus(), 0);
}

function finish(): void {
  const e = edit;
  if (!e) return;
  edit = null;
  e.area.remove();
  if (e.area.value.trim()) {
    app.commitLive(N_('Text'), 'text', e.rect);
    app.useColor(e.color);
  } else {
    app.setLive(null);
  }
}

function discard(): boolean {
  const e = edit;
  if (!e) return false;
  edit = null;
  e.area.remove();
  app.setLive(null);
  return true;
}

export const text: Tool = {
  id: 'text',
  label: N_('Text'),
  hint: N_('Click to type. Click elsewhere or press Ctrl+Enter (⌘Enter) to apply, Esc to cancel.'),
  key: 'T',
  icon: 'text',
  cursor: 'text',
  options: ['font', 'fontSize', 'textStyle', 'align', 'antialias'],
  down(e) {
    finish();
    start(e.x, e.y, app.colorFor(e.button));
  },
  commit: finish,
  cancel: discard,
  abort() {},
  deactivate: finish,
  // The text box keeps its text while the toolbar has the focus; the change shows at once.
  optionsChanged: render,
};
