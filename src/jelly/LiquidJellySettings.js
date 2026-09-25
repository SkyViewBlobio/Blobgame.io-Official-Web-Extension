import { readBooleanSetting } from '../storage/readBooleanSetting.js';

export const LIQUID_JELLY_KEY = 'blobio.settings.liquidJelly.enabled';

export function readLiquidJellySetting(storage) {
  return readBooleanSetting(storage, LIQUID_JELLY_KEY, false);
}

export function saveLiquidJellySetting(storage, enabled) {
  const nextEnabled = Boolean(enabled);
  storage?.setItem?.(LIQUID_JELLY_KEY, nextEnabled ? '1' : '0');
  return nextEnabled;
}
