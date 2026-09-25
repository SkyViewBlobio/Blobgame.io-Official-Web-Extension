import { normalizeBlurSetting } from './InGameUiSettings.js';

export const KEYSTROKE_HUD_KEY = 'blobio.settings.keystrokeHud';
export const KEYSTROKE_SIZE_LIMITS = { min: 50, max: 180, defaultValue: 100 };
export const KEYSTROKE_COLORS = {
  font: { color: '#f4fff7', alpha: 1 },
  outline: { color: '#8bafa0', alpha: 0.6 },
  fill: { color: '#101b19', alpha: 0.72 },
  highlight: { color: '#64e885', alpha: 0.85 },
};
export const KEYSTROKE_ACTIONS = [
  { label: 'Throw', key: 'config-keys-throw', defaultKey: 87 },
  { label: 'Split', key: 'config-keys-split', defaultKey: 32 },
  { label: '2x Split', key: 'config-keys-two-split', defaultKey: 68 },
  { label: '4x Split', key: 'config-keys-four-split', defaultKey: 84 },
];

export function normalizeKeystrokeHudSettings(value = {}) {
  const x = Number(value.x ?? 0.5);
  const y = Number(value.y ?? 0.9);
  const size = Number(value.size ?? KEYSTROKE_SIZE_LIMITS.defaultValue);
  const next = {
    enabled: value.enabled === true,
    positionEditor: value.positionEditor === true,
    layout: value.layout === 'vertical' ? 'vertical' : 'horizontal',
    size: Number.isFinite(size)
      ? Math.max(KEYSTROKE_SIZE_LIMITS.min, Math.min(KEYSTROKE_SIZE_LIMITS.max, Math.round(size)))
      : KEYSTROKE_SIZE_LIMITS.defaultValue,
    x: Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0.5,
    y: Number.isFinite(y) ? Math.max(0, Math.min(1, y)) : 0.9,
    blur: normalizeBlurSetting(value.blur || {}),
  };
  for (const [name, fallback] of Object.entries(KEYSTROKE_COLORS)) {
    const color = String(value[name]?.color || '').toLowerCase();
    const alpha = Number(value[name]?.alpha ?? fallback.alpha);
    next[name] = {
      color: /^#[0-9a-f]{6}$/.test(color) ? color : fallback.color,
      alpha: Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : fallback.alpha,
    };
  }
  return next;
}

export function readKeystrokeHudSettings(storage) {
  try { return normalizeKeystrokeHudSettings(JSON.parse(storage?.getItem?.(KEYSTROKE_HUD_KEY) || '{}') || {}); }
  catch { return normalizeKeystrokeHudSettings(); }
}

export function saveKeystrokeHudSettings(storage, changes) {
  const next = normalizeKeystrokeHudSettings({ ...readKeystrokeHudSettings(storage), ...changes });
  storage?.setItem?.(KEYSTROKE_HUD_KEY, JSON.stringify(next));
  return next;
}

export function readKeystrokeBindings(storage) {
  return KEYSTROKE_ACTIONS.map(action => {
    let value;
    try { value = storage?.getItem?.(action.key); } catch {}
    const key = value === null || value === undefined || value === '' ? action.defaultKey : Number(value);
    return Number.isInteger(key) && key >= 0 && key <= 255 ? key : action.defaultKey;
  });
}

export function keystrokeKeyLabel(key) {
  if (key >= 65 && key <= 90 || key >= 48 && key <= 57) return String.fromCharCode(key);
  if (key >= 112 && key <= 123) return `F${key - 111}`;
  if (key >= 96 && key <= 105) return `Num ${key - 96}`;
  return ({ 0: '—', 8: 'Back', 9: 'Tab', 13: 'Enter', 16: 'Shift', 17: 'Ctrl', 18: 'Alt',
    27: 'Esc', 32: 'Space', 33: 'PgUp', 34: 'PgDn', 35: 'End', 36: 'Home',
    37: '←', 38: '↑', 39: '→', 40: '↓', 45: 'Ins', 46: 'Del', 107: '+',
    109: '−', 110: '.', 186: ';', 187: '=', 188: ',', 189: '−', 190: '.',
    191: '/', 219: '[', 220: '\\', 221: ']', 222: "'" })[key] || `Key ${key}`;
}
