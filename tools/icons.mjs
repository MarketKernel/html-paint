/**
 * Draws the PWA's PNG icons into assets/pwa/ from APP_ICON in src/app/icons.ts, with a local
 * Chrome (or `CHROME=/path/to/chrome`). The PNGs are kept in the repository, so a build needs
 * no browser: run this again after the icon changes.
 *
 * The maskable icon and the Apple one fill the whole square with the icon's blue, since the
 * system cuts its own shape out of them; the maskable one keeps the drawing inside the
 * central circle that every mask leaves.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { root } from './load.mjs';

const CHROME =
  process.env.CHROME ??
  ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((path) => existsSync(path));
if (!CHROME) {
  console.error('No Chrome found — set CHROME=/path/to/chrome.');
  process.exit(1);
}

const source = await readFile(join(root, 'src/app/icons.ts'), 'utf8');
const svg = /export const APP_ICON = `([^`]+)`/.exec(source)?.[1];
if (!svg) throw new Error('src/app/icons.ts has no APP_ICON');
const BLUE = /fill="(#[0-9a-f]{6})"/i.exec(svg)[1];

const ICONS = [
  { name: 'icon-192.png', size: 192, scale: 1, background: 'transparent' },
  { name: 'icon-512.png', size: 512, scale: 1, background: 'transparent' },
  { name: 'icon-maskable-512.png', size: 512, scale: 0.8, background: BLUE },
  { name: 'apple-touch-icon.png', size: 180, scale: 1, background: BLUE },
];

const out = join(root, 'assets', 'pwa');
const temp = await mkdtemp(join(tmpdir(), 'paint-icons-'));
await mkdir(out, { recursive: true });
try {
  for (const { name, size, scale, background } of ICONS) {
    // Pixel sizes, not 100vw: a headless window's viewport need not be its size.
    const side = Math.round(size * scale);
    const offset = (size - side) / 2;
    const page = join(temp, 'icon.html');
    await writeFile(
      page,
      `<!doctype html><style>html,body{margin:0;background:transparent}` +
        `.square{position:fixed;left:0;top:0;width:${size}px;height:${size}px;background:${background}}` +
        `svg{position:fixed;left:${offset}px;top:${offset}px;width:${side}px;height:${side}px}</style>` +
        `<div class="square"></div>${svg}`,
    );
    // No --user-data-dir: with one, Chrome stays running after the screenshot.
    const flags = ['--headless=new', '--hide-scrollbars'];
    if (process.platform === 'linux') flags.push('--no-sandbox');
    execFileSync(
      CHROME,
      [...flags, '--force-device-scale-factor=1', '--default-background-color=00000000', `--window-size=${size},${size}`, `--screenshot=${join(out, name)}`, pathToFileURL(page).href],
      { stdio: 'ignore', timeout: 30000 },
    );
    console.log(`assets/pwa/${name}  ${size}×${size}`);
  }
} finally {
  await rm(temp, { recursive: true, force: true });
}
