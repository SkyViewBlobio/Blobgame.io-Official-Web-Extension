import { CELL_MASS_SNAPSHOT_KEY, normalizeCellMassSettings } from '../cellMass/CellMassSettings.js';
import { CELL_RING_KEYS, CELL_RING_SNAPSHOT_KEY, normalizeCellRingSettings } from '../cellRing/CellRingSettings.js';
import { CELL_BORDER_SYNC_KEY } from '../cellRing/CellBorderSyncSettings.js';
import { VIRUS_PELLET_COLOR_SNAPSHOT_KEY, normalizeVirusPelletColorSettings } from '../cellColors/VirusPelletColorSettings.js';
import { CELL_PAUSE_STORAGE_KEYS } from '../controls/CellPauseSettings.js';
import { EMOTE_SKIN_ENABLED_KEY } from '../emotes/EmoteSkinSettings.js';
import { FPS_SAVER_SNAPSHOT_KEY, normalizeFpsSaverSettings } from '../fpsSaver/FpsSaverSettings.js';
import { FRIEND_HIGHLIGHT_ENABLED_KEY } from '../friends/FriendHighlightStore.js';
import { FRIEND_MINIMAP_KEYS } from '../friends/FriendMinimapSettings.js';
import { JELLY_SHADER_KEYS } from '../jelly/JellyShaderSettings.js';
import { LIQUID_JELLY_KEY } from '../jelly/LiquidJellySettings.js';
import { HIDE_ADMIN_MD_STORAGE_KEY, CLAN_TEXT_STORAGE_KEYS } from '../roles/RoleSettings.js';
import {
  MUTED_PLAYERS_ENABLED_KEY, MUTED_NO_UID_ALL_KEY,
  MUTED_PLAYERS_LIST_KEY, MUTED_NO_UID_NAMES_KEY,
} from '../chat/MutedPlayersStore.js';
import { HOTKEYS_STORAGE_KEY } from '../hotkeys/HotkeyStore.js';
import { GAME_BACKGROUND_KEYS } from './GameBackgroundSettings.js';
import { HUD_INFO_KEYS } from './HudInfoSettings.js';
import {
  CAPTCHA_LOGO_HIDDEN_KEY, SMOOTH_CHAT_KEY, KEY_SHORTCUTS_HIDDEN_KEY,
  CHAT_BLUR_KEY, LEADERBOARD_BLUR_KEY, MINIMAP_BLUR_KEY,
  CHAT_BACKGROUND_KEYS, MINIMAP_GRID_KEYS, MINIMAP_FONT_KEYS,
  MINIMAP_OUTLINE_KEYS, MINIMAP_BACKGROUND_KEYS, CHAT_SLIDER_KEYS,
  CHAT_OUTLINE_KEYS, LEADERBOARD_BACKGROUND_KEYS, LEADERBOARD_OUTLINE_KEYS,
  CHAT_GLOW_KEYS, LEADERBOARD_GLOW_KEYS, MINIMAP_GLOW_KEYS,
  LEADERBOARD_FONT_KEYS, LEADERBOARD_SIZE_KEYS, normalizeBlurSetting,
} from './InGameUiSettings.js';
import { KEYSTROKE_ACTIONS, KEYSTROKE_HUD_KEY, normalizeKeystrokeHudSettings } from './KeystrokeHudSettings.js';
import {
  FPS_UNCAP_STORAGE_KEY, CHAT_FONT_SIZE_ENABLED_KEY, CHAT_FONT_SIZE_VALUE_KEY,
  ANIMATION_SPEED_KEYS,
} from './RuntimeSettings.js';
import { WATERMARK_KEYS } from './WatermarkSettings.js';
import { VIRUS_MOTHER_CELL_KEYS, VIRUS_MOTHER_CELL_SNAPSHOT_KEY, normalizeVirusMotherCellSettings } from '../virus/VirusMotherCellSettings.js';

const FORMAT = 'blobio-extension-config';
const VERSION = 1;
const CONFIG_APPLIED_KEY = 'blobio.settings.configApplied';
const LEGACY_COOKIES = [
  'blobioCellRing', 'blobioCellMass', 'blobioFpsSaver',
  'blobioVirusMotherCell', 'blobioVirusPelletColors',
];

const jsonSettings = new Map([
  [CELL_MASS_SNAPSHOT_KEY, normalizeCellMassSettings],
  [CELL_RING_SNAPSHOT_KEY, normalizeCellRingSettings],
  [VIRUS_PELLET_COLOR_SNAPSHOT_KEY, normalizeVirusPelletColorSettings],
  [FPS_SAVER_SNAPSHOT_KEY, normalizeFpsSaverSettings],
  [VIRUS_MOTHER_CELL_SNAPSHOT_KEY, normalizeVirusMotherCellSettings],
  [KEYSTROKE_HUD_KEY, normalizeKeystrokeHudSettings],
  [CHAT_BLUR_KEY, normalizeBlurSetting],
  [LEADERBOARD_BLUR_KEY, normalizeBlurSetting],
  [MINIMAP_BLUR_KEY, normalizeBlurSetting],
]);

