// The History panel and the status bar.

import { t } from '../../core/i18n';
import { app } from '../app';
import { icon } from '../icons';

// Every step, the first being the image as opened; a click goes back (or forward) to it.
export function mountHistory(panel: HTMLElement): void {
  const render = () => {
    panel.innerHTML = `<h2 class="panel-title">${t('History')}</h2><ol class="history-list" role="listbox" aria-label="${t('History')}"></ol>`;
    list();
  };
  const list = () => {
    const ol = panel.querySelector('.history-list');
    if (!ol) return;
    const { entries, index } = app.history;
    const rows = [{ name: app.doc.file ? t('Open image') : t('New image'), icon: 'image' }, ...entries];
    ol.innerHTML = rows
      .map((e, i) => `<li class="history-item${i === index ? ' active' : ''}${i > index ? ' undone' : ''}" role="option" aria-selected="${i === index}" data-step="${i}">${icon(e.icon)}<span>${t(e.name)}</span></li>`)
      .join('');
    ol.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
  };
  panel.addEventListener('click', (e) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>('[data-step]');
    if (row) app.goTo(Number(row.dataset.step));
  });
  app.on('history', list);
  app.on('lang', render);
  render();
}

const ZOOMS = [1 / 8, 1 / 4, 1 / 3, 1 / 2, 2 / 3, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32];

export function mountStatus(bar: HTMLElement): void {
  const render = () => {
    bar.innerHTML = `<span class="status-hint" aria-live="polite"></span>
      <span class="status-cell" data-cell="cursor" title="${t('Pointer position')}"></span>
      <span class="status-cell" data-cell="selection" title="${t('Selection size')}"></span>
      <span class="status-cell" data-cell="size" title="${t('Image size')}"></span>
      <span class="zoom">
        <button type="button" class="icon-button small" data-zoom="out" title="${t('Zoom out')}" aria-label="${t('Zoom out')}">${icon('zoom-out')}</button>
        <select data-zoom="pick" aria-label="${t('Zoom')}"></select>
        <button type="button" class="icon-button small" data-zoom="in" title="${t('Zoom in')}" aria-label="${t('Zoom in')}">${icon('zoom-in')}</button>
        <button type="button" class="icon-button small" data-zoom="fit" title="${t('Zoom to window')}" aria-label="${t('Zoom to window')}">${icon('fit')}</button>
      </span>`;
    update();
  };
  const cell = (name: string, text: string) => {
    const el = bar.querySelector<HTMLElement>(`[data-cell="${name}"]`);
    if (el && el.textContent !== text) el.textContent = text;
  };
  const update = () => {
    const hint = bar.querySelector('.status-hint');
    if (hint) {
      const text = app.status || (app.tool ? t(app.tool.hint) : '');
      if (hint.textContent !== text) hint.textContent = text;
    }
    const c = app.view?.cursor;
    const inside = c && c.x >= 0 && c.y >= 0 && c.x < app.doc.width && c.y < app.doc.height;
    cell('cursor', inside ? `${Math.floor(c.x)}, ${Math.floor(c.y)}` : '');
    const s = app.doc.selection;
    cell('selection', s ? `▭ ${s.bounds.w} × ${s.bounds.h}` : '');
    cell('size', `${app.doc.width} × ${app.doc.height}`);
    const pick = bar.querySelector<HTMLSelectElement>('[data-zoom="pick"]');
    if (pick && app.view) {
      const z = app.view.zoom;
      const label = (v: number) => `${Math.round(v * 1000) / 10}%`;
      const options = ZOOMS.some((v) => Math.abs(v - z) < 1e-6) ? ZOOMS : [...ZOOMS, z].sort((a, b) => a - b);
      const html = options.map((v) => `<option value="${v}"${Math.abs(v - z) < 1e-6 ? ' selected' : ''}>${label(v)}</option>`).join('');
      if (pick.dataset.html !== html) {
        pick.innerHTML = html;
        pick.dataset.html = html;
      }
    }
  };
  bar.addEventListener('click', (e) => {
    const action = (e.target as HTMLElement).closest<HTMLElement>('[data-zoom]')?.dataset.zoom;
    if (action === 'in') app.view.zoomStep(1);
    else if (action === 'out') app.view.zoomStep(-1);
    else if (action === 'fit') app.view.fit();
  });
  bar.addEventListener('change', (e) => {
    const el = e.target as HTMLSelectElement;
    if (el.dataset.zoom === 'pick') app.view.zoomTo(Number(el.value));
  });
  for (const event of ['view', 'status', 'tool', 'selection', 'doc'] as const) app.on(event, update);
  app.on('lang', render);
  render();
}
