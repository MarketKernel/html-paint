/**
 * Bundles src/ into ONE self-contained build/paint.html: the styles, the icon and the
 * compiled TypeScript are inlined, so the page opens from a file:// URL with no network
 * access and no sibling files.
 *
 * Beside it goes build/pages/: the same page as an installable PWA for GitHub Pages — a
 * manifest, icons (assets/pwa/, drawn by tools/icons.mjs) and a service worker that keeps
 * it offline.
 *
 * The version is package.json's and nowhere else; a build from a commit other than the
 * one tagged v<version> shows the commit too — 0.1.0+1a2b3c4.
 *
 * `--watch` rebuilds on every change under src/, unminified.
 */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { watch as watchFiles } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const at = (...parts) => join(root, ...parts);
const watch = process.argv.includes('--watch');
const outFile = at('build', 'paint.html');

async function versionLabel() {
  const { version } = JSON.parse(await readFile(at('package.json'), 'utf8'));
  const git = (...args) => {
    try {
      return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
      return '';
    }
  };
  const tagged = git('tag', '--points-at', 'HEAD').split('\n').includes(`v${version}`);
  const commit = tagged ? '' : git('rev-parse', '--short', 'HEAD');
  return commit ? `${version}+${commit}` : version;
}

/** `</script` inside a string literal would close the inline tag early. */
const guard = (code) => code.replace(/<\/(script|style)/gi, '<\\/$1');

async function bundle(label) {
  const result = await build({
    entryPoints: [at('src/app/main.ts')],
    bundle: true,
    format: 'iife',
    target: ['es2022'],
    platform: 'browser',
    minify: !watch,
    legalComments: 'none',
    charset: 'utf8',
    define: { __APP_VERSION__: JSON.stringify(label) },
    write: false,
  });
  return result.outputFiles[0].text;
}

/** The icon is the one in src/app/icons.ts, so the tab and the menu bar show the same. */
async function appIcon() {
  const source = await readFile(at('src/app/icons.ts'), 'utf8');
  const svg = /export const APP_ICON = `([^`]+)`/.exec(source)?.[1];
  if (!svg) throw new Error('src/app/icons.ts has no APP_ICON');
  return svg;
}

/** Under assets/pwa/; each goes to build/pages/ under its own name. */
const PWA_ICONS = ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

/**
 * The page's CSP forbids every fetch; the installed app needs its manifest, its service
 * worker and its icons, all from its own origin. connect-src stays 'none', so the page
 * itself still reaches nothing.
 */
function allowPwa(html) {
  const pattern = /(http-equiv="Content-Security-Policy" content=")([^"]*)/;
  if (!pattern.test(html)) throw new Error('The Content-Security-Policy meta tag is missing');
  return html.replace(pattern, (_, attr, policy) => {
    const directives = new Map(policy.split(';').map((d) => d.trim().split(/\s+/)).map(([name, ...sources]) => [name, sources]));
    if (!directives.has('img-src')) throw new Error('The Content-Security-Policy has no img-src');
    directives.get('img-src').push("'self'");
    directives.set('manifest-src', ["'self'"]);
    directives.set('worker-src', ["'self'"]);
    return attr + [...directives].map(([name, sources]) => [name, ...sources].join(' ')).join('; ');
  });
}

/**
 * build/pages/: the page plus what makes it installable. Every path is relative, so it
 * works under a project site's /<repo>/ prefix.
 */
async function buildPages(html, svg, label) {
  const dir = at('build', 'pages');
  const head = [
    '<link rel="manifest" href="manifest.webmanifest">',
    '<link rel="apple-touch-icon" href="apple-touch-icon.png">',
    '<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">',
    '<meta name="theme-color" content="#26272b" media="(prefers-color-scheme: dark)">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
    "<script>if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js'));</script>",
  ].join('\n');
  const page = allowPwa(html).replace('</head>', () => `${head}\n</head>`);
  // A deploy between two releases changes the page, not the version: the hash tells them apart.
  const cache = `${label}-${createHash('sha256').update(page).digest('hex').slice(0, 12)}`;

  const manifest = {
    name: 'HTML Paint',
    short_name: 'Paint',
    description: 'An image editor in the spirit of Paint.NET that works offline',
    id: './',
    start_url: './',
    scope: './',
    display: 'standalone',
    background_color: '#eef0f3',
    theme_color: '#ffffff',
    icons: [
      { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };

  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const worker = (await readFile(at('src/pwa/sw.js'), 'utf8')).replaceAll('__VERSION__', cache);
  await Promise.all([
    writeFile(join(dir, 'index.html'), page),
    writeFile(join(dir, 'sw.js'), worker),
    writeFile(join(dir, 'manifest.webmanifest'), `${JSON.stringify(manifest, null, 2)}\n`),
    writeFile(join(dir, 'icon.svg'), svg),
    // Without it Pages runs the files through Jekyll, which is only wasted time here.
    writeFile(join(dir, '.nojekyll'), ''),
    ...PWA_ICONS.map((name) => copyFile(at('assets', 'pwa', name), join(dir, name))),
  ]);
  console.log(`build/pages/      PWA for GitHub Pages, cache ${cache}`);
}

async function buildOnce() {
  const started = Date.now();
  const label = await versionLabel();
  const [template, styles, code, svg] = await Promise.all([
    readFile(at('src/app/template.html'), 'utf8'),
    readFile(at('src/app/styles.css'), 'utf8'),
    bundle(label),
    appIcon(),
  ]);
  const html = template
    .replace('/*__STYLES__*/', () => styles)
    .replace('/*__APP__*/', () => guard(code))
    .replaceAll('__ICON__', () => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
  // Nothing may be loaded from elsewhere: an external src or href is a mistake.
  const external = /\s(?:src|href)=["'](?:https?:)?\/\//i.exec(html);
  if (external) throw new Error(`build/paint.html refers to something outside it: ${external[0]}`);
  await mkdir(at('build'), { recursive: true });
  await writeFile(outFile, html);
  console.log(`build/paint.html  ${(html.length / 1024).toFixed(0)} KB  v${label}  ${Date.now() - started} ms`);
  await buildPages(html, svg, label);
}

await buildOnce();

if (watch) {
  let timer = null;
  watchFiles(at('src'), { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => buildOnce().catch((error) => console.error(error.message)), 100);
  });
  console.log('Watching src/ …');
}
