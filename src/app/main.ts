// Starts the page: the view, the tools, the panels and the keyboard, a blank image to
// begin with, files dropped on the window, and a warning before unsaved work is closed.

import { t } from '../core/i18n';
import { app } from './app';
import { installKeyboard, runCommand } from './commands';
import { dropped, encode, readDocument } from './io';
import { applyLanguage, applyTheme } from './language';
import { blankDocument } from './ops';
import { TOOLS } from './tools/index';
import { setTextHost } from './tools/text';
import { mountColors } from './ui/colors';
import { mountLayers } from './ui/layers';
import { mountMenubar } from './ui/menubar';
import { mountHistory, mountStatus } from './ui/panels';
import { mountOptions, mountToolbox } from './ui/toolbox';
import { View } from './view';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

app.tools = TOOLS;
app.tool = TOOLS.find((tool) => tool.id === 'brush')!;
app.view = new View($('workspace'), $<HTMLCanvasElement>('view'));
setTextHost($('workspace'));

applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
applyLanguage();

mountMenubar($('menubar'));
mountOptions($('options'));
mountToolbox($('toolbox'));
mountColors($('colors'));
mountLayers($('layers'));
mountHistory($('history'));
mountStatus($('status'));
installKeyboard();

// A phone's screen has no room for the panels beside the image: they start closed there.
if (matchMedia('(max-width: 860px)').matches) app.settings.panels = false;
const panels = () => document.body.classList.toggle('no-panels', !app.settings.panels);
app.on('settings', panels);
panels();

const title = () => {
  document.title = `${app.history.dirty ? '• ' : ''}${app.doc.name} — HTML Paint`;
};
app.on('history', title);
app.on('doc', title);
app.on('lang', title);
app.on('tool', () => app.view.updateCursor());

blankDocument(800, 600, 'white');
app.view.updateCursor();

// Files dragged onto the window open, or join the image as layers.
window.addEventListener('dragover', (e) => {
  if (e.dataTransfer?.types.includes('Files')) {
    e.preventDefault();
    document.body.classList.add('dropping');
  }
});
window.addEventListener('dragleave', (e) => {
  if (!e.relatedTarget) document.body.classList.remove('dropping');
});
window.addEventListener('drop', (e) => {
  document.body.classList.remove('dropping');
  const files = [...(e.dataTransfer?.files ?? [])];
  if (!files.length) return;
  e.preventDefault();
  // Not while a dialog waits for an answer: it belongs to the image open now.
  if (document.querySelector('dialog[open]')) return;
  void dropped(files);
});

window.addEventListener('beforeunload', (e) => {
  if (!app.history.dirty) return;
  e.preventDefault();
  e.returnValue = t('Changes you made may not be saved.');
});

// For the browser tests, which look at the image and the files written through these.
Object.assign(window, { paint: app, paintFiles: { encode, readDocument }, paintRun: runCommand });
