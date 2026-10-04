/**
 * Bundles src/ into ONE self-contained build/paint.html: the styles, the icon and the
 * compiled TypeScript are inlined, so the page opens from a file:// URL with no network
 * access and no sibling files.
 *
 * The version is package.json's and nowhere else; a build from a commit other than the
 * one tagged v<version> shows the commit too — 0.1.0+1a2b3c4.
 *
 * `--watch` rebuilds on every change under src/, unminified.
 */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
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
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

async function buildOnce() {
  const started = Date.now();
  const label = await versionLabel();
  const [template, styles, code, icon] = await Promise.all([
    readFile(at('src/app/template.html'), 'utf8'),
    readFile(at('src/app/styles.css'), 'utf8'),
    bundle(label),
    appIcon(),
  ]);
  const html = template
    .replace('/*__STYLES__*/', () => styles)
    .replace('/*__APP__*/', () => guard(code))
    .replaceAll('__ICON__', () => icon);
  // Nothing may be loaded from elsewhere: an external src or href is a mistake.
  const external = /\s(?:src|href)=["'](?:https?:)?\/\//i.exec(html);
  if (external) throw new Error(`build/paint.html refers to something outside it: ${external[0]}`);
  await mkdir(at('build'), { recursive: true });
  await writeFile(outFile, html);
  console.log(`build/paint.html  ${(html.length / 1024).toFixed(0)} KB  v${label}  ${Date.now() - started} ms`);
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
