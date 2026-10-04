// Interface strings. The English text is the key: t('Undo') looks 'Undo' up in the
// dictionary of the language chosen and falls back to the English. tn() takes the
// English singular and plural, and a dictionary gives one form for each of
// Intl.PluralRules' categories in that language, in the order of ORDER (Russian: one,
// few, many).
// N_() marks a string to translate later, where a table is built before a language is
// known. tools/i18n.mjs finds all three by a regular expression, so the arguments must
// be plain string literals.

export type Dictionary = Record<string, string | string[]>;

const ORDER: Intl.LDMLPluralRule[] = ['zero', 'one', 'two', 'few', 'many', 'other'];

let dictionary: Dictionary = {};
let plurals = new Intl.PluralRules('en');

export function setLanguage(code: string, dict: Dictionary): void {
  dictionary = dict;
  plurals = new Intl.PluralRules(code);
}

const fill = (text: string, values?: Record<string, string | number>): string =>
  values ? text.replace(/\{(\w+)\}/g, (all, key: string) => (key in values ? String(values[key]) : all)) : text;

export function t(text: string, values?: Record<string, string | number>): string {
  const found = dictionary[text];
  return fill(typeof found === 'string' && found ? found : text, values);
}

export function tn(one: string, other: string, count: number, values?: Record<string, string | number>): string {
  const all = { count, ...values };
  const forms = dictionary[other];
  if (Array.isArray(forms) && forms.length) {
    const categories = ORDER.filter((c) => plurals.resolvedOptions().pluralCategories.includes(c));
    const at = categories.indexOf(plurals.select(count));
    return fill(forms[at] ?? forms[forms.length - 1]!, all);
  }
  return fill(count === 1 ? one : other, all);
}

export const N_ = (text: string): string => text;
