import { readBooleanSetting } from '../storage/readBooleanSetting.js';
import { createBlobioStorage } from '../storage/BlobioStorage.js';

export const CELL_PAUSE_STORAGE_KEYS = Object.freeze({
  enabled: 'blobio.controls.cellPause.enabled',
  keyCode: 'blobio.controls.cellPause.keyCode',
});

export const CELL_PAUSE_DEFAULTS = Object.freeze({
  enabled: true,
  keyCode: 'KeyR',
});

function normalizeKeyCode(value, fallback = CELL_PAUSE_DEFAULTS.keyCode) {
  const code = String(value ?? '').trim();
  if (!code) {
    return '';
  }

  return code.length <= 64 && !/\s/.test(code) ? code : fallback;
}

export function readCellPauseSettings(storage = createBlobioStorage()) {
  let storedKey = null;
  try {
    storedKey = storage?.getItem?.(CELL_PAUSE_STORAGE_KEYS.keyCode);
  } catch {
    storedKey = null;
  }

  return {
    enabled: readBooleanSetting(storage, CELL_PAUSE_STORAGE_KEYS.enabled, CELL_PAUSE_DEFAULTS.enabled),
    keyCode: storedKey === null || storedKey === undefined
      ? CELL_PAUSE_DEFAULTS.keyCode
      : normalizeKeyCode(storedKey, ''),
  };
}

export function saveCellPauseSettings(storage, changes = {}) {
  const current = readCellPauseSettings(storage);
  const next = {
    enabled: changes.enabled === undefined ? current.enabled : Boolean(changes.enabled),
    keyCode: changes.keyCode === undefined ? current.keyCode : normalizeKeyCode(changes.keyCode, current.keyCode),
  };

  try {
    storage?.setItem?.(CELL_PAUSE_STORAGE_KEYS.enabled, next.enabled ? '1' : '0');
    storage?.setItem?.(CELL_PAUSE_STORAGE_KEYS.keyCode, next.keyCode);
  } catch {}

  return next;
}
