// Every command the menus offer, with its keyboard shortcut, and the keyboard itself:
// shortcuts, a letter for each tool (pressed again it goes on to the next tool with the
// same letter), X to swap the colours, D for black and white, [ and ] for the brush size.
// Shortcuts go by the key's place on the keyboard, so they work in any layout. A few of
// Paint.NET's own cannot be had in a browser (⌘H and ⌘M on a Mac, Ctrl+Shift+N in
// Chrome): those commands have another key too.

import { DEFAULT_PALETTE, parseHex } from '../core/color';
import { N_, t } from '../core/i18n';
import { app } from './app';
import { applyEffect, EFFECTS } from './effects';
import { importLayers, open, save, saveAs } from './io';
import { applyLanguage, applyTheme, LANGUAGES } from './language';
import * as ops from './ops';
import { about, canvasSizeDialog, languageDialog, layerPropertiesDialog, newImage, resizeImageDialog } from './prompts';
import { showHtml } from './ui/dialog';
import { isTyping } from './view';

export interface Command {
  id: string;
  // English, translated where shown; a function for a label that is not a fixed string.
  label: string | (() => string);
  keys?: string[];
  icon?: string;
  run(): unknown;
  enabled?(): boolean;
  checked?(): boolean;
}

const hasSelection = () => !!app.doc.selection;
const manyLayers = () => app.doc.layers.length > 1;

export const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform) || /Mac OS X/.test(navigator.userAgent);

// The paste shortcuts do not paste themselves: they let the browser's paste event through
// (which brings the clipboard's image without asking for permission) and say where to.
let pasteTarget: ops.PasteTarget = 'layer';

