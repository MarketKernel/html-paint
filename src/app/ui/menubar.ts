// The menu bar: File, Edit, View… Once a menu is open, moving over another opens that
// one; a click outside or Esc closes it. Items show their shortcut and are dimmed when
// they cannot run.

import { t } from '../../core/i18n';
import { app } from '../app';
import { COMMANDS, commandLabel, formatKeys, MENUS, runCommand } from '../commands';
import { APP_ICON, icon } from '../icons';

export function mountMenubar(bar: HTMLElement): void {
  let openId: string | null = null;
  const dropdown = document.createElement('div');
  dropdown.className = 'menu';
  dropdown.setAttribute('role', 'menu');
  dropdown.hidden = true;
  document.body.append(dropdown);

  const render = () => {
    bar.innerHTML = `<span class="brand" title="HTML Paint">${APP_ICON}</span><nav class="menus" role="menubar">${MENUS.map((m) => `<button type="button" class="menu-button" role="menuitem" aria-haspopup="true" data-menu="${m.id}">${t(m.label)}</button>`).join('')}</nav><span class="menubar-spacer"></span><span class="quick">${quick('undo')}${quick('redo')}${quick('panels')}</span>`;
    sync();
  };

  const quick = (id: string) => {
    const c = COMMANDS.get(id)!;
    const keys = c.keys?.[0] ? ` (${formatKeys(c.keys[0])})` : '';
    return `<button type="button" class="icon-button" data-command="${id}" title="${commandLabel(c)}${keys}" aria-label="${commandLabel(c)}">${icon(c.icon ?? 'effect')}</button>`;
  };

  // Enables undo and redo as the history changes.
  const sync = () => {
    bar.querySelectorAll<HTMLButtonElement>('[data-command]').forEach((b) => {
      const c = COMMANDS.get(b.dataset.command!)!;
      b.disabled = !!c.enabled && !c.enabled();
      if (c.checked) b.setAttribute('aria-pressed', String(c.checked()));
    });
  };

  const close = () => {
    openId = null;
    dropdown.hidden = true;
    dropdown.classList.remove('menu--open');
    bar.querySelectorAll('.menu-button').forEach((b) => b.classList.remove('active'));
  };

  const show = (id: string) => {
    const menu = MENUS.find((m) => m.id === id);
    const button = bar.querySelector<HTMLElement>(`[data-menu="${id}"]`);
    if (!menu || !button) return;
    app.finish();
    openId = id;
    bar.querySelectorAll('.menu-button').forEach((b) => b.classList.toggle('active', b === button));
    dropdown.innerHTML = menu.items
      .map((item) => {
        if (item === '-') return '<div class="menu-separator" role="separator"></div>';
        const c = COMMANDS.get(item);
        if (!c) return '';
        const enabled = !c.enabled || c.enabled();
        const checked = c.checked?.();
        const keys = c.keys?.[0] ? formatKeys(c.keys[0]) : '';
        const mark = checked === undefined ? (c.icon ? icon(c.icon) : '<span class="icon"></span>') : checked ? icon('check') : '<span class="icon"></span>';
        return `<button type="button" class="menu-item" role="${checked === undefined ? 'menuitem' : 'menuitemcheckbox'}"${checked === undefined ? '' : ` aria-checked="${checked}"`} data-command="${c.id}"${enabled ? '' : ' disabled'}>${mark}<span class="menu-label">${commandLabel(c)}</span><span class="menu-keys">${keys}</span></button>`;
      })
      .join('');
    const r = button.getBoundingClientRect();
    dropdown.hidden = false;
    dropdown.classList.add('menu--open');
    dropdown.style.left = `${Math.max(4, Math.min(r.left, window.innerWidth - dropdown.offsetWidth - 4))}px`;
    dropdown.style.top = `${r.bottom + 2}px`;
    dropdown.style.maxHeight = `${window.innerHeight - r.bottom - 12}px`;
  };

  bar.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const button = target.closest<HTMLElement>('[data-menu]');
    if (button) {
      const id = button.dataset.menu!;
      if (openId === id) close();
      else show(id);
      return;
    }
    const command = target.closest<HTMLElement>('[data-command]');
    if (command) runCommand(command.dataset.command!);
  });
  bar.addEventListener('pointerover', (e) => {
    const button = (e.target as HTMLElement).closest<HTMLElement>('[data-menu]');
    if (openId && button && button.dataset.menu !== openId) show(button.dataset.menu!);
  });
  dropdown.addEventListener('click', (e) => {
    const item = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-command]');
    if (!item || item.disabled) return;
    close();
    runCommand(item.dataset.command!);
  });
  dropdown.addEventListener('keydown', (e) => {
    const items = [...dropdown.querySelectorAll<HTMLButtonElement>('.menu-item:not([disabled])')];
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      items[(at + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const i = MENUS.findIndex((m) => m.id === openId);
      show(MENUS[(i + (e.key === 'ArrowRight' ? 1 : MENUS.length - 1)) % MENUS.length]!.id);
      dropdown.querySelector<HTMLButtonElement>('.menu-item:not([disabled])')?.focus();
    }
  });
  document.addEventListener('pointerdown', (e) => {
    if (openId && !dropdown.contains(e.target as Node) && !bar.contains(e.target as Node)) close();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openId) {
      close();
      e.stopPropagation();
    }
  });
  window.addEventListener('resize', close);

  app.on('lang', render);
  app.on('history', sync);
  app.on('layers', sync);
  app.on('settings', sync);
  render();
}
