/**
 * Drives the built page in headless Chrome: painting with the brush, undo and redo, a
 * selection erased, layers added, filled, merged and reordered, an adjustment, shapes and
 * text, an OpenRaster file written and read back, and the page on a phone's screen; then the
 * PWA of build/pages/ over HTTP, offline from its service worker.
 *
 * Needs `npm run build` first and a local Chrome (or `CHROME=/path/to/chrome`). No
 * dependencies beyond Node: the DevTools protocol is spoken over the built-in WebSocket.
 *
 * `--shots DIR` also saves screenshots of the main screens into DIR.
 */
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { checker, root } from '../tools/load.mjs';

const APP = join(root, 'build', 'paint.html');
const PAGES = join(root, 'build', 'pages');
const shotsAt = process.argv.indexOf('--shots');
const SHOTS = shotsAt > 0 ? process.argv[shotsAt + 1] : null;
const CHROME =
  process.env.CHROME ??
  ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((path) => existsSync(path));

if (!CHROME) {
  console.log('No Chrome found — set CHROME=/path/to/chrome. Skipping the browser tests.');
  process.exit(0);
}
if (typeof WebSocket === 'undefined') {
  console.error('Run with `node --experimental-websocket` on Node 20.');
  process.exit(1);
}
if (!existsSync(APP)) {
  console.error('No build/paint.html: run `npm run build` first.');
  process.exit(1);
}

const { check, done } = checker();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// build/pages/ over HTTP, as GitHub Pages serves it; `pagesDown` plays the network gone.
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
let pagesDown = false;
const server = createServer(async (req, res) => {
  if (pagesDown) return req.socket.destroy();
  const path = new URL(req.url, 'http://localhost').pathname;
  const name = path.endsWith('/') ? 'index.html' : basename(path);
  try {
    const body = await readFile(join(PAGES, name));
    res.setHeader('content-type', TYPES[extname(name)] ?? 'application/octet-stream');
    res.end(body);
  } catch {
    res.statusCode = 404;
    res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const profile = await mkdtemp(join(tmpdir(), 'paint-chrome-'));
const flags = ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--window-size=1280,820', '--hide-scrollbars'];
if (process.platform === 'linux') flags.push('--no-sandbox');
const chrome = spawn(CHROME, [...flags, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((resolve) => {
  let buf = '';
  chrome.stderr.on('data', (d) => {
    buf += d;
    const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf);
    if (m) resolve(m[1]);
  });
});
const debugPort = new URL(wsUrl).port;
const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const waiting = new Map();
const errors = [];
let beforeUnload = 0;
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && waiting.has(msg.id)) {
    waiting.get(msg.id)(msg);
    waiting.delete(msg.id);
  } else if (msg.method === 'Runtime.exceptionThrown') {
    errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
  } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
    errors.push(msg.params.entry.text);
  } else if (msg.method === 'Page.javascriptDialogOpening') {
    // "Leave the page?" for unsaved work, when a test reloads.
    beforeUnload += 1;
    send('Page.handleJavaScriptDialog', { accept: true });
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const n = ++id;
    waiting.set(n, (msg) => (msg.error ? reject(new Error(`${method}: ${JSON.stringify(msg.error)}`)) : resolve(msg.result)));
    ws.send(JSON.stringify({ id: n, method, params }));
  });
const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(`${expr}\n${r.exceptionDetails.exception?.description ?? 'eval failed'}`);
  return r.result.value;
};
const shot = async (name) => {
  if (!SHOTS) return;
  await sleep(150);
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(SHOTS, `${name}.png`), Buffer.from(data, 'base64'));
};

