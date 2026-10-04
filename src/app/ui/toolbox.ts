// The toolbox, and the bar above the image with the current tool's options.

import { t } from '../../core/i18n';
import { app } from '../app';
import { icon } from '../icons';
import type { Settings } from '../settings';
import { FONTS } from '../tools/text';
import type { OptionId } from '../tools/tool';

export function mountToolbox(box: HTMLElement): void {
  const render = () => {
    box.innerHTML = app.tools
      .map((tool) => `<button type="button" class="tool" data-tool="${tool.id}" title="${t(tool.label)} (${tool.key})" aria-label="${t(tool.label)}" aria-pressed="${tool === app.tool}">${icon(tool.icon)}</button>`)
      .join('');
  };
  box.addEventListener('click', (e) => {
    const button = (e.target as HTMLElement).closest<HTMLElement>('[data-tool]');
    if (button) app.setTool(button.dataset.tool!);
  });
  app.on('tool', () => box.querySelectorAll<HTMLElement>('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === app.tool.id))));
  app.on('lang', render);
  render();
}

type Key = keyof Settings;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

// A number with a slider beside it, both bound to one setting.
function slider(key: Key, label: string, min: number, max: number, unit = ''): string {
  const v = app.settings[key] as number;
  return `<label class="opt opt--slider"><span class="opt-label">${esc(label)}</span><input type="range" data-key="${key}" min="${min}" max="${max}" value="${v}" aria-label="${esc(label)}"><input type="number" data-key="${key}" min="${min}" max="${max}" value="${v}" aria-label="${esc(label)}">${unit ? `<span class="unit">${unit}</span>` : ''}</label>`;
}

function segmented(key: Key, label: string, choices: [string, string, string][]): string {
  const v = String(app.settings[key]);
  return `<span class="opt"><span class="opt-label">${esc(label)}</span><span class="segmented" role="radiogroup" aria-label="${esc(label)}">${choices
    .map(([value, ic, title]) => `<button type="button" role="radio" data-key="${key}" data-value="${value}" aria-checked="${value === v}" title="${esc(title)}" aria-label="${esc(title)}">${icon(ic)}</button>`)
    .join('')}</span></span>`;
}

function toggle(key: Key, title: string, ic: string): string {
  return `<button type="button" class="opt-toggle" data-key="${key}" data-toggle aria-pressed="${Boolean(app.settings[key])}" title="${esc(title)}" aria-label="${esc(title)}">${icon(ic)}</button>`;
}

function select(key: Key, label: string, choices: [string, string][]): string {
  const v = String(app.settings[key]);
  return `<label class="opt"><span class="opt-label">${esc(label)}</span><select data-key="${key}">${choices.map(([value, text]) => `<option value="${esc(value)}"${value === v ? ' selected' : ''}>${esc(text)}</option>`).join('')}</select></label>`;
}

const OPTIONS: Record<OptionId, () => string> = {
  size: () => slider('brushSize', t('Brush width'), 1, 400, 'px'),
  hardness: () => slider('hardness', t('Hardness'), 0, 100, '%'),
  opacity: () => slider('opacity', t('Opacity'), 1, 100, '%'),
  antialias: () => `<span class="opt">${toggle('antialias', t('Antialiasing'), app.settings.antialias ? 'aa-on' : 'aa-off')}</span>`,
  tolerance: () => slider('tolerance', t('Tolerance'), 0, 100, '%'),
  floodMode: () =>
    segmented('floodMode', t('Flood mode'), [
      ['contiguous', 'contiguous', t('Contiguous')],
      ['global', 'global', t('Global')],
    ]),
  sampling: () =>
    select('sampling', t('Sampling'), [
      ['layer', t('Layer')],
      ['image', t('Image')],
    ]),
  shapeStyle: () =>
    segmented('shapeStyle', t('Style'), [
      ['outline', 'shape-outline', t('Outline')],
      ['fill', 'shape-fill', t('Fill')],
      ['both', 'shape-both', t('Outline and fill')],
    ]),
  dash: () =>
    select('dash', t('Dashes'), [
      ['solid', t('Solid')],
      ['dash', t('Dashed')],
      ['dot', t('Dotted')],
    ]),
  radius: () => slider('radius', t('Corner radius'), 0, 200, 'px'),
  arrows: () =>
    select('arrows', t('Arrows'), [
      ['none', t('None')],
      ['end', t('At the end')],
      ['both', t('At both ends')],
    ]),
  gradient: () =>
    segmented('gradient', t('Type'), [
      ['linear', 'gradient-linear', t('Linear')],
      ['reflected', 'gradient-reflected', t('Reflected')],
      ['radial', 'gradient-radial', t('Radial')],
      ['conic', 'gradient-conic', t('Conical')],
    ]),
  selectMode: () =>
    segmented('selectMode', t('Mode'), [
      ['replace', 'mode-replace', t('Replace')],
      ['add', 'mode-add', t('Add (Shift)')],
      ['subtract', 'mode-subtract', t('Subtract (Alt)')],
      ['intersect', 'mode-intersect', t('Intersect (Shift+Alt)')],
    ]),
  font: () =>
    `<label class="opt"><span class="opt-label">${t('Font')}</span><input type="text" class="opt-font" data-key="font" list="font-list" value="${esc(app.settings.font)}" spellcheck="false"><datalist id="font-list">${FONTS.map((f) => `<option value="${esc(f)}">`).join('')}</datalist></label>`,
  fontSize: () => `<label class="opt"><span class="opt-label">${t('Size')}</span><input type="number" data-key="fontSize" min="4" max="1000" value="${app.settings.fontSize}"><span class="unit">px</span></label>`,
  textStyle: () => `<span class="opt opt--group">${toggle('bold', t('Bold'), 'bold')}${toggle('italic', t('Italic'), 'italic')}${toggle('underline', t('Underline'), 'underline')}</span>`,
  align: () =>
    segmented('align', t('Align'), [
      ['left', 'align-left', t('Left')],
      ['center', 'align-center', t('Center')],
      ['right', 'align-right', t('Right')],
    ]),
  density: () => slider('density', t('Density'), 1, 100, '%'),
  pickerAfter: () =>
    select('pickerAfter', t('After picking'), [
      ['stay', t('Keep the color picker')],
      ['previous', t('Go back to the previous tool')],
    ]),
  moveHint: () => `<span class="opt-hint">${t('Handles scale; drag outside to rotate; Enter to finish.')}</span>`,
  cloneHint: () => `<span class="opt-hint">${t('Ctrl+click (⌘+click) sets the source.')}</span>`,
};

export function mountOptions(bar: HTMLElement): void {
  const render = () => {
    const tool = app.tool;
    bar.innerHTML = `<span class="opt-tool">${icon(tool.icon)}<span>${t(tool.label)}</span></span>${tool.options.map((o) => OPTIONS[o]()).join('')}`;
  };

  // Keeps the controls in step with settings changed elsewhere ([ and ] for the brush
  // size), leaving alone the one being typed in.
  const sync = () => {
    bar.querySelectorAll<HTMLElement>('[data-key]').forEach((el) => {
      if (el === document.activeElement && el instanceof HTMLInputElement && el.type !== 'range') return;
      const value = app.settings[el.dataset.key as Key];
      if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) el.value = String(value);
      else if ('toggle' in el.dataset) {
        el.setAttribute('aria-pressed', String(Boolean(value)));
        if (el.dataset.key === 'antialias') el.innerHTML = icon(value ? 'aa-on' : 'aa-off');
      } else if (el.dataset.value !== undefined) el.setAttribute('aria-checked', String(el.dataset.value === String(value)));
    });
  };

  const set = (key: Key, raw: string | boolean) => {
    const current = app.settings[key];
    let value: unknown = raw;
    if (typeof current === 'number') {
      const n = Number(raw);
      if (!Number.isFinite(n)) return;
      const input = bar.querySelector<HTMLInputElement>(`input[type="number"][data-key="${key}"]`);
      value = Math.max(Number(input?.min ?? -Infinity), Math.min(Number(input?.max ?? Infinity), n));
    }
    app.setting(key, value as never);
  };

  bar.addEventListener('input', (e) => {
    const el = e.target as HTMLInputElement | HTMLSelectElement;
    const key = el.dataset.key as Key | undefined;
    if (key && el.value !== '') set(key, el.value);
  });
  bar.addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement;
    if (el.dataset.key && el.type === 'number') sync();
  });
  bar.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('button[data-key]');
    if (!el) return;
    const key = el.dataset.key as Key;
    if ('toggle' in el.dataset) set(key, !app.settings[key]);
    else if (el.dataset.value !== undefined) set(key, el.dataset.value);
  });

  app.on('tool', render);
  app.on('lang', render);
  app.on('settings', sync);
  render();
}
