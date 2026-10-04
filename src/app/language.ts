// The interface's language: English as written in the code, or a dictionary from
// src/locales. "auto" takes the first of the browser's languages there is one for.

import { setLanguage, type Dictionary } from '../core/i18n';
import ru from '../locales/ru.json';
import uk from '../locales/uk.json';
import { app } from './app';

export const LANGUAGES: { code: string; name: string; dictionary: Dictionary }[] = [
  { code: 'en', name: 'English', dictionary: {} },
  { code: 'ru', name: 'Русский', dictionary: ru as Dictionary },
  { code: 'uk', name: 'Українська', dictionary: uk as Dictionary },
];

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
  app.emit('lang');
}

export function applyTheme(): void {
  const setting = app.settings.theme;
  const dark = setting === 'dark' || (setting === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  app.view?.requestDraw();
}
