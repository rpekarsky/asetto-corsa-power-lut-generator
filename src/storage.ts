import type { InputState } from './types';

const STORAGE_KEY = 'f1lut_v1';

export function saveState(inputs: InputState): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs)); } catch { /* quota / private mode */ }
}

export function loadState(): Partial<InputState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<InputState>) : null;
  } catch { return null; }
}
