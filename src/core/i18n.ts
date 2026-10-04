// Interface strings. The English text is the key: t('Undo') looks 'Undo' up in the
// dictionary of the language chosen and falls back to the English. tn() takes the
// English singular and plural, and a dictionary gives an object with one form for each
// of Intl.PluralRules' categories in that language (Russian: one, few, many, other;
// Arabic all six). They are named rather than listed in order, since Node's and a
// browser's ICU need not agree on the categories a language has.
// N_() marks a string to translate later, where a table is built before a language is
// known. tools/i18n.mjs finds all three by a regular expression, so the arguments must
// be plain string literals.

export type Forms = Partial<Record<Intl.LDMLPluralRule, string>>;
export type Dictionary = Record<string, string | Forms>;

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
  if (forms && typeof forms === 'object') {
    const form = forms[plurals.select(count)] ?? forms.other;
    if (form) return fill(form, all);
  }
  return fill(count === 1 ? one : other, all);
}

export const N_ = (text: string): string => text;