const commands: Command[] = [
  { id: 'new', label: N_('New…'), keys: ['Mod+Alt+N'], icon: 'image', run: newImage },
  { id: 'open', label: N_('Open…'), keys: ['Mod+O'], icon: 'open', run: open },
  { id: 'save', label: N_('Save'), keys: ['Mod+S'], icon: 'save', run: save },
  { id: 'save-as', label: N_('Save as…'), keys: ['Mod+Shift+S'], run: saveAs },

  { id: 'undo', label: N_('Undo'), keys: ['Mod+Z'], icon: 'undo', run: () => app.undo(), enabled: () => app.history.canUndo || !!app.live },
  { id: 'redo', label: N_('Redo'), keys: ['Mod+Y', 'Mod+Shift+Z'], icon: 'redo', run: () => app.redo(), enabled: () => app.history.canRedo },
  { id: 'cut', label: N_('Cut'), keys: ['Mod+X'], icon: 'cut', run: ops.cut },
  { id: 'copy', label: N_('Copy'), keys: ['Mod+C'], icon: 'duplicate', run: () => ops.copy() },
  { id: 'copy-merged', label: N_('Copy merged'), keys: ['Mod+Shift+C'], run: () => ops.copy(true) },
  { id: 'paste', label: N_('Paste'), keys: ['Mod+V'], icon: 'paste', run: () => ops.pasteFromClipboard('layer') },
  { id: 'paste-layer', label: N_('Paste into new layer'), keys: ['Mod+Shift+V'], run: () => ops.pasteFromClipboard('new-layer') },
  { id: 'paste-image', label: N_('Paste into new image'), keys: ['Mod+Alt+V'], run: () => ops.pasteFromClipboard('new-image') },
  { id: 'select-all', label: N_('Select all'), keys: ['Mod+A'], icon: 'select', run: ops.selectAll },
  { id: 'deselect', label: N_('Deselect'), keys: ['Mod+D'], icon: 'deselect', run: ops.deselect, enabled: hasSelection },
  { id: 'invert-selection', label: N_('Invert selection'), keys: ['Mod+I'], run: ops.invertSelection },
  { id: 'erase-selection', label: N_('Erase selection'), keys: ['Delete'], icon: 'eraser', run: () => ops.eraseSelection() },
  { id: 'fill-selection', label: N_('Fill selection'), keys: ['Backspace'], icon: 'fill', run: ops.fillSelection },

  { id: 'zoom-in', label: N_('Zoom in'), keys: ['Mod+=', 'Mod++'], icon: 'zoom-in', run: () => app.view.zoomStep(1) },
  { id: 'zoom-out', label: N_('Zoom out'), keys: ['Mod+-'], icon: 'zoom-out', run: () => app.view.zoomStep(-1) },
  { id: 'zoom-fit', label: N_('Zoom to window'), keys: ['Mod+B'], icon: 'fit', run: () => app.view.fit() },
  { id: 'zoom-actual', label: N_('Actual size'), keys: ['Mod+0'], run: () => app.view.actualSize() },
  { id: 'grid', label: N_('Pixel grid'), keys: ["Mod+'"], run: () => app.setting('grid', !app.settings.grid), checked: () => app.settings.grid },
  { id: 'panels', label: N_('Panels'), keys: ['F8'], icon: 'panel', run: () => app.setting('panels', !app.settings.panels), checked: () => app.settings.panels },
  ...(['auto', 'light', 'dark'] as const).map((theme) => ({
    id: `theme-${theme}`,
    label: { auto: N_('Theme: as the system'), light: N_('Theme: light'), dark: N_('Theme: dark') }[theme],
    run: () => {
      app.setting('theme', theme);
      applyTheme();
    },
    checked: () => app.settings.theme === theme,
  })),
  { id: 'language', label: N_('Language…'), run: languageDialog },
  // Not in a menu; the dialog above chooses. They let the tests and paintRun switch.
  {
    id: 'language-auto',
    label: N_('Language: as the browser'),
    run: () => {
      app.setting('language', 'auto');
      applyLanguage();
    },
    checked: () => app.settings.language === 'auto',
  },
  ...LANGUAGES.map((l) => ({
    id: `language-${l.code}`,
    label: () => l.name,
    run: () => {
      app.setting('language', l.code);
      applyLanguage();
    },
    checked: () => app.settings.language === l.code,
  })),

  { id: 'crop', label: N_('Crop to selection'), keys: ['Mod+Shift+X'], icon: 'crop', run: ops.cropToSelection, enabled: hasSelection },
  { id: 'resize', label: N_('Resize…'), keys: ['Mod+R'], icon: 'resize', run: resizeImageDialog },
  { id: 'canvas-size', label: N_('Canvas size…'), keys: ['Mod+Shift+R'], run: canvasSizeDialog },
  { id: 'flip-h', label: N_('Flip horizontal'), icon: 'flip-h', run: () => ops.flipImage(true) },
  { id: 'flip-v', label: N_('Flip vertical'), icon: 'flip-v', run: () => ops.flipImage(false) },
  { id: 'rotate-cw', label: N_('Rotate 90° clockwise'), keys: IS_MAC ? [] : ['Mod+H'], icon: 'rotate', run: () => ops.rotateImage(1) },
  { id: 'rotate-ccw', label: N_('Rotate 90° counter-clockwise'), keys: ['Mod+G'], run: () => ops.rotateImage(3) },
  { id: 'rotate-180', label: N_('Rotate 180°'), keys: ['Mod+J'], run: () => ops.rotateImage(2) },
  { id: 'flatten', label: N_('Flatten'), keys: ['Mod+Shift+F'], icon: 'layers', run: ops.flatten, enabled: manyLayers },

  { id: 'layer-add', label: N_('Add new layer'), keys: ['Mod+Shift+L', 'Mod+Shift+N'], icon: 'plus', run: ops.addLayer },
  { id: 'layer-delete', label: N_('Delete layer'), keys: ['Mod+Shift+Delete', 'Mod+Shift+Backspace'], icon: 'trash', run: ops.deleteLayer, enabled: manyLayers },
  { id: 'layer-duplicate', label: N_('Duplicate layer'), keys: ['Mod+Shift+D'], icon: 'duplicate', run: ops.duplicateLayer },
  { id: 'layer-merge', label: N_('Merge layer down'), keys: IS_MAC ? ['Mod+E'] : ['Mod+M', 'Mod+E'], icon: 'merge', run: ops.mergeDown, enabled: () => app.doc.active > 0 },
  { id: 'layer-import', label: N_('Import from file…'), icon: 'open', run: () => importLayers() },
  { id: 'layer-flip-h', label: N_('Flip layer horizontal'), icon: 'flip-h', run: () => ops.flipLayer(true) },
  { id: 'layer-flip-v', label: N_('Flip layer vertical'), icon: 'flip-v', run: () => ops.flipLayer(false) },
  { id: 'layer-up', label: N_('Move layer up'), keys: ['Mod+]'], icon: 'up', run: () => ops.moveLayer(1), enabled: () => app.doc.active < app.doc.layers.length - 1 },
  { id: 'layer-down', label: N_('Move layer down'), keys: ['Mod+['], icon: 'down', run: () => ops.moveLayer(-1), enabled: () => app.doc.active > 0 },
  { id: 'layer-properties', label: N_('Layer properties…'), keys: ['F4'], icon: 'props', run: () => layerPropertiesDialog() },

  ...EFFECTS.map((e) => ({ id: e.id, label: () => `${t(e.label)}${e.fields ? '…' : ''}`, keys: e.keys, icon: e.menu === 'adjustments' ? 'adjust' : 'effect', run: () => applyEffect(e) })),

  { id: 'shortcuts', label: N_('Keyboard shortcuts'), keys: ['F1'], run: () => shortcutsHelp() },
  { id: 'about', label: N_('About'), run: about },
];

