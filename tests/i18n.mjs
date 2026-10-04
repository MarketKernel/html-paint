/**
 * Translations: every string the interface shows is in every dictionary, none is left
 * over, each keeps the {placeholders} of the English, and t() and tn() look them up —
 * with Russian plurals in their three forms.
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
for (const [code, dict] of Object.entries(await dictionaries())) {
  const broken = Object.entries(dict).filter(([key, value]) => [value].flat().some((v) => slots(v).join() !== slots(key).join()));
  check(`${code}: placeholders kept`, broken.map(([key]) => key), []);
  check(`${code}: nothing left empty`, Object.keys(dict).filter((key) => ![dict[key]].flat().every(Boolean)), []);
}

I.setLanguage('en', {});
check('English as written', I.t('Undo'), 'Undo');
check('placeholders', I.t('Offset {x}, {y}', { x: 3, y: -4 }), 'Offset 3, -4');
check('English plural', [1, 2].map((n) => I.tn('{count} layer', '{count} layers', n)), ['1 layer', '2 layers']);
I.setLanguage('ru', { Undo: 'Отменить', '{count} layers': ['{count} слой', '{count} слоя', '{count} слоёв'] });
check('a translation', I.t('Undo'), 'Отменить');
check('a missing one falls back', I.t('Redo'), 'Redo');
check('Russian plurals', [1, 3, 5, 21, 11].map((n) => I.tn('{count} layer', '{count} layers', n)), ['1 слой', '3 слоя', '5 слоёв', '21 слой', '11 слоёв']);
check('N_ marks only', I.N_('Undo'), 'Undo');

done('i18n');
