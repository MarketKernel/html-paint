// The Colors panel: the primary and secondary colours (a click on one makes it the one
// edited), a saturation-and-value square, hue and alpha bars, the hex code, Paint.NET's
// palette (left click: primary, right click: secondary) and the colours used lately.

import { DEFAULT_PALETTE, hsvToRgb, parseHex, rgbToHsv, sameColor, toCss, toHex, type HSV, type RGBA } from '../../core/color';
import { t } from '../../core/i18n';
import { app } from '../app';
import { checkerPattern, ctxOf } from '../canvas';
import { icon } from '../icons';

export function mountColors(panel: HTMLElement): void {
  let target: 'primary' | 'secondary' = 'primary';
  // Hue and saturation are kept here, so a grey or black does not lose them.
  let hsv: HSV = rgbToHsv(app.primary);
  let alpha = app.primary.a;
  let shown: RGBA = app.primary;

  const render = () => {
    panel.innerHTML = `<h2 class="panel-title">${t('Colors')}</h2>
      <div class="colors-top">
        <div class="swatches">
          <button type="button" class="swatch swatch--secondary" data-target="secondary" title="${t('Secondary color')}" aria-label="${t('Secondary color')}"><span></span></button>
          <button type="button" class="swatch swatch--primary" data-target="primary" title="${t('Primary color')}" aria-label="${t('Primary color')}"><span></span></button>
        </div>
        <div class="swatch-actions">
          <button type="button" class="icon-button small" data-action="swap" title="${t('Swap colors')} (X)" aria-label="${t('Swap colors')}">${icon('swap')}</button>
          <button type="button" class="icon-button small" data-action="reset" title="${t('Black and white')} (D)" aria-label="${t('Black and white')}">${icon('reset')}</button>
        </div>
        <div class="color-fields">
          <label class="hex"><span>HEX</span><input type="text" data-field="hex" spellcheck="false" autocomplete="off" maxlength="9"></label>
          <label class="hex"><span>${t('Alpha')}</span><input type="number" data-field="alpha" min="0" max="255"></label>
        </div>
      </div>
      <div class="picker">
        <canvas class="sv" width="200" height="120"></canvas>
        <canvas class="hue" width="14" height="120"></canvas>
      </div>
      <canvas class="alpha" width="232" height="14"></canvas>
      <div class="palette">${DEFAULT_PALETTE.map((hex) => `<button type="button" class="chip" data-hex="${hex}" style="--chip:${hex}" title="${hex}" aria-label="${hex}"></button>`).join('')}</div>
      <div class="recent" aria-label="${t('Recent colors')}"></div>`;
    bind();
    sync(true);
  };

  const current = () => (target === 'primary' ? app.primary : app.secondary);

  const pushColor = () => {
    shown = hsvToRgb(hsv, alpha);
    app.setColor(target, shown);
  };

  // From the app's colour to the controls; hue and saturation stay put when the colour
  // has none of its own (greys).
  const sync = (force = false) => {
    const c = current();
    if (force || !sameColor(c, shown)) {
      const next = rgbToHsv(c);
      if (next.s === 0 || next.v === 0) next.h = hsv.h;
      if (next.v === 0) next.s = hsv.s;
      hsv = next;
      alpha = c.a;
      shown = c;
    }
    const swatch = (which: 'primary' | 'secondary') => panel.querySelector<HTMLElement>(`.swatch--${which} span`);
    swatch('primary')!.style.background = toCss(app.primary);
    swatch('secondary')!.style.background = toCss(app.secondary);
    panel.querySelectorAll('.swatch').forEach((s) => s.classList.toggle('editing', (s as HTMLElement).dataset.target === target));
    const hex = panel.querySelector<HTMLInputElement>('[data-field="hex"]')!;
    if (document.activeElement !== hex) hex.value = toHex(c, false);
    const a = panel.querySelector<HTMLInputElement>('[data-field="alpha"]')!;
    if (document.activeElement !== a) a.value = String(c.a);
    draw();
    const recent = panel.querySelector('.recent')!;
    recent.innerHTML = app.settings.recent.map((h) => `<button type="button" class="chip" data-hex="${h}" style="--chip:${toCss(parseHex(h) ?? { r: 0, g: 0, b: 0, a: 0 })}" title="${h}" aria-label="${h}"></button>`).join('');
  };

  const draw = () => {
    const sv = panel.querySelector<HTMLCanvasElement>('.sv')!;
    const hue = panel.querySelector<HTMLCanvasElement>('.hue')!;
    const al = panel.querySelector<HTMLCanvasElement>('.alpha')!;
    let ctx = ctxOf(sv);
    const { width: w, height: h } = sv;
    ctx.fillStyle = toCss(hsvToRgb({ h: hsv.h, s: 1, v: 1 }));
    ctx.fillRect(0, 0, w, h);
    let g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#fff');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, '#000');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    marker(ctx, hsv.s * w, (1 - hsv.v) * h);

    ctx = ctxOf(hue);
    g = ctx.createLinearGradient(0, 0, 0, hue.height);
    for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, toCss(hsvToRgb({ h: i * 60, s: 1, v: 1 })));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, hue.width, hue.height);
    bar(ctx, (hsv.h / 360) * hue.height, hue.width, true);

    ctx = ctxOf(al);
    ctx.fillStyle = checkerPattern(ctx, 4, false);
    ctx.fillRect(0, 0, al.width, al.height);
    g = ctx.createLinearGradient(0, 0, al.width, 0);
    const c = hsvToRgb(hsv);
    g.addColorStop(0, toCss({ ...c, a: 0 }));
    g.addColorStop(1, toCss({ ...c, a: 255 }));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, al.width, al.height);
    bar(ctx, (alpha / 255) * al.width, al.height, false);
  };

  const marker = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.stroke();
  };

  const bar = (ctx: CanvasRenderingContext2D, at: number, size: number, horizontal: boolean) => {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    if (horizontal) {
      ctx.fillRect(0, at - 2, size, 4);
      ctx.strokeRect(0.5, at - 2.5, size - 1, 5);
    } else {
      ctx.fillRect(at - 2, 0, 4, size);
      ctx.strokeRect(at - 2.5, 0.5, 5, size - 1);
    }
  };

  // Dragging on a canvas: fn gets the position as 0–1 across and down.
  const drag = (canvas: HTMLCanvasElement, fn: (x: number, y: number) => void) => {
    const at = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      fn(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)));
    };
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      at(e);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (canvas.hasPointerCapture(e.pointerId)) at(e);
    });
  };

  const bind = () => {
    drag(panel.querySelector('.sv')!, (x, y) => {
      hsv = { ...hsv, s: x, v: 1 - y };
      pushColor();
    });
    drag(panel.querySelector('.hue')!, (_, y) => {
      hsv = { ...hsv, h: Math.min(359.99, y * 360) };
      pushColor();
    });
    drag(panel.querySelector('.alpha')!, (x) => {
      alpha = Math.round(x * 255);
      pushColor();
    });
  };

  panel.addEventListener('click', (e) => {
    const el = e.target as HTMLElement;
    const swatch = el.closest<HTMLElement>('[data-target]');
    if (swatch) {
      target = swatch.dataset.target as 'primary' | 'secondary';
      sync(true);
      return;
    }
    const action = el.closest<HTMLElement>('[data-action]')?.dataset.action;
    if (action === 'swap') {
      const { primary, secondary } = app;
      app.setColor('primary', secondary);
      app.setColor('secondary', primary);
    } else if (action === 'reset') {
      app.setColor('primary', parseHex('#000000')!);
      app.setColor('secondary', parseHex('#FFFFFF')!);
    }
    const chip = el.closest<HTMLElement>('[data-hex]');
    if (chip) app.setColor('primary', parseHex(chip.dataset.hex!)!);
  });
  panel.addEventListener('contextmenu', (e) => {
    const chip = (e.target as HTMLElement).closest<HTMLElement>('[data-hex]');
    if (!chip) return;
    e.preventDefault();
    app.setColor('secondary', parseHex(chip.dataset.hex!)!);
  });
  panel.addEventListener('input', (e) => {
    const el = e.target as HTMLInputElement;
    const c = current();
    if (el.dataset.field === 'hex') {
      const parsed = parseHex(el.value);
      if (parsed) app.setColor(target, { ...parsed, a: el.value.replace('#', '').length > 6 ? parsed.a : c.a });
    } else if (el.dataset.field === 'alpha') {
      const a = Number(el.value);
      if (Number.isFinite(a)) app.setColor(target, { ...c, a: Math.max(0, Math.min(255, Math.round(a))) });
    }
  });

  app.on('colors', () => sync());
  app.on('lang', render);
  render();
}
