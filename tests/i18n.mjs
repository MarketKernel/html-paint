/**
 * Translations: every string the interface shows is in every dictionary, none is left
 * over, each keeps the {placeholders} of the English, a plural has a form for each of its
 * language's categories, and t() and tn() look them up — with Russian and Arabic plurals.
 */
import { checker, load } from '../tools/load.mjs';
import { dictionaries, report } from '../tools/i18n.mjs';

const I = await load('core/i18n');
const { check, done } = checker();

const { strings, languages } = await report();
check('strings found', strings.size > 200, true);
for (const [code, { missing, unused, wrong }] of Object.entries(languages)) {
  check(`${code}: nothing missing`, missing, []);
  check(`${code}: nothing unused`, unused, []);
  check(`${code}: plurals are plurals`, wrong, []);
}

const slots = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const values = (value) => (typeof value === 'string' ? [value] : Object.values(value));
for (const [code, dict] of Object.entries(await dictionaries())) {
  // A plural form may leave out {count} ("one layer"), but not the others.
  const kept = (key, value) => (typeof value === 'string' ? slots(value).join() === slots(key).join() : values(value).every((v) => slots(v).filter((s) => s !== 'count').join() === slots(key).filter((s) => s !== 'count').join()));
  check(`${code}: placeholders kept`, Object.keys(dict).filter((key) => !kept(key, dict[key])), []);
  check(`${code}: nothing left empty`, Object.keys(dict).filter((key) => !values(dict[key]).every(Boolean)), []);
  const categories = new Intl.PluralRules(code).resolvedOptions().pluralCategories;
  const plurals = Object.entries(dict).filter(([, value]) => typeof value !== 'string');
  check(`${code}: every plural category`, plurals.filter(([, forms]) => !categories.every((c) => forms[c])).map(([key]) => key), []);
}

I.setLanguage('en', {});
check('English as written', I.t('Undo'), 'Undo');
check('placeholders', I.t('Offset {x}, {y}', { x: 3, y: -4 }), 'Offset 3, -4');
check('English plural', [1, 2].map((n) => I.tn('{count} layer', '{count} layers', n)), ['1 layer', '2 layers']);
I.setLanguage('ru', { Undo: 'Отменить', '{count} layers': { one: '{count} слой', few: '{count} слоя', many: '{count} слоёв', other: '{count} слоя' } });
check('a translation', I.t('Undo'), 'Отменить');
check('a missing one falls back', I.t('Redo'), 'Redo');
check('Russian plurals', [1, 3, 5, 21, 11].map((n) => I.tn('{count} layer', '{count} layers', n)), ['1 слой', '3 слоя', '5 слоёв', '21 слой', '11 слоёв']);
I.setLanguage('ar', { '{count} layers': { zero: 'لا طبقات', one: 'طبقة واحدة', two: 'طبقتان', few: '{count} طبقات', many: '{count} طبقة', other: '{count} طبقة' } });
check('Arabic plurals', [0, 1, 2, 3, 11, 100].map((n) => I.tn('{count} layer', '{count} layers', n)), ['لا طبقات', 'طبقة واحدة', 'طبقتان', '3 طبقات', '11 طبقة', '100 طبقة']);
check('N_ marks only', I.N_('Undo'), 'Undo');

done('i18n');
