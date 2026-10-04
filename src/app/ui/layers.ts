// The Layers panel: the layers top first, each with its visibility, a thumbnail and its
// name; the current one's blend mode and opacity above them, and buttons below. A layer
// is dragged to a new place in the list; a double click opens its properties.

import { N_, t } from '../../core/i18n';
import type { BlendMode } from '../../core/ora';
import { app } from '../app';
import { checkerPattern, ctxOf } from '../canvas';
import { runCommand } from '../commands';
import { icon } from '../icons';
import { reorderLayer, setLayerProps } from '../ops';
import { blendOptions, layerPropertiesDialog } from '../prompts';

const THUMB = 44;

export function mountLayers(panel: HTMLElement): void {
  const render = () => {
    const buttons: [string, string, string][] = [
      ['layer-add', 'plus', t('Add new layer')],
      ['layer-delete', 'trash', t('Delete layer')],
      ['layer-duplicate', 'duplicate', t('Duplicate layer')],
      ['layer-merge', 'merge', t('Merge layer down')],
      ['layer-up', 'up', t('Move layer up')],
      ['layer-down', 'down', t('Move layer down')],
      ['layer-properties', 'props', t('Layer properties')],
    ];
    panel.innerHTML = `<h2 class="panel-title">${t('Layers')}</h2>
      <div class="layer-controls">
        <select data-prop="blend" aria-label="${t('Blend mode')}" title="${t('Blend mode')}">${blendOptions().map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
        <label class="layer-opacity" title="${t('Opacity')}"><input type="range" data-prop="opacity" min="0" max="100" aria-label="${t('Opacity')}"><span class="layer-opacity-value"></span></label>
      </div>
      <ol class="layer-list" role="listbox" aria-label="${t('Layers')}"></ol>
      <div class="panel-buttons">${buttons
        .map(([id, ic, label]) => `<button type="button" class="icon-button small" data-command="${id}" title="${label}" aria-label="${label}">${icon(ic)}</button>`)
        .join('')}</div>`;
    list();
  };

  const list = () => {
    const ol = panel.querySelector('.layer-list');
    if (!ol) return;
    const { layers, active } = app.doc;
    ol.innerHTML = layers
      .map((layer, i) => ({ layer, i }))
      .reverse()
      .map(
        ({ layer, i }) => `<li class="layer${i === active ? ' active' : ''}${layer.visible ? '' : ' hidden-layer'}" role="option" aria-selected="${i === active}" data-index="${i}" draggable="true">
          <button type="button" class="icon-button small eye" data-eye="${i}" title="${layer.visible ? t('Hide') : t('Show')}" aria-label="${layer.visible ? t('Hide') : t('Show')}" aria-pressed="${layer.visible}">${icon(layer.visible ? 'eye' : 'eye-off')}</button>
          <canvas class="thumb" width="${THUMB}" height="${THUMB}" data-thumb="${i}"></canvas>
          <span class="layer-name">${layer.name.replace(/</g, '&lt;')}</span>
          ${layer.opacity < 1 ? `<span class="layer-badge">${Math.round(layer.opacity * 100)}%</span>` : ''}
        </li>`,
      )
      .join('');
    ol.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
    controls();
    thumbs();
  };

  const controls = () => {
    const layer = app.layer;
    const blend = panel.querySelector<HTMLSelectElement>('[data-prop="blend"]');
    const opacity = panel.querySelector<HTMLInputElement>('[data-prop="opacity"]');
    if (!blend || !opacity) return;
    blend.value = layer.blend;
    if (document.activeElement !== opacity) opacity.value = String(Math.round(layer.opacity * 100));
    panel.querySelector('.layer-opacity-value')!.textContent = `${Math.round(layer.opacity * 100)}%`;
    panel.querySelectorAll<HTMLButtonElement>('[data-command]').forEach((b) => {
      const id = b.dataset.command;
      b.disabled =
        (id === 'layer-delete' && app.doc.layers.length < 2) ||
        ((id === 'layer-merge' || id === 'layer-down') && app.doc.active === 0) ||
        (id === 'layer-up' && app.doc.active === app.doc.layers.length - 1);
    });
  };

  let pending = 0;
  // Thumbnails are redrawn once per frame at most, however many strokes come in.
  const thumbs = () => {
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      const { width, height } = app.doc;
      const k = Math.min(THUMB / width, THUMB / height);
      const w = Math.max(1, Math.round(width * k));
      const h = Math.max(1, Math.round(height * k));
      panel.querySelectorAll<HTMLCanvasElement>('[data-thumb]').forEach((c) => {
        const layer = app.doc.layers[Number(c.dataset.thumb)];
        if (!layer) return;
        const ctx = ctxOf(c);
        ctx.clearRect(0, 0, THUMB, THUMB);
        const x = (THUMB - w) / 2;
        const y = (THUMB - h) / 2;
        ctx.fillStyle = checkerPattern(ctx, 4, false);
        ctx.fillRect(x, y, w, h);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(layer.canvas, x, y, w, h);
      });
    });
  };

  // The opacity slider shows its effect at once and is one history step when let go.
  let before: number | null = null;
  panel.addEventListener('input', (e) => {
    const el = e.target as HTMLInputElement;
    if (el.dataset.prop !== 'opacity') return;
    before ??= app.layer.opacity;
    app.layer.opacity = Number(el.value) / 100;
    panel.querySelector('.layer-opacity-value')!.textContent = `${el.value}%`;
    app.markDirty();
  });
  panel.addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement | HTMLSelectElement;
    const layer = app.layer;
    if (el.dataset.prop === 'opacity') {
      const value = Number(el.value) / 100;
      if (before !== null) layer.opacity = before;
      before = null;
      setLayerProps(layer, { opacity: value }, N_('Layer opacity'));
    } else if (el.dataset.prop === 'blend') {
      setLayerProps(layer, { blend: el.value as BlendMode }, N_('Blend mode'));
    }
  });
  panel.addEventListener('click', (e) => {
    const el = e.target as HTMLElement;
    const eye = el.closest<HTMLElement>('[data-eye]');
    if (eye) {
      const layer = app.doc.layers[Number(eye.dataset.eye)]!;
      setLayerProps(layer, { visible: !layer.visible }, layer.visible ? N_('Hide layer') : N_('Show layer'));
      return;
    }
    const command = el.closest<HTMLElement>('[data-command]');
    if (command) {
      runCommand(command.dataset.command!);
      return;
    }
    const row = el.closest<HTMLElement>('[data-index]');
    if (row) app.setActiveLayer(Number(row.dataset.index));
  });
  panel.addEventListener('dblclick', (e) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>('[data-index]');
    if (row && !(e.target as HTMLElement).closest('[data-eye]')) void layerPropertiesDialog(app.doc.layers[Number(row.dataset.index)]);
  });

  // Reordering by drag and drop: the row dropped on takes the dragged layer's place.
  let dragging = -1;
  panel.addEventListener('dragstart', (e) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>('[data-index]');
    if (!row) return;
    dragging = Number(row.dataset.index);
    e.dataTransfer?.setData('text/plain', String(dragging));
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  });
  panel.addEventListener('dragover', (e) => {
    if (dragging < 0) return;
    const row = (e.target as HTMLElement).closest<HTMLElement>('[data-index]');
    if (!row) return;
    e.preventDefault();
    panel.querySelectorAll('.drop-target').forEach((r) => r.classList.remove('drop-target'));
    row.classList.add('drop-target');
  });
  panel.addEventListener('drop', (e) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>('[data-index]');
    if (dragging < 0 || !row) return;
    e.preventDefault();
    e.stopPropagation();
    const to = Number(row.dataset.index);
    const from = dragging;
    dragging = -1;
    app.finish();
    reorderLayer(from, to);
  });
  panel.addEventListener('dragend', () => {
    dragging = -1;
    panel.querySelectorAll('.drop-target').forEach((r) => r.classList.remove('drop-target'));
  });

  app.on('layers', list);
  app.on('doc', list);
  app.on('pixels', thumbs);
  app.on('lang', render);
  render();
}
