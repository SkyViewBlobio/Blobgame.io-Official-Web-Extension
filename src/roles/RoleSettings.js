import { readBooleanSetting } from '../storage/readBooleanSetting.js';

export const HIDE_ADMIN_MD_STORAGE_KEY = 'blobio.roles.hideAdminMd';
export const CLAN_TEXT_STORAGE_KEYS = Object.freeze({
  enabled: 'blobio.roles.clanText.enabled',
  showProfileName: 'blobio.roles.clanText.showProfileName',
  showInGameTags: 'blobio.roles.clanText.showInGameTags',
  showCellTags: 'blobio.roles.clanText.showCellTags',
});

export const DEFAULT_CLAN_TEXT_SETTINGS = Object.freeze({
  enabled: true,
  showProfileName: true,
  showInGameTags: true,
  showCellTags: true,
});

export function isHideAdminMdEnabled(storage) {
  return readBooleanSetting(storage, HIDE_ADMIN_MD_STORAGE_KEY, true);
}

export function setHideAdminMdEnabled(storage, enabled) {
  try {
    storage?.setItem?.(HIDE_ADMIN_MD_STORAGE_KEY, enabled ? '1' : '0');
    return Boolean(enabled);
  } catch {
    return isHideAdminMdEnabled(storage);
  }
}

export function normalizeClanTextSettings(settings = {}) {
  const source = settings && typeof settings === 'object' ? settings : {};
  return {
    enabled: source.enabled === undefined ? DEFAULT_CLAN_TEXT_SETTINGS.enabled : Boolean(source.enabled),
    showProfileName: source.showProfileName === undefined
      ? DEFAULT_CLAN_TEXT_SETTINGS.showProfileName
      : Boolean(source.showProfileName),
    showInGameTags: source.showInGameTags === undefined
      ? DEFAULT_CLAN_TEXT_SETTINGS.showInGameTags
      : Boolean(source.showInGameTags),
    showCellTags: source.showCellTags === undefined
      ? DEFAULT_CLAN_TEXT_SETTINGS.showCellTags
      : Boolean(source.showCellTags),
  };
}

export function readClanTextSettings(storage) {
  return normalizeClanTextSettings({
    enabled: readBooleanSetting(storage, CLAN_TEXT_STORAGE_KEYS.enabled, DEFAULT_CLAN_TEXT_SETTINGS.enabled),
    showProfileName: readBooleanSetting(
      storage,
      CLAN_TEXT_STORAGE_KEYS.showProfileName,
      DEFAULT_CLAN_TEXT_SETTINGS.showProfileName,
    ),
    showInGameTags: readBooleanSetting(
      storage,
      CLAN_TEXT_STORAGE_KEYS.showInGameTags,
      DEFAULT_CLAN_TEXT_SETTINGS.showInGameTags,
    ),
    showCellTags: readBooleanSetting(
      storage,
      CLAN_TEXT_STORAGE_KEYS.showCellTags,
      DEFAULT_CLAN_TEXT_SETTINGS.showCellTags,
    ),
  });
}

export function saveClanTextSettings(storage, settings) {
  const next = normalizeClanTextSettings(settings);
  try {
    storage?.setItem?.(CLAN_TEXT_STORAGE_KEYS.enabled, next.enabled ? '1' : '0');
    storage?.setItem?.(CLAN_TEXT_STORAGE_KEYS.showProfileName, next.showProfileName ? '1' : '0');
    storage?.setItem?.(CLAN_TEXT_STORAGE_KEYS.showInGameTags, next.showInGameTags ? '1' : '0');
    storage?.setItem?.(CLAN_TEXT_STORAGE_KEYS.showCellTags, next.showCellTags ? '1' : '0');
  } catch {}
  return next;
}

export function shouldShowProfileClanText(storage) {
  const settings = readClanTextSettings(storage);
  return settings.enabled && settings.showProfileName;
}

export function shouldShowInGameClanText(storage) {
  const settings = readClanTextSettings(storage);
  return settings.enabled && settings.showInGameTags;
}

export function shouldShowCellClanText(storage) {
  const settings = readClanTextSettings(storage);
  return settings.enabled && settings.showCellTags;
}
