// Opening and saving. Pictures open as one layer; OpenRaster (.ora) keeps the layers,
// their names, opacity, visibility and blend modes, and opens in GIMP and Krita too.
// Where the browser can write files (Chrome, Edge) ⌘S saves back to the file opened;
// elsewhere a save is a download.

import { t } from '../core/i18n';
import { compositeOp, readStack, writeStack, type StackLayer } from '../core/ora';
import { readZip, writeZip, type ZipEntry } from '../core/zip';
import { app } from './app';
import { canvasToBlob, createCanvas, ctxOf } from './canvas';
import { Layer, PaintDocument } from './document';
import { decodeImage, pasteImage } from './ops';
import { ask, form, inform } from './ui/dialog';

export const FORMATS = {
  png: { mime: 'image/png', ext: '.png', label: 'PNG' },
  jpeg: { mime: 'image/jpeg', ext: '.jpg', label: 'JPEG' },
  webp: { mime: 'image/webp', ext: '.webp', label: 'WebP' },
  ora: { mime: 'image/openraster', ext: '.ora', label: 'OpenRaster' },
} as const;

export type Format = keyof typeof FORMATS;

const IMAGE_TYPES = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.ico', '.avif', '.svg', '.ora'];

export function formatOf(name: string): Format | null {
  const ext = name.toLowerCase().replace(/^.*(\.[^.]+)$/, '$1');
  if (ext === '.png') return 'png';
  if (ext === '.jpg' || ext === '.jpeg') return 'jpeg';
  if (ext === '.webp') return 'webp';
  if (ext === '.ora') return 'ora';
  return null;
}

const baseName = (name: string) => name.replace(/\.[^.]+$/, '') || t('Untitled');

// ---- Reading

async function readOra(bytes: Uint8Array, name: string): Promise<PaintDocument> {
  const files = new Map((await readZip(bytes)).map((f) => [f.name, f.data]));
  const xml = files.get('stack.xml');
  if (!xml) throw new Error(t('{name} is not an OpenRaster file.', { name }));
  const stack = readStack(new TextDecoder().decode(xml));
  const doc = new PaintDocument(stack.width, stack.height, baseName(name));
  for (const l of stack.layers) {
    const canvas = createCanvas(stack.width, stack.height);
    const data = files.get(l.src);
    if (data) ctxOf(canvas).drawImage(await decodeImage(new Blob([data as BlobPart], { type: 'image/png' })), l.x, l.y);
    doc.layers.push(new Layer(canvas, l.name || doc.freshName(t('Layer')), l.visible, l.opacity, l.blend));
  }
  if (!doc.layers.length) doc.layers.push(new Layer(createCanvas(stack.width, stack.height), t('Background')));
  doc.active = doc.layers.length - 1;
  return doc;
}

export async function readDocument(file: Blob, name: string): Promise<PaintDocument> {
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  const zip = head[0] === 0x50 && head[1] === 0x4b;
  if (zip || formatOf(name) === 'ora') return readOra(new Uint8Array(await file.arrayBuffer()), name);
  const canvas = await decodeImage(file);
  const doc = new PaintDocument(canvas.width, canvas.height, baseName(name));
  doc.layers.push(new Layer(canvas, t('Background')));
  return doc;
}

// Asks before a change would throw away unsaved work: true to go ahead.
export async function confirmDiscard(): Promise<boolean> {
  if (!app.history.dirty) return true;
  const answer = await ask(t('Save changes?'), t('“{name}” has changes that are not saved.', { name: app.doc.name }), [
    { id: 'cancel', label: t('Cancel') },
    { id: 'discard', label: t('Don’t save') },
    { id: 'save', label: t('Save'), primary: true },
  ]);
  if (answer === 'save') return save();
  return answer === 'discard';
}

export async function openFile(file: File, handle?: FileSystemFileHandle): Promise<void> {
  try {
    const doc = await readDocument(file, file.name);
    doc.file = { name: file.name, handle };
    app.setDocument(doc);
  } catch (error) {
    await inform(t('Cannot open the file'), t('{name} could not be read as an image.', { name: file.name }) + (error instanceof Error ? `\n\n${error.message}` : ''));
  }
}

interface OpenFilePicker {
  showOpenFilePicker?(options: object): Promise<FileSystemFileHandle[]>;
  showSaveFilePicker?(options: object): Promise<FileSystemFileHandle>;
}

