import { readBooleanSetting } from '../storage/readBooleanSetting.js';

export const CELL_BORDER_SYNC_KEY = 'blobio.settings.cellBorderSync.enabled';

export function readCellBorderSyncSetting(storage) {
  return readBooleanSetting(storage, CELL_BORDER_SYNC_KEY, true);
}

export function saveCellBorderSyncSetting(storage, enabled) {
  const nextEnabled = Boolean(enabled);
  storage?.setItem?.(CELL_BORDER_SYNC_KEY, nextEnabled ? '1' : '0');
  return nextEnabled;
}