const settingKeys = new Set([
  ...jsonSettings.keys(),
  ...Object.values(CELL_RING_KEYS), CELL_BORDER_SYNC_KEY,
  ...Object.values(CELL_PAUSE_STORAGE_KEYS), EMOTE_SKIN_ENABLED_KEY,
  FRIEND_HIGHLIGHT_ENABLED_KEY, ...Object.values(FRIEND_MINIMAP_KEYS),
  ...Object.values(JELLY_SHADER_KEYS), LIQUID_JELLY_KEY,
  HIDE_ADMIN_MD_STORAGE_KEY, ...Object.values(CLAN_TEXT_STORAGE_KEYS),
  MUTED_PLAYERS_ENABLED_KEY, MUTED_NO_UID_ALL_KEY,
  ...Object.values(GAME_BACKGROUND_KEYS), ...Object.values(HUD_INFO_KEYS),
  CAPTCHA_LOGO_HIDDEN_KEY, SMOOTH_CHAT_KEY, KEY_SHORTCUTS_HIDDEN_KEY,
  ...Object.values(CHAT_BACKGROUND_KEYS), ...Object.values(MINIMAP_GRID_KEYS),
  ...Object.values(MINIMAP_FONT_KEYS), ...Object.values(MINIMAP_OUTLINE_KEYS),
  ...Object.values(MINIMAP_BACKGROUND_KEYS), ...Object.values(CHAT_SLIDER_KEYS),
  ...Object.values(CHAT_OUTLINE_KEYS), ...Object.values(LEADERBOARD_BACKGROUND_KEYS),
  ...Object.values(LEADERBOARD_OUTLINE_KEYS), ...Object.values(CHAT_GLOW_KEYS),
  ...Object.values(LEADERBOARD_GLOW_KEYS), ...Object.values(MINIMAP_GLOW_KEYS),
  ...Object.values(LEADERBOARD_FONT_KEYS), ...Object.values(LEADERBOARD_SIZE_KEYS),
  ...Object.values(VIRUS_MOTHER_CELL_KEYS),
  FPS_UNCAP_STORAGE_KEY, CHAT_FONT_SIZE_ENABLED_KEY, CHAT_FONT_SIZE_VALUE_KEY,
  ...Object.values(ANIMATION_SPEED_KEYS),
  WATERMARK_KEYS.enabled, WATERMARK_KEYS.mode, WATERMARK_KEYS.color,
  ...KEYSTROKE_ACTIONS.map(action => action.key),
  'blobio.watermark.enabled', 'blobio.dailyTasks.mode',
  'config-switch-jelly-physics',
]);

function cleanSetting(key, value) {
  if (typeof value !== 'string') throw new Error(`Invalid value for ${key}`);
  const normalize = jsonSettings.get(key);
  if (normalize) {
    if (value.length > 16384) throw new Error(`Invalid value for ${key}`);
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`Invalid value for ${key}`);
    }
    return JSON.stringify(normalize(parsed));
  }
  if (value.length > 128 || !/^[a-zA-Z0-9#._-]*$/.test(value)) {
    throw new Error(`Invalid value for ${key}`);
  }
  return value;
}

export function exportConfig(storage) {
  const settings = {};
  for (const key of settingKeys) {
    const value = storage.getItem(key);
    if (value !== null && value !== undefined) settings[key] = cleanSetting(key, value);
  }
  return { format: FORMAT, version: VERSION, settings };
}

export function parseConfig(text) {
  if (typeof text !== 'string' || text.length > 1024 * 1024) throw new Error('Config file is too large.');
  const config = JSON.parse(text);
  if (config?.format !== FORMAT || config.version !== VERSION ||
    !config.settings || typeof config.settings !== 'object' || Array.isArray(config.settings)) {
    throw new Error('This is not a supported Blobio config file.');
  }
  const settings = {};
  for (const [key, value] of Object.entries(config.settings)) {
    if (!settingKeys.has(key)) throw new Error(`Config contains an unsupported setting: ${key}`);
    settings[key] = cleanSetting(key, value);
  }
  return settings;
}

export function applyConfig(storage, settings) {
  for (const key of settingKeys) storage.removeItem(key);
  for (const [key, value] of Object.entries(settings)) storage.setItem(key, value);
  storage.setItem(CONFIG_APPLIED_KEY, '1');
}

export function resetConfig(storage) {
  applyConfig(storage, {});
  for (const key of [
    WATERMARK_KEYS.profileName, HOTKEYS_STORAGE_KEY,
    MUTED_PLAYERS_LIST_KEY, MUTED_NO_UID_NAMES_KEY,
  ]) storage.removeItem(key);
}

export function clearLegacyConfigCookies(document) {
  const host = String(document.defaultView?.location?.hostname || '');
  const domains = [''];
  if (host === 'blobgame.io' || host.endsWith('.blobgame.io')) {
    domains.push('; Domain=.blobgame.io', `; Domain=${host}`);
  }
  let cleared = true;
  for (const name of LEGACY_COOKIES) {
    for (const domain of domains) {
      document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${domain}`;
    }
    if (String(document.cookie || '').split(';').some(entry => entry.trim().startsWith(`${name}=`))) {
      cleared = false;
    }
  }
  return cleared;
}