const picker = window as unknown as OpenFilePicker;

// Lets the person pick files: through the file system API when there is one, so the file
// can be saved back, through an <input type=file> otherwise.
async function pickFiles(multiple: boolean): Promise<{ file: File; handle?: FileSystemFileHandle }[]> {
  if (picker.showOpenFilePicker) {
    try {
      const handles = await picker.showOpenFilePicker({
        multiple,
        types: [{ description: t('Images'), accept: { 'image/*': IMAGE_TYPES } }],
      });
      return Promise.all(handles.map(async (handle) => ({ file: await handle.getFile(), handle })));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return [];
      // A blocked API (a sandboxed frame): the plain input will do.
    }
  }
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ['image/*', ...IMAGE_TYPES].join(',');
    input.multiple = multiple;
    input.addEventListener('change', () => resolve([...(input.files ?? [])].map((file) => ({ file }))));
    input.addEventListener('cancel', () => resolve([]));
    input.click();
  });
}

export async function open(): Promise<void> {
  app.finish();
  if (!(await confirmDiscard())) return;
  const [picked] = await pickFiles(false);
  if (picked) await openFile(picked.file, picked.handle);
}

// Each file becomes a layer, at the top left; ORA files bring all their layers.
export async function importLayers(files?: File[]): Promise<void> {
  app.finish();
  const list = files ?? (await pickFiles(true)).map((p) => p.file);
  for (const file of list) {
    try {
      const doc = await readDocument(file, file.name);
      const image = doc.layers.length === 1 ? doc.layers[0]!.canvas : flattenDoc(doc);
      await pasteImage(image, 'new-layer', { x: 0, y: 0 }, baseName(file.name));
    } catch {
      await inform(t('Cannot open the file'), t('{name} could not be read as an image.', { name: file.name }));
    }
  }
}

function flattenDoc(doc: PaintDocument): HTMLCanvasElement {
  const out = createCanvas(doc.width, doc.height);
  const ctx = ctxOf(out);
  for (const l of doc.layers) {
    if (!l.visible) continue;
    ctx.globalAlpha = l.opacity;
    ctx.globalCompositeOperation = compositeOp(l.blend);
    ctx.drawImage(l.canvas, 0, 0);
  }
  return out;
}

// ---- Writing

// Everything is read off the canvases before the first await (toBlob takes its copy when
// called), so strokes made while the file is written are not half in it.
async function encodeOra(): Promise<Blob> {
  const enc = new TextEncoder();
  const doc = app.doc;
  const bytes = (c: HTMLCanvasElement) => canvasToBlob(c).then(async (b) => new Uint8Array(await b.arrayBuffer()));
  const layers: StackLayer[] = doc.layers.map((layer, i) => ({ name: layer.name, src: `data/layer${i}.png`, x: 0, y: 0, opacity: layer.opacity, visible: layer.visible, blend: layer.blend }));
  const stack = enc.encode(writeStack({ width: doc.width, height: doc.height, layers }));
  const pngs = doc.layers.map((layer) => bytes(layer.canvas));
  const merged = app.flatten();
  const k = Math.min(1, 256 / Math.max(doc.width, doc.height));
  const thumb = createCanvas(Math.max(1, Math.round(doc.width * k)), Math.max(1, Math.round(doc.height * k)));
  ctxOf(thumb).drawImage(merged, 0, 0, thumb.width, thumb.height);
  const [mergedPng, thumbPng, ...layerPngs] = await Promise.all([bytes(merged), bytes(thumb), ...pngs]);
  const entries: ZipEntry[] = [
    { name: 'mimetype', data: enc.encode('image/openraster') },
    { name: 'stack.xml', data: stack },
    ...layers.map((l, i) => ({ name: l.src, data: layerPngs[i]! })),
    { name: 'mergedimage.png', data: mergedPng! },
    { name: 'Thumbnails/thumbnail.png', data: thumbPng! },
  ];
  return new Blob([writeZip(entries) as BlobPart], { type: FORMATS.ora.mime });
}