export const COMMANDS = new Map(commands.map((c) => [c.id, c]));

export const commandLabel = (c: Command): string => (typeof c.label === 'function' ? c.label() : t(c.label));

// Menus: command ids, '-' for a separator.
export const MENUS: { id: string; label: string; items: string[] }[] = [
  { id: 'file', label: N_('File'), items: ['new', 'open', '-', 'save', 'save-as'] },
  { id: 'edit', label: N_('Edit'), items: ['undo', 'redo', '-', 'cut', 'copy', 'copy-merged', 'paste', 'paste-layer', 'paste-image', '-', 'select-all', 'deselect', 'invert-selection', '-', 'erase-selection', 'fill-selection'] },
  { id: 'view', label: N_('View'), items: ['zoom-in', 'zoom-out', 'zoom-fit', 'zoom-actual', '-', 'grid', 'panels', '-', 'theme-auto', 'theme-light', 'theme-dark', '-', 'language'] },
  { id: 'image', label: N_('Image'), items: ['crop', 'resize', 'canvas-size', '-', 'flip-h', 'flip-v', '-', 'rotate-cw', 'rotate-ccw', 'rotate-180', '-', 'flatten'] },
  { id: 'layers', label: N_('Layers'), items: ['layer-add', 'layer-delete', 'layer-duplicate', 'layer-merge', 'layer-import', '-', 'layer-flip-h', 'layer-flip-v', '-', 'layer-up', 'layer-down', '-', 'layer-properties'] },
  { id: 'adjustments', label: N_('Adjustments'), items: EFFECTS.filter((e) => e.menu === 'adjustments').map((e) => e.id) },
  { id: 'effects', label: N_('Effects'), items: EFFECTS.filter((e) => e.menu === 'effects').map((e) => e.id) },
  { id: 'help', label: N_('Help'), items: ['shortcuts', '-', 'about'] },
];

export function runCommand(id: string): void {
  const c = COMMANDS.get(id);
  if (!c || (c.enabled && !c.enabled())) return;
  void c.run();
}

// "Mod+Shift+S" as the platform writes it: ⇧⌘S on a Mac, Ctrl+Shift+S elsewhere.
export function formatKeys(keys: string): string {
  const parts = keys.split('+').filter(Boolean);
  if (keys.endsWith('++')) parts.push('+');
  const key = parts.pop()!;
  const names: Record<string, string> = IS_MAC
    ? { Mod: '⌘', Shift: '⇧', Alt: '⌥', Delete: '⌦', Backspace: '⌫' }
    : { Mod: 'Ctrl', Shift: 'Shift', Alt: 'Alt', Delete: 'Del', Backspace: 'Backspace' };
  if (IS_MAC) {
    const order = ['Alt', 'Shift', 'Mod'];
    return [...order.filter((m) => parts.includes(m)).map((m) => names[m]), names[key] ?? key].join('');
  }
  return [...parts.map((m) => names[m] ?? m), names[key] ?? key].join('+');
}

// The key of an event as written in the table above: the physical key for letters and
// digits, whatever layout is on.
function keyName(e: KeyboardEvent): string {
  const code = e.code;
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const punct: Record<string, string> = { Equal: '=', Minus: '-', BracketLeft: '[', BracketRight: ']', Quote: "'", NumpadAdd: '+', NumpadSubtract: '-' };
  return punct[code] ?? e.key;
}

