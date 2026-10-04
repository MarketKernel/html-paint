/**
 * The strings the interface shows, as the dictionaries in src/locales key them: the
 * English text itself, or for a plural its English plural form. They are read from the
 * t(), tn() and N_() calls in the .ts files under src/, so those must take plain string
 * literals.
 *
 * `node tools/i18n.mjs` prints, per language, the strings its dictionary lacks and the
 * ones it has but the interface no longer uses; `--json` prints the missing ones as a
 * JSON object to fill in.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { root } from './load.mjs';

const LITERAL = String.raw`'((?:\\.|[^'\\])*)'`;
const CALL = new RegExp(String.raw`\b(t|tn|N_)\(\s*${LITERAL}(?:\s*,\s*${LITERAL})?`, 'g');
const unescape = (text) => text.replace(/\\(.)/g, '$1');

// key → null for a plain string, [one, other] for a plural.
export async function extract() {
  const strings = new Map();
  const dir = join(root, 'src');
  for (const name of (await readdir(dir, { recursive: true })).filter((file) => file.endsWith('.ts')).sort()) {
    const code = await readFile(join(dir, name), 'utf8');
    for (const [, fn, first, second] of code.matchAll(CALL)) {
      if (fn === 'tn') strings.set(unescape(second), [unescape(first), unescape(second)]);
      else strings.set(unescape(first), null);
    }
  }
  return strings;
}

export async function dictionaries() {
  const dir = join(root, 'src', 'locales');
  const out = {};
  for (const name of (await readdir(dir)).filter((file) => file.endsWith('.json')).sort()) {
    out[name.replace(/\.json$/, '')] = JSON.parse(await readFile(join(dir, name), 'utf8'));
  }
  return out;
}

export async function report() {
  const strings = await extract();
  const out = {};
  for (const [code, dict] of Object.entries(await dictionaries())) {
    const missing = [...strings.keys()].filter((key) => !(key in dict));
    const unused = Object.keys(dict).filter((key) => !strings.has(key));
    // A plural needs a list of forms, a plain string a string.
    const wrong = [...strings.entries()].filter(([key, forms]) => key in dict && Array.isArray(dict[key]) !== Array.isArray(forms)).map(([key]) => key);
    out[code] = { missing, unused, wrong };
  }
  return { strings, languages: out };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { strings, languages } = await report();
  if (process.argv.includes('--json')) {
    const code = process.argv[process.argv.indexOf('--json') + 1];
    const missing = languages[code]?.missing ?? [...strings.keys()];
    console.log(JSON.stringify(Object.fromEntries(missing.map((k) => [k, strings.get(k) ? strings.get(k) : ''])), null, 2));
  } else {
    console.log(`${strings.size} strings`);
    for (const [code, { missing, unused, wrong }] of Object.entries(languages)) {
      console.log(`${code}: ${missing.length} missing, ${unused.length} unused, ${wrong.length} of the wrong kind`);
      for (const key of missing) console.log(`  missing: ${key}`);
      for (const key of unused) console.log(`  unused:  ${key}`);
      for (const key of wrong) console.log(`  wrong:   ${key}`);
    }
  }
}