export async function encode(format: Format, quality = 0.92): Promise<Blob> {
  if (format === 'ora') return encodeOra();
  // JPEG has no transparency: what is transparent turns white, as other editors do.
  const flat = app.flatten(format === 'jpeg' ? '#ffffff' : undefined);
  const blob = await canvasToBlob(flat, FORMATS[format].mime, format === 'png' ? undefined : quality);
  // A browser that cannot write a format hands back a PNG instead, without a word.
  if (blob.type !== FORMATS[format].mime) throw new Error(t('This browser cannot save {format} files.', { format: FORMATS[format].label }));
  return blob;
}

function download(blob: Blob, name: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

async function writeTo(handle: FileSystemFileHandle, blob: Blob): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

// `step` is the history step the file was made from: later ones are not in it.
function saved(name: string, step: number, handle?: FileSystemFileHandle): void {
  app.doc.file = { name, handle };
  app.doc.name = baseName(name);
  app.history.markSaved(step);
  app.emit('history', 'doc');
}

// A flat format loses the layers: worth a word before it happens, once per document.
async function layersWarning(format: Format): Promise<boolean> {
  if (format === 'ora' || app.doc.layers.length < 2) return true;
  const answer = await ask(t('Flatten the image?'), t('{format} keeps no layers: the saved file will have the image flattened. The layers stay here. To keep them in a file, save as OpenRaster (.ora).', { format: FORMATS[format].label }), [
    { id: 'cancel', label: t('Cancel') },
    { id: 'ok', label: t('Save flattened'), primary: true },
  ]);
  return answer === 'ok';
}

export async function save(): Promise<boolean> {
  app.finish();
  const file = app.doc.file;
  const format = file ? formatOf(file.name) : null;
  if (!file?.handle || !format) return saveAs();
  if (!(await layersWarning(format))) return false;
  try {
    const step = app.history.index;
    await writeTo(file.handle, await encode(format));
    saved(file.name, step, file.handle);
    return true;
  } catch {
    return saveAs();
  }
}

export async function saveAs(): Promise<boolean> {
  app.finish();
  const current = app.doc.file ? formatOf(app.doc.file.name) : null;
  const initial: Format = current ?? (app.doc.layers.length > 1 ? 'ora' : 'png');
  const values = await form({
    title: t('Save as'),
    ok: t('Save'),
    fields: [
      { kind: 'text', id: 'name', label: t('File name'), value: baseName(app.doc.file?.name ?? app.doc.name) },
      { kind: 'select', id: 'format', label: t('Format'), value: initial, options: (Object.keys(FORMATS) as Format[]).map((f) => [f, `${FORMATS[f].label} (${FORMATS[f].ext})`]) },
      { kind: 'range', id: 'quality', label: t('Quality'), value: 92, min: 1, max: 100, unit: '%' },
      { kind: 'note', text: t('PNG, JPEG and WebP save the image flattened; OpenRaster keeps the layers.') },
    ],
  });
  if (!values) return false;
  const format = values.format as Format;
  const name = `${String(values.name).trim() || t('Untitled')}${FORMATS[format].ext}`;
  if (!(await layersWarning(format))) return false;
  const step = app.history.index;
  let blob: Blob;
  try {
    blob = await encode(format, Number(values.quality) / 100);
  } catch (error) {
    await inform(t('Cannot save the file'), error instanceof Error ? error.message : String(error));
    return false;
  }
  if (picker.showSaveFilePicker) {
    try {
      const handle = await picker.showSaveFilePicker({
        suggestedName: name,
        types: [{ description: FORMATS[format].label, accept: { [FORMATS[format].mime]: [FORMATS[format].ext] } }],
      });
      await writeTo(handle, blob);
      saved(handle.name, step, handle);
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return false;
      // Not allowed here (a sandboxed frame, a file:// page in some browsers): a download.
    }
  }
  download(blob, name);
  saved(name, step);
  return true;
}

// Files dropped on the page: an image to open, or layers to add to the one open.
export async function dropped(files: File[]): Promise<void> {
  const images = files.filter((f) => f.type.startsWith('image/') || IMAGE_TYPES.some((ext) => f.name.toLowerCase().endsWith(ext)));
  if (!images.length) return;
  const answer = await ask(t('Open or add?'), t('Open the file as a new image, or add it to this one as a layer?'), [
    { id: 'layer', label: t('Add as layer') },
    { id: 'open', label: t('Open'), primary: true },
  ]);
  if (answer === 'layer') await importLayers(images);
  else if (answer === 'open' && (await confirmDiscard())) await openFile(images[0]!);
}