const MOD = process.platform === 'darwin' ? 4 : 2;
const SHIFT = 8;
const KEYS = {
  Delete: { code: 'Delete', windowsVirtualKeyCode: 46 },
  Enter: { code: 'Enter', windowsVirtualKeyCode: 13 },
  Escape: { code: 'Escape', windowsVirtualKeyCode: 27 },
};
const press = async (key, modifiers = 0) => {
  const k = KEYS[key] ?? { code: `Key${key.toUpperCase()}`, windowsVirtualKeyCode: key.toUpperCase().charCodeAt(0) };
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, modifiers, ...k });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, modifiers, ...k });
  await sleep(40);
};
const click = async (selector, button = 'left') => {
  const box = await evaluate(`(() => { const n = document.querySelector(${JSON.stringify(selector)}); if (!n) return null; const r = n.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
  if (!box) throw new Error(`Nothing to click: ${selector}`);
  for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: box[0], y: box[1], button, clickCount: 1 });
  await sleep(60);
};
// Image coordinates to the window's.
const screen = (x, y) => evaluate(`(() => { const r = paint.view.canvas.getBoundingClientRect(); const p = paint.view.toScreen(${x}, ${y}); return [r.left + p.x, r.top + p.y]; })()`);
const drag = async (points, { button = 'left', modifiers = 0 } = {}) => {
  const at = [];
  for (const [x, y] of points) at.push(await screen(x, y));
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at[0][0], y: at[0][1] });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: at[0][0], y: at[0][1], button, buttons: button === 'left' ? 1 : 2, clickCount: 1, modifiers });
  for (const [x, y] of at.slice(1)) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button, buttons: button === 'left' ? 1 : 2, modifiers });
    await sleep(10);
  }
  const [x, y] = at[at.length - 1];
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button, buttons: 0, clickCount: 1, modifiers });
  await sleep(60);
};
const clickAt = (x, y, opts) => drag([[x, y]], opts);
// The pixel of the whole image, or of one layer, as [r, g, b, a].
const pixel = (x, y, layer = null) =>
  evaluate(`[...(${layer === null ? 'paint.flatten()' : `paint.doc.layers[${layer}].canvas`}).getContext('2d').getImageData(${x}, ${y}, 1, 1).data]`);
const tool = (id) => evaluate(`paint.setTool(${JSON.stringify(id)})`);
const until = async (expr, ms = 5000) => {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(100)) {
    if (await evaluate(expr).catch(() => false)) return true;
  }
  return false;
};

try {
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 820, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: pathToFileURL(APP).href });
  await sleep(600);
  await evaluate(`localStorage.clear()`);
  await send('Page.reload');
  await sleep(700);

  check('starts with a blank image', await evaluate(`[paint.doc.width, paint.doc.height, paint.doc.layers.length]`), [800, 600, 1]);
  check('white background', await pixel(10, 10), [255, 255, 255, 255]);
  check('menus', await evaluate(`[...document.querySelectorAll('.menu-button')].map((b) => b.textContent)`), ['File', 'Edit', 'View', 'Image', 'Layers', 'Adjustments', 'Effects', 'Help']);
  check('twenty-one tools', await evaluate(`document.querySelectorAll('.tool').length`), 21);
  check('the brush to begin with', await evaluate(`paint.tool.id`), 'brush');

  // A brush stroke, undone and redone.
  await drag([[100, 100], [150, 100], [200, 100], [250, 100]]);
  check('the brush paints', await pixel(175, 100), [0, 0, 0, 255]);
  check('one step', await evaluate(`paint.history.index`), 1);
  check('the history panel lists it', await evaluate(`[...document.querySelectorAll('.history-item span')].map((s) => s.textContent)`), ['New image', 'Paintbrush']);
  await press('z', MOD);
  check('undo', await pixel(175, 100), [255, 255, 255, 255]);
  await press('z', MOD | SHIFT);
  check('redo', await pixel(175, 100), [0, 0, 0, 255]);
  check('the title marks unsaved work', await evaluate(`document.title.startsWith('•')`), true);

  // The pencil with the secondary colour: one pixel.
  await press('p');
  check('P is the pencil', await evaluate(`paint.tool.id`), 'pencil');
  await evaluate(`paint.setColor('secondary', { r: 255, g: 0, b: 0, a: 255 })`);
  await clickAt(300.5, 300.5, { button: 'right' });
  check('the right button paints the secondary colour', await pixel(300, 300), [255, 0, 0, 255]);
  check('just the one pixel', await pixel(301, 300), [255, 255, 255, 255]);

  // A rectangle selected and erased: transparent inside, untouched outside.
  await press('s');
  check('S is rectangle select', await evaluate(`paint.tool.id`), 'select-rect');
  await drag([[150, 80], [180, 90], [200, 120]]);
  check('selection bounds', await evaluate(`paint.doc.selection.bounds`), { x: 150, y: 80, w: 50, h: 40 });
  check('the status bar shows its size', await evaluate(`document.querySelector('[data-cell="selection"]').textContent`), '▭ 50 × 40');
  await shot('desktop-selection');
  await press('Delete');
  check('erased inside', await pixel(175, 100), [0, 0, 0, 0]);
  check('kept outside', await pixel(220, 100), [0, 0, 0, 255]);
  // The brush cannot reach outside the selection.
  await tool('brush');
  await drag([[120, 110], [230, 110]]);
  check('painting stays inside the selection', [await pixel(175, 110), await pixel(225, 110)], [[0, 0, 0, 255], [255, 255, 255, 255]]);
  await press('d', MOD);
  check('deselect', await evaluate(`paint.doc.selection`), null);

  // Layers: add one, fill it, see it on top, merge it down.
  await click('[data-command="layer-add"]');
  check('a new layer', await evaluate(`[paint.doc.layers.length, paint.doc.active, paint.layer.name]`), [2, 1, 'Layer 2']);
  await press('f');
  await evaluate(`paint.setColor('primary', { r: 0, g: 0, b: 255, a: 255 })`);
  await clickAt(400, 400);
  check('the bucket fills the empty layer', await pixel(400, 400, 1), [0, 0, 255, 255]);
  check('the layer is on top', await pixel(10, 10), [0, 0, 255, 255]);
  check('two rows in the layers panel', await evaluate(`[...document.querySelectorAll('.layer-name')].map((n) => n.textContent)`), ['Layer 2', 'Background']);
  await click('.layer[data-index="1"] [data-eye]');
  check('hidden, the layer below shows', await pixel(10, 10), [255, 255, 255, 255]);
  await press('z', MOD);
  check('showing it again is an undo away', await pixel(10, 10), [0, 0, 255, 255]);
  await evaluate(`paint.doc.layers[1].opacity = 0.5; paint.markDirty()`);
  await click('[data-command="layer-merge"]');
  check('merged down', await evaluate(`paint.doc.layers.length`), 1);
  const merged = await pixel(10, 10);
  check('merged at half opacity', merged[0] > 120 && merged[0] < 135 && merged[2] === 255, true);

  // An adjustment: invert the colours.
  await press('i', MOD | SHIFT);
  const inverted = await pixel(10, 10);
  check('invert colors', [inverted[0] < 135 && inverted[0] > 120, inverted[2]], [true, 0]);

  // Shapes and text on a new layer.
  await click('[data-command="layer-add"]');
  await evaluate(`paint.setColor('primary', { r: 0, g: 128, b: 0, a: 255 }); paint.setting('brushSize', 4); paint.setting('shapeStyle', 'outline')`);
  await tool('rect');
  await drag([[500, 300], [600, 400]]);
  check('rectangle outline', await pixel(501, 350, 1), [0, 128, 0, 255]);
  check('rectangle inside empty', await pixel(550, 350, 1), [0, 0, 0, 0]);
  await tool('text');
  await clickAt(520, 200);
  await sleep(50);
  await send('Input.insertText', { text: 'Hi' });
  await sleep(100);
  check('the text box is open', await evaluate(`!!document.querySelector('.text-editor')`), true);
  await shot('desktop-text');
  await press('Enter', MOD);
  check('the text is on the layer', await evaluate(`[...paint.doc.layers[1].canvas.getContext('2d').getImageData(515, 195, 60, 50).data].some((v, i) => i % 4 === 3 && v > 0)`), true);
  check('the text box is gone', await evaluate(`!!document.querySelector('.text-editor')`), false);

  // A Bézier curve: a line first, bent by a control point, then applied with Enter.
  await evaluate(`paint.setColor('primary', { r: 200, g: 0, b: 200, a: 255 }); paint.setting('arrows', 'none'); paint.setting('dash', 'solid')`);
  await tool('curve');
  await drag([[100, 500], [200, 500], [400, 500]]);
  // Until it is applied the curve is only on the stroke canvas, over the layer.
  const onStroke = (x, y, w, h) => evaluate(`[...paint.stroke.getContext('2d').getImageData(${x}, ${y}, ${w}, ${h}).data].some((v, i) => i % 4 === 3 && v > 200)`);
  check('the curve starts as a line', await onStroke(298, 498, 4, 4), true);
  await drag([[200, 500], [200, 420], [200, 380]]);
  await drag([[300, 500], [300, 420], [300, 380]]);
  check('bent by its handles, it leaves the straight line', await onStroke(240, 495, 20, 10), false);
  check('and passes above it', await onStroke(248, 405, 5, 30), true);
  check('still being edited', await evaluate(`paint.history.entries[paint.history.index - 1].name`), 'Text');
  await press('Enter');
  check('Enter applies the curve', await evaluate(`[paint.live, paint.history.entries[paint.history.index - 1].name]`), [null, 'Curve']);
  check('on the layer', await evaluate(`[...paint.doc.layers[1].canvas.getContext('2d').getImageData(248, 405, 5, 30).data].some((v, i) => i % 4 === 3 && v > 200)`), true);

  // OpenRaster: written and read back with its layers.
  await evaluate(`paint.doc.layers[1].name = 'Shapes'; paint.doc.layers[1].blend = 'multiply'; paint.doc.layers[1].opacity = 0.75`);
  const ora = await evaluate(`(async () => {
    const blob = await paintFiles.encode('ora');
    const doc = await paintFiles.readDocument(blob, 'test.ora');
    return { size: blob.size, layers: doc.layers.map((l) => [l.name, l.blend, l.opacity]), w: doc.width, pixel: [...doc.layers[1].canvas.getContext('2d').getImageData(501, 350, 1, 1).data] };
  })()`);
  check('ORA keeps the layers', ora.layers, [['Background', 'normal', 1], ['Shapes', 'multiply', 0.75]]);
  check('ORA keeps the pixels', ora.pixel, [0, 128, 0, 255]);
  const png = await evaluate(`paintFiles.encode('png').then((b) => b.type)`);
  check('PNG export', png, 'image/png');

  // Image operations: rotate, then crop to a selection, each one step.
  const steps = await evaluate(`paint.history.index`);
  await evaluate(`document.querySelector('[data-menu="image"]').click()`);
  await sleep(50);
  await shot('desktop-menu');
  await evaluate(`document.querySelector('.menu [data-command="rotate-cw"]').click()`);
  check('rotated', await evaluate(`[paint.doc.width, paint.doc.height]`), [600, 800]);
  await press('z', MOD);
  check('rotation undone', await evaluate(`[paint.doc.width, paint.doc.height, paint.history.index]`), [800, 600, steps]);
  await tool('select-rect');
  await drag([[100, 100], [300, 250]]);
  await press('x', MOD | SHIFT);
  check('cropped', await evaluate(`[paint.doc.width, paint.doc.height, paint.doc.selection]`), [200, 150, null]);
  await press('z', MOD);
  await press('z', MOD);

  // Move selected pixels: a red square moved right by 50.
  await evaluate(`paint.setActiveLayer(0)`);
  await tool('select-rect');
  await drag([[20, 400], [60, 440]]);
  await evaluate(`paint.setColor('primary', { r: 255, g: 0, b: 0, a: 255 })`);
  await press('Delete');
  await evaluate(`(() => { const s = paint.doc.selection; const c = paint.layer.canvas.getContext('2d'); c.fillStyle = 'red'; c.fillRect(20, 400, 40, 40); paint.markDirty(); })()`);
  await tool('move');
  await drag([[40, 420], [60, 420], [90, 420]]);
  await press('Enter');
  check('moved pixels land', await pixel(85, 420, 0), [255, 0, 0, 255]);
  check('their old place is empty', await pixel(25, 420, 0), [0, 0, 0, 0]);
  check('the selection moves with them', await evaluate(`paint.doc.selection.bounds`), { x: 70, y: 400, w: 40, h: 40 });
  await press('d', MOD);

  // A dialog with a live preview.
  await evaluate(`document.querySelector('[data-menu="effects"]').click()`);
  await sleep(50);
  await evaluate(`document.querySelector('.menu [data-command="gaussian-blur"]').click()`);
  await sleep(200);
  check('the blur dialog is open', await evaluate(`!!document.querySelector('dialog[open] [name="radius"]')`), true);
  await shot('desktop-dialog');
  await evaluate(`document.querySelector('dialog[open] .button--primary').click()`);
  await sleep(200);
  check('blur is a step', await evaluate(`paint.history.entries[paint.history.index - 1].name`), 'Gaussian blur');

  // A fresh image for the rest of the tools.
  await evaluate(`paint.history.markSaved(); paintRun('new')`);
  await sleep(150);
  check('new image dialog', await evaluate(`!!document.querySelector('dialog[open] [name="width"]')`), true);
  await evaluate(`(() => { const d = document.querySelector('dialog[open]'); d.querySelector('[name="width"]').value = 400; d.querySelector('[name="height"]').value = 300; d.querySelector('.button--primary').click(); })()`);
  await sleep(150);
  check('new image 400 × 300', await evaluate(`[paint.doc.width, paint.doc.height, paint.history.index]`), [400, 300, 0]);

  // Magic wand on a two-colour image, then the ellipse and lasso added to it.
  await evaluate(`(() => { const c = paint.layer.canvas.getContext('2d'); c.fillStyle = '#ff0000'; c.fillRect(0, 0, 200, 300); paint.markDirty(); })()`);
  await tool('wand');
  await clickAt(50, 50);
  check('the wand takes the red half', await evaluate(`paint.doc.selection.bounds`), { x: 0, y: 0, w: 200, h: 300 });
  await tool('select-ellipse');
  await drag([[250, 50], [300, 80], [350, 150]], { modifiers: SHIFT });
  check('Shift adds an ellipse', await evaluate(`paint.doc.selection.bounds`), { x: 0, y: 0, w: 350, h: 300 });
  await tool('lasso');
  await drag([[10, 10], [100, 10], [100, 100], [10, 100]], { modifiers: 1 });
  check('Alt takes a lasso away', await evaluate(`(() => { const d = paint.doc.selection.mask.getContext('2d'); return [d.getImageData(50, 50, 1, 1).data[3], d.getImageData(150, 150, 1, 1).data[3]]; })()`), [0, 255]);
  await press('d', MOD);

  // The colour picker and the gradient between the colours it took.
  await tool('picker');
  await clickAt(100, 100);
  check('the picker takes red', await evaluate(`paint.primary`), { r: 255, g: 0, b: 0, a: 255 });
  await clickAt(300, 100, { button: 'right' });
  check('the right button takes white', await evaluate(`paint.secondary`), { r: 255, g: 255, b: 255, a: 255 });
  await tool('gradient');
  await drag([[0, 150], [200, 150], [400, 150]]);
  const g = [await pixel(2, 10), await pixel(200, 10), await pixel(397, 10)];
  check('a gradient from red to white', [g[0][0] > 250 && g[0][1] < 5, g[1][1] > 110 && g[1][1] < 145, g[2][1] > 250], [true, true, true]);

  // The airbrush leaves dots; the clone stamp copies one place to another.
  await press('z', MOD);
  await evaluate(`paint.setColor('primary', { r: 0, g: 0, b: 0, a: 255 }); paint.setting('brushSize', 30); paint.setting('density', 100)`);
  await tool('airbrush');
  await drag([[300, 200], [301, 200], [302, 200]]);
  check('the airbrush sprays', await evaluate(`[...paint.layer.canvas.getContext('2d').getImageData(285, 185, 30, 30).data].filter((v, i) => i % 4 === 0 && v === 0).length > 5`), true);
  await press('z', MOD);
  await tool('clone');
  await clickAt(100, 100, { modifiers: MOD });
  await drag([[300, 250], [310, 250], [320, 250]]);
  check('the clone stamp copies red over white', await pixel(310, 250), [255, 0, 0, 255]);
  await press('z', MOD);

  // Copy a piece and paste it back: it floats, moves, lands where it was dropped.
  await tool('select-rect');
  await drag([[150, 0], [250, 100]]);
  await evaluate(`paintRun('copy')`);
  await sleep(100);
  await evaluate(`paintRun('paste')`);
  await sleep(300);
  check('pasting switches to the move tool', await evaluate(`[paint.tool.id, paint.live && paint.live.kind]`), ['move', 'float']);
  await drag([[200, 50], [250, 150], [300, 200]]);
  await press('Enter');
  check('the pasted piece lands', [await pixel(260, 160), await pixel(340, 160)], [[255, 0, 0, 255], [255, 255, 255, 255]]);
  check('paste is a step', await evaluate(`paint.history.entries[paint.history.index - 1].name`), 'Paste');
  await evaluate(`paintRun('paste-layer')`);
  await sleep(300);
  check('paste into a new layer', await evaluate(`[paint.doc.layers.length, paint.layer.name]`), [2, 'Pasted']);

  // Pasting as a new image asks first when there is unsaved work.
  await evaluate(`paintRun('paste-image')`);
  await sleep(200);
  check('paste into a new image asks', await evaluate(`!!document.querySelector('dialog[open]')`), true);
  await evaluate(`[...document.querySelectorAll('dialog[open] .button')].find((b) => b.value === 'cancel').click()`);
  await sleep(100);
  check('cancelled, the image stays', await evaluate(`[paint.doc.width, paint.doc.layers.length]`), [400, 2]);

  // Another tool chosen in the middle of a stroke: the stroke is dropped, nothing leaks.
  await tool('brush');
  const steps0 = await evaluate(`paint.history.index`);
  const [sx, sy] = await screen(50, 250);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: sx, y: sy, button: 'left', buttons: 1, clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: sx + 30, y: sy, button: 'left', buttons: 1 });
  await evaluate(`paint.setTool('pencil')`);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: sx + 30, y: sy, button: 'left', buttons: 0, clickCount: 1 });
  await sleep(60);
  check('a stroke broken off leaves nothing', await evaluate(`[paint.live, paint.history.index]`), [null, steps0]);

  // Scaling and rotating floating pixels.
  await evaluate(`paint.setActiveLayer(1); paint.setSelection(null, 'Deselect', 'deselect')`);
  await tool('select-rect');
  await drag([[150, 0], [250, 100]]);
  await tool('move');
  await drag([[250, 100], [300, 150], [350, 200]]);
  check('the corner handle doubles the size', await evaluate(`paint.status`), 'Size 200 × 200, angle 0°');
  await drag([[380, 150], [380, 250]]);
  check('dragging outside rotates', await evaluate(`/angle -?\\d+°/.test(paint.status) && !paint.status.endsWith(' 0°')`), true);
  await press('Escape');
  check('Esc puts the pixels back', await evaluate(`[paint.live, paint.layer.canvas.getContext('2d').getImageData(200, 50, 1, 1).data[3]]`), [null, 255]);

  // Image and layer dialogs.
  await evaluate(`paintRun('resize')`);
  await sleep(150);
  await evaluate(`(() => { const d = document.querySelector('dialog[open]'); const w = d.querySelector('[name="width"]'); w.value = 200; w.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  check('keeping proportions follows the width', await evaluate(`document.querySelector('dialog[open] [name="height"]').value`), '150');
  await evaluate(`document.querySelector('dialog[open] .button--primary').click()`);
  await sleep(150);
  check('resized', await evaluate(`[paint.doc.width, paint.doc.height, paint.doc.layers.every((l) => l.canvas.width === 200)]`), [200, 150, true]);
  await evaluate(`paintRun('canvas-size')`);
  await sleep(150);
  await evaluate(`(() => { const d = document.querySelector('dialog[open]'); d.querySelector('[name="width"]').value = 300; d.querySelector('[value="tl"]').checked = true; d.querySelector('.button--primary').click(); })()`);
  await sleep(150);
  check('canvas widened from the left', await evaluate(`[paint.doc.width, paint.doc.height]`), [300, 150]);
  check('the new border of the background takes the secondary colour', await pixel(280, 10, 0), [255, 255, 255, 255]);
  await evaluate(`paintRun('layer-properties')`);
  await sleep(150);
  await evaluate(`(() => { const d = document.querySelector('dialog[open]'); d.querySelector('[name="name"]').value = 'Top'; const s = d.querySelector('[name="blend"]'); s.value = 'screen'; s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  check('the blend mode previews', await evaluate(`paint.layer.blend`), 'screen');
  await evaluate(`document.querySelector('dialog[open] .button--primary').click()`);
  await sleep(150);
  check('layer properties', await evaluate(`[paint.layer.name, paint.layer.blend]`), ['Top', 'screen']);
  await press('z', MOD);
  check('undone in one step', await evaluate(`[paint.layer.name, paint.layer.blend]`), ['Pasted', 'normal']);

  // The history panel goes back to any step.
  await evaluate(`document.querySelector('.history-item[data-step="0"]').click()`);
  check('back to the start', await evaluate(`[paint.doc.width, paint.doc.layers.length, paint.history.index]`), [400, 1, 0]);

  // The zoom tool.
  await tool('zoom');
  const z = await evaluate(`paint.view.zoom`);
  await clickAt(200, 150);
  check('a click zooms in', await evaluate(`paint.view.zoom > ${z}`), true);
  await clickAt(200, 150, { button: 'right' });
  check('a right click zooms out', await evaluate(`Math.abs(paint.view.zoom - ${z}) < 1e-9`), true);

  // With --shots, a picture made with most tools, to look at.
  if (SHOTS) {
    await evaluate(`paint.history.markSaved(); paintRun('new')`);
    await sleep(150);
    await evaluate(`(() => { const d = document.querySelector('dialog[open]'); d.querySelector('[name="width"]').value = 900; d.querySelector('[name="height"]').value = 560; d.querySelector('.button--primary').click(); })()`);
    await sleep(150);
    const color = (r, g, b, a = 255) => evaluate(`paint.setColor('primary', { r: ${r}, g: ${g}, b: ${b}, a: ${a} })`);
    const set = (key, value) => evaluate(`paint.setting(${JSON.stringify(key)}, ${JSON.stringify(value)})`);
    await evaluate(`paint.setColor('secondary', { r: 255, g: 255, b: 255, a: 255 })`);
    // A sky: a linear gradient on the background.
    await color(70, 130, 230);
    await set('gradient', 'linear');
    await tool('gradient');
    await drag([[450, 0], [450, 300], [450, 420]]);
    // Hills on their own layer, by a filled ellipse.
    await click('[data-command="layer-add"]');
    await color(60, 160, 80);
    await set('shapeStyle', 'fill');
    await set('antialias', true);
    await tool('ellipse');
    await drag([[-40, 380], [450, 700], [1000, 800]]);
    // A sun: a radial gradient inside an ellipse selection.
    await click('[data-command="layer-add"]');
    await tool('select-ellipse');
    await drag([[640, 50], [700, 110], [760, 170]]);
    await color(255, 210, 60);
    await evaluate(`paint.setColor('secondary', { r: 255, g: 120, b: 30, a: 255 })`);
    await set('gradient', 'radial');
    await tool('gradient');
    await drag([[700, 110], [750, 160]]);
    await press('d', MOD);
    // Strokes: hard, soft and aliased brushes, the airbrush.
    await click('[data-command="layer-add"]');
    await tool('brush');
    await color(30, 30, 40);
    await set('brushSize', 14);
    await set('hardness', 100);
    await drag([[60, 80], [120, 60], [180, 100], [240, 70], [300, 90]]);
    await set('hardness', 20);
    await set('brushSize', 34);
    await color(220, 40, 90, 200);
    await drag([[60, 160], [120, 140], [180, 180], [240, 150], [300, 170]]);
    await set('hardness', 100);
    await set('antialias', false);
    await set('brushSize', 10);
    await color(250, 250, 250);
    await drag([[60, 230], [140, 210], [220, 250], [300, 220]]);
    await set('antialias', true);
    await set('brushSize', 50);
    await set('density', 60);
    await color(255, 255, 255);
    await tool('airbrush');
    await drag([[420, 80], [470, 70], [520, 85], [560, 75]]);
    // Shapes: an outlined rounded rectangle, a dashed one, an arrow.
    await set('brushSize', 5);
    await set('shapeStyle', 'both');
    await set('radius', 18);
    await color(40, 40, 60);
    await evaluate(`paint.setColor('secondary', { r: 250, g: 220, b: 120, a: 255 })`);
    await tool('rect');
    await drag([[80, 300], [200, 380], [260, 420]]);
    await set('shapeStyle', 'outline');
    await set('dash', 'dash');
    await set('radius', 0);
    await drag([[300, 300], [380, 380], [430, 420]]);
    await set('dash', 'solid');
    await set('arrows', 'end');
    await tool('line');
    await drag([[470, 400], [560, 330], [620, 300]]);
    // Text, bold.
    await set('fontSize', 44);
    await set('bold', true);
    await color(25, 60, 30);
    await tool('text');
    await clickAt(560, 470);
    await sleep(50);
    await send('Input.insertText', { text: 'HTML Paint' });
    await sleep(100);
    await press('Enter', MOD);
    await evaluate(`paint.setActiveLayer(1)`);
    await press('b', MOD);
    await shot('showcase');
  }

  // Russian, then the dark theme.
  await evaluate(`paint.setting('language', 'ru'); document.querySelector('[data-menu="view"]').click(); document.querySelector('.menu [data-command="language-ru"]').click()`);
  await sleep(100);
  check('the menus in Russian', await evaluate(`document.querySelector('.menu-button').textContent`), 'Файл');
  await evaluate(`document.querySelector('[data-menu="view"]').click(); document.querySelector('.menu [data-command="theme-dark"]').click()`);
  await sleep(100);
  check('dark theme', await evaluate(`document.documentElement.dataset.theme`), 'dark');
  await shot('desktop-dark-ru');

  // A phone: the panels give way to the image. Something unsaved first, for the question.
  await tool('brush');
  await drag([[50, 50], [80, 60]]);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.reload');
  await sleep(800);
  check('unsaved work asks before the page goes', beforeUnload, 1);
  check('a phone starts with the panels closed', await evaluate(`document.body.classList.contains('no-panels')`), true);
  check('the image fits', await evaluate(`paint.view.zoom < 0.5`), true);
  await shot('phone');
  await evaluate(`document.querySelector('[data-command="panels"]').click()`);
  await sleep(100);
  await shot('phone-panels');

  // The PWA: its CSP lets in the manifest and the service worker, which keeps it offline.
  await send('Emulation.clearDeviceMetricsOverride');
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/` });
  check('pwa: service worker in control', await until(`navigator.serviceWorker.controller !== null`), true);
  check('pwa: the editor', await until(`typeof paint === 'object' && document.querySelectorAll('.tool').length === 21`), true);
  check('pwa: manifest parsed', (await send('Page.getAppManifest')).errors, []);
  check('pwa: installable', (await send('Page.getInstallabilityErrors')).installabilityErrors, []);
  pagesDown = true;
  await send('Page.reload');
  check('pwa: offline', await until(`document.readyState === 'complete' && typeof paint === 'object' && document.querySelectorAll('.tool').length === 21`), true);
  pagesDown = false;

  check('no errors on the page', errors, []);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  ws.close();
  chrome.kill();
  server.close();
  await sleep(100);
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
done('app');