function comboOf(e: KeyboardEvent): string {
  const mod = IS_MAC ? e.metaKey : e.ctrlKey;
  return [mod && 'Mod', e.altKey && 'Alt', e.shiftKey && 'Shift', keyName(e)].filter(Boolean).join('+');
}

const byKey = new Map<string, Command>();
for (const c of commands) for (const k of c.keys ?? []) byKey.set(k, c);

function cycleTool(letter: string): boolean {
  const tools = app.tools.filter((tool) => tool.key === letter);
  if (!tools.length) return false;
  const at = tools.indexOf(app.tool);
  app.setTool(tools[(at + 1) % tools.length]!.id);
  return true;
}

export function installKeyboard(): void {
  window.addEventListener('keydown', (e) => {
    if (document.querySelector('dialog[open]') || isTyping(e.target)) return;
    if (document.querySelector('.menu--open') && e.key !== 'Escape') return;
    // A focused slider, button or list keeps its own arrows, Enter and space.
    const control = e.target instanceof Element && e.target.closest('input, button, select, [role="radio"], [role="option"]');
    if (control && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' ', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) return;
    if (app.tool.keydown?.(e)) {
      e.preventDefault();
      return;
    }
    const combo = comboOf(e);
    const command = byKey.get(combo);
    if (command) {
      if (command.id.startsWith('paste')) {
        // The paste event follows with the clipboard's content.
        pasteTarget = command.id === 'paste-layer' ? 'new-layer' : command.id === 'paste-image' ? 'new-image' : 'layer';
        return;
      }
      e.preventDefault();
      if (command.id === 'copy' || command.id === 'cut' || command.id === 'copy-merged') {
        // Copying with nothing selected copies the layer, but text selected on the page wins.
        if (window.getSelection()?.toString()) return;
      }
      runCommand(command.id);
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const key = keyName(e);
    if (key === 'Escape') {
      if (app.tool.cancel?.()) e.preventDefault();
      return;
    }
    if (key === 'X') {
      const { primary, secondary } = app;
      app.setColor('primary', secondary);
      app.setColor('secondary', primary);
    } else if (key === 'D') {
      app.setColor('primary', parseHex(DEFAULT_PALETTE[0]!)!);
      app.setColor('secondary', parseHex('#FFFFFF')!);
    } else if (key === '[' || key === ']') {
      const size = app.settings.brushSize;
      const step = Math.max(1, Math.round(size * 0.1));
      app.setting('brushSize', Math.max(1, Math.min(1000, size + (key === ']' ? step : -step))));
    } else if (!(key.length === 1 && cycleTool(key))) {
      return;
    }
    e.preventDefault();
  });

  document.addEventListener('paste', (e) => {
    if (isTyping(e.target) || document.querySelector('dialog[open]')) return;
    e.preventDefault();
    const target = pasteTarget;
    pasteTarget = 'layer';
    void ops.pasteFromClipboard(target, e.clipboardData);
  });
}

function shortcutsHelp(): void {
  const rows = commands
    .filter((c) => c.keys?.length)
    .map((c) => `<tr><td>${commandLabel(c)}</td><td>${c.keys!.map((k) => `<kbd>${formatKeys(k)}</kbd>`).join(' ')}</td></tr>`);
  const tools = app.tools.map((tool) => `<tr><td>${t(tool.label)}</td><td><kbd>${tool.key}</kbd></td></tr>`);
  const more = [
    [t('Swap primary and secondary colors'), 'X'],
    [t('Black and white colors'), 'D'],
    [t('Brush size smaller / larger'), '[ ]'],
    [t('Pan with any tool'), t('Space + drag')],
    [t('Zoom'), IS_MAC ? t('⌘ + wheel, pinch') : t('Ctrl + wheel, pinch')],
  ].map(([label, key]) => `<tr><td>${label}</td><td><kbd>${key}</kbd></td></tr>`);
  showHtml(t('Keyboard shortcuts'), `<div class="shortcuts"><table>${rows.join('')}</table><table>${tools.join('')}${more.join('')}</table></div>`, true);
}
