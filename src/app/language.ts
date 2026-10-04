// The interface's language: English as written in the code, or a dictionary from
// src/locales. "auto" takes the first of the browser's languages there is one for.
// Arabic and Urdu turn the page right to left; the image itself stays as it is.

import { setLanguage, type Dictionary } from '../core/i18n';
import ar from '../locales/ar.json';
import bn from '../locales/bn.json';
import de from '../locales/de.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import hi from '../locales/hi.json';
import id from '../locales/id.json';
import ja from '../locales/ja.json';
import mr from '../locales/mr.json';
import pt from '../locales/pt.json';
import ru from '../locales/ru.json';
import te from '../locales/te.json';
import tr from '../locales/tr.json';
import uk from '../locales/uk.json';
import ur from '../locales/ur.json';
import zh from '../locales/zh.json';
import { app } from './app';

// The most spoken languages and Ukrainian, each named in itself.
export const LANGUAGES: { code: string; name: string; dictionary: Dictionary }[] = [
  { code: 'en', name: 'English', dictionary: {} },
  { code: 'zh', name: '中文', dictionary: zh as Dictionary },
  { code: 'hi', name: 'हिन्दी', dictionary: hi as Dictionary },
  { code: 'es', name: 'Español', dictionary: es as Dictionary },
  { code: 'fr', name: 'Français', dictionary: fr as Dictionary },
  { code: 'ar', name: 'العربية', dictionary: ar as Dictionary },
  { code: 'bn', name: 'বাংলা', dictionary: bn as Dictionary },
  { code: 'pt', name: 'Português', dictionary: pt as Dictionary },
  { code: 'ru', name: 'Русский', dictionary: ru as Dictionary },
  { code: 'ur', name: 'اردو', dictionary: ur as Dictionary },
  { code: 'id', name: 'Bahasa Indonesia', dictionary: id as Dictionary },
  { code: 'de', name: 'Deutsch', dictionary: de as Dictionary },
  { code: 'ja', name: '日本語', dictionary: ja as Dictionary },
  { code: 'mr', name: 'मराठी', dictionary: mr as Dictionary },
  { code: 'te', name: 'తెలుగు', dictionary: te as Dictionary },
  { code: 'tr', name: 'Türkçe', dictionary: tr as Dictionary },
  { code: 'uk', name: 'Українська', dictionary: uk as Dictionary },
];

const RIGHT_TO_LEFT = new Set(['ar', 'ur']);

export function pickLanguage(setting: string, preferred: readonly string[] = navigator.languages ?? [navigator.language]): string {
  if (LANGUAGES.some((l) => l.code === setting)) return setting;
  for (const tag of preferred) {
    const code = tag.toLowerCase().split('-')[0];
    if (LANGUAGES.some((l) => l.code === code)) return code!;
  }
  return 'en';
}

export function applyLanguage(): void {
  const code = pickLanguage(app.settings.language);
  const language = LANGUAGES.find((l) => l.code === code)!;
  setLanguage(code, language.dictionary);
  document.documentElement.lang = code;
  document.documentElement.dir = RIGHT_TO_LEFT.has(code) ? 'rtl' : 'ltr';
  app.emit('lang');
}

export function applyTheme(): void {
  const setting = app.settings.theme;
  const dark = setting === 'dark' || (setting === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  app.view?.requestDraw();
}
