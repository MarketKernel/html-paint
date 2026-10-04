// The tools' options and the page's preferences, kept in localStorage between visits.
// A value of the wrong type in storage (an older version, a hand edit) is ignored.

import type { SelectMode } from './selection';

export interface Settings {
  brushSize: number;
  hardness: number;
  opacity: number;
  antialias: boolean;
  tolerance: number;
  floodMode: 'contiguous' | 'global';
  sampling: 'layer' | 'image';
  shapeStyle: 'outline' | 'fill' | 'both';
  dash: 'solid' | 'dash' | 'dot';
  radius: number;
  arrows: 'none' | 'end' | 'both';
  gradient: 'linear' | 'reflected' | 'radial' | 'conic';
  selectMode: SelectMode;
  font: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: 'left' | 'center' | 'right';
  density: number;
  pickerAfter: 'stay' | 'previous';
  grid: boolean;
  theme: 'auto' | 'light' | 'dark';
  language: string;
  primary: string;
  secondary: string;
  recent: string[];
  panels: boolean;
}

export const DEFAULTS: Settings = {
  brushSize: 8,
  hardness: 100,
  opacity: 100,
  antialias: true,
  tolerance: 25,
  floodMode: 'contiguous',
  sampling: 'layer',
  shapeStyle: 'outline',
  dash: 'solid',
  radius: 0,
  arrows: 'none',
  gradient: 'linear',
  selectMode: 'replace',
  font: 'sans-serif',
  fontSize: 32,
  bold: false,
  italic: false,
  underline: false,
  align: 'left',
  density: 50,
  pickerAfter: 'stay',
  grid: true,
  theme: 'auto',
  language: 'auto',
  primary: '#000000',
  secondary: '#FFFFFF',
  recent: [],
  panels: true,
};

const KEY = 'html-paint.settings';

export function loadSettings(): Settings {
  const out: Settings = { ...DEFAULTS, recent: [] };
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, unknown>;
    for (const key of Object.keys(DEFAULTS) as (keyof Settings)[]) {
      const value = stored[key];
      const fallback = DEFAULTS[key];
      if (value !== undefined && typeof value === typeof fallback && Array.isArray(value) === Array.isArray(fallback)) {
        (out as unknown as Record<string, unknown>)[key] = value;
      }
    }
  } catch {
    // Storage blocked or unreadable: the defaults do.
  }
  return out;
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Private mode or full storage: preferences last until the page closes.
  }
}
