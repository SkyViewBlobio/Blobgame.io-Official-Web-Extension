import { readBooleanSetting } from '../storage/readBooleanSetting.js';

export const CAPTCHA_LOGO_HIDDEN_KEY = 'blobio.chat.hideCaptchaLogo';
export const SMOOTH_CHAT_KEY = 'blobio.chat.smoothChat';
export const KEY_SHORTCUTS_HIDDEN_KEY = 'blobio.chat.hideKeyShortcuts';
export const CHAT_BLUR_KEY = 'blobio.chat.blur';
export const LEADERBOARD_BLUR_KEY = 'blobio.chat.leaderboard.blur';
export const MINIMAP_BLUR_KEY = 'blobio.settings.minimap.blur';
export const BLUR_LIMITS = { min: 0, max: 24, defaultValue: 8 };

export function normalizeBlurSetting(setting = {}) {
  const value = Number(setting.value ?? BLUR_LIMITS.defaultValue);
  return {
    enabled: setting.enabled === true,
    value: Number.isFinite(value) ? Math.max(0, Math.min(BLUR_LIMITS.max, Math.round(value))) : BLUR_LIMITS.defaultValue,
  };
}

export function getBlurSetting(storage, key) {
  try { return normalizeBlurSetting(JSON.parse(storage?.getItem?.(key) || '{}') || {}); }
  catch { return normalizeBlurSetting(); }
}

export function setBlurSetting(storage, key, changes) {
  const next = normalizeBlurSetting({ ...getBlurSetting(storage, key), ...changes });
  storage?.setItem?.(key, JSON.stringify(next));
  return next;
}

export const CHAT_BACKGROUND_KEYS = {
  enabled: 'blobio.chat.background.enabled',
  color: 'blobio.chat.background.color',
  alpha: 'blobio.chat.background.alpha',
  mode: 'blobio.chat.background.mode',
  secondaryColor: 'blobio.chat.background.secondaryColor',
  secondaryAlpha: 'blobio.chat.background.secondaryAlpha',
  angle: 'blobio.chat.background.angle',
};

export const MINIMAP_GRID_KEYS = {
  enabled: 'blobio.settings.minimap.grid.enabled',
  color: 'blobio.settings.minimap.grid.color',
  alpha: 'blobio.settings.minimap.grid.alpha',
};
export const MINIMAP_FONT_KEYS = {
  enabled: 'blobio.settings.minimap.font.enabled',
  color: 'blobio.settings.minimap.font.color',
  alpha: 'blobio.settings.minimap.font.alpha',
};

export const MINIMAP_OUTLINE_KEYS = {
  glow: 'blobio.settings.minimap.outline.glow',
  enabled: 'blobio.settings.minimap.outline.enabled',
  color: 'blobio.settings.minimap.outline.color',
  alpha: 'blobio.settings.minimap.outline.alpha',
  mode: 'blobio.settings.minimap.outline.mode',
  secondaryColor: 'blobio.settings.minimap.outline.secondaryColor',
  secondaryAlpha: 'blobio.settings.minimap.outline.secondaryAlpha',
  angle: 'blobio.settings.minimap.outline.angle',
};

export const MINIMAP_BACKGROUND_KEYS = {
  enabled: 'blobio.settings.minimap.background.enabled',
  color: 'blobio.settings.minimap.background.color',
  alpha: 'blobio.settings.minimap.background.alpha',
  mode: 'blobio.settings.minimap.background.mode',
  secondaryColor: 'blobio.settings.minimap.background.secondaryColor',
  secondaryAlpha: 'blobio.settings.minimap.background.secondaryAlpha',
  angle: 'blobio.settings.minimap.background.angle',
};

export const CHAT_SLIDER_KEYS = {
  enabled: 'blobio.chat.slider.enabled',
  color: 'blobio.chat.slider.color',
  alpha: 'blobio.chat.slider.alpha',
};

export const CHAT_OUTLINE_KEYS = {
  glow: 'blobio.chat.outline.glow',
  enabled: 'blobio.chat.outline.enabled',
  color: 'blobio.chat.outline.color',
  alpha: 'blobio.chat.outline.alpha',
  mode: 'blobio.chat.outline.mode',
  secondaryColor: 'blobio.chat.outline.secondaryColor',
  secondaryAlpha: 'blobio.chat.outline.secondaryAlpha',
  angle: 'blobio.chat.outline.angle',
};

export const LEADERBOARD_BACKGROUND_KEYS = {
  enabled: 'blobio.chat.leaderboard.background.enabled',
  color: 'blobio.chat.leaderboard.background.color',
  alpha: 'blobio.chat.leaderboard.background.alpha',
  mode: 'blobio.chat.leaderboard.background.mode',
  secondaryColor: 'blobio.chat.leaderboard.background.secondaryColor',
  secondaryAlpha: 'blobio.chat.leaderboard.background.secondaryAlpha',
  angle: 'blobio.chat.leaderboard.background.angle',
};

export const LEADERBOARD_OUTLINE_KEYS = {
  glow: 'blobio.chat.leaderboard.outline.glow',
  enabled: 'blobio.chat.leaderboard.outline.enabled',
  color: 'blobio.chat.leaderboard.outline.color',
  alpha: 'blobio.chat.leaderboard.outline.alpha',
  mode: 'blobio.chat.leaderboard.outline.mode',
  secondaryColor: 'blobio.chat.leaderboard.outline.secondaryColor',
  secondaryAlpha: 'blobio.chat.leaderboard.outline.secondaryAlpha',
  angle: 'blobio.chat.leaderboard.outline.angle',
};

export const CHAT_GLOW_KEYS = {
  enabled: 'blobio.chat.glow.enabled',
  color: 'blobio.chat.glow.color',
  alpha: 'blobio.chat.glow.alpha',
  mode: 'blobio.chat.glow.mode',
  secondaryColor: 'blobio.chat.glow.secondaryColor',
  secondaryAlpha: 'blobio.chat.glow.secondaryAlpha',
  angle: 'blobio.chat.glow.angle',
};

export const LEADERBOARD_GLOW_KEYS = {
  enabled: 'blobio.chat.leaderboard.glow.enabled',
  color: 'blobio.chat.leaderboard.glow.color',
  alpha: 'blobio.chat.leaderboard.glow.alpha',
  mode: 'blobio.chat.leaderboard.glow.mode',
  secondaryColor: 'blobio.chat.leaderboard.glow.secondaryColor',
  secondaryAlpha: 'blobio.chat.leaderboard.glow.secondaryAlpha',
  angle: 'blobio.chat.leaderboard.glow.angle',
};

export const MINIMAP_GLOW_KEYS = {
  enabled: 'blobio.settings.minimap.glow.enabled',
  color: 'blobio.settings.minimap.glow.color',
  alpha: 'blobio.settings.minimap.glow.alpha',
  mode: 'blobio.settings.minimap.glow.mode',
  secondaryColor: 'blobio.settings.minimap.glow.secondaryColor',
  secondaryAlpha: 'blobio.settings.minimap.glow.secondaryAlpha',
  angle: 'blobio.settings.minimap.glow.angle',
};

export const LEADERBOARD_FONT_KEYS = {
  enabled: 'blobio.chat.leaderboard.fontSizeEnabled',
  value: 'blobio.chat.leaderboard.fontSizePx',
};

export const LEADERBOARD_SIZE_KEYS = {
  width: 'blobio.chat.leaderboard.widthPx',
  height: 'blobio.chat.leaderboard.heightPx',
};

export const LEADERBOARD_SIZE_LIMITS = {
  minWidth: 180,
  minHeight: 90,
  maxWidth: 720,
  maxHeight: 720,
};

export const UI_FONT_SIZE_LIMITS = {
  min: 8,
  max: 48,
  defaultValue: 16,
};

const DEFAULT_COLORS = {
  glow: { enabled: false, color: '#53ff82', alpha: 1 },
  minimapGrid: { enabled: true, color: '#ffffff', alpha: 0.12 },
  minimapFont: { enabled: true, color: '#ffffff', alpha: 0.38 },
  minimapBackground: { enabled: false, color: '#000000', alpha: 0.72 },
  minimapOutline: { enabled: false, color: '#53ff82', alpha: 0.72 },
  chatBackground: { enabled: false, color: '#000000', alpha: 0.72 },
  chatSlider: { enabled: false, color: '#64e885', alpha: 0.9 },
  chatOutline: { enabled: false, color: '#53ff82', alpha: 0.72 },
  leaderboardBackground: { enabled: false, color: '#000000', alpha: 0.72 },
  leaderboardOutline: { enabled: false, color: '#53ff82', alpha: 0.72 },
};

function normalizeColor(value, fallback) {
  const color = String(value || '').trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(color) ? color : fallback;
}

function normalizeAlpha(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  const alpha = Number(value);
  return Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : fallback;
}

function normalizeGradientAngle(value) {
  const angle = Number(value ?? 135);
  return Number.isFinite(angle) ? Math.max(0, Math.min(360, Math.round(angle))) : 135;
}

function normalizeFontSize(value) {
  const size = Math.round(Number(value) || UI_FONT_SIZE_LIMITS.defaultValue);
  return Math.max(UI_FONT_SIZE_LIMITS.min, Math.min(UI_FONT_SIZE_LIMITS.max, size));
}

function normalizeOptionalSize(value, min, max) {
  const size = Math.round(Number(value));
  return Number.isFinite(size) && size >= min
    ? Math.min(max, size)
    : null;
}

export function getBooleanSetting(storage, key, fallback = false) {
  return readBooleanSetting(storage, key, fallback);
}

export function setBooleanSetting(storage, key, enabled) {
  try {
    storage?.setItem?.(key, enabled ? '1' : '0');
  } catch {}
  return Boolean(enabled);
}

export function getColorSetting(storage, keys, defaults) {
  const fallback = defaults || DEFAULT_COLORS.chatBackground;
  let color = fallback.color;
  let alpha = fallback.alpha;

  try {
    color = normalizeColor(storage?.getItem?.(keys.color), fallback.color);
    alpha = normalizeAlpha(storage?.getItem?.(keys.alpha), fallback.alpha);
  } catch {}

  const setting = {
    enabled: readBooleanSetting(storage, keys.enabled, fallback.enabled),
    color,
    alpha,
  };
  if (keys.mode) {
    setting.mode = 'rgb';
    setting.secondaryColor = '#367ac9';
    setting.angle = 135;
    setting.secondaryAlpha = setting.alpha;
    try {
      setting.mode = storage?.getItem?.(keys.mode) === 'gradient' ? 'gradient' : 'rgb';
      setting.secondaryColor = normalizeColor(storage?.getItem?.(keys.secondaryColor), setting.secondaryColor);
      setting.secondaryAlpha = normalizeAlpha(storage?.getItem?.(keys.secondaryAlpha), setting.alpha);
      setting.angle = normalizeGradientAngle(storage?.getItem?.(keys.angle));
    } catch {}
  }
  if (keys.glow) {
    setting.glow = 0.35;
    try { setting.glow = normalizeAlpha(storage?.getItem?.(keys.glow), setting.glow); } catch {}
  }
  return setting;
}

export function setColorSetting(storage, keys, changes, defaults) {
  const current = getColorSetting(storage, keys, defaults);
  const next = {
    enabled: changes.enabled === undefined ? current.enabled : Boolean(changes.enabled),
    color: normalizeColor(changes.color ?? current.color, current.color),
    alpha: normalizeAlpha(changes.alpha ?? current.alpha, current.alpha),
  };
  if (keys.mode) {
    next.mode = (changes.mode ?? current.mode) === 'gradient' ? 'gradient' : 'rgb';
    next.secondaryColor = normalizeColor(changes.secondaryColor ?? current.secondaryColor, current.secondaryColor);
    next.secondaryAlpha = normalizeAlpha(changes.secondaryAlpha ?? current.secondaryAlpha, current.secondaryAlpha);
    next.angle = normalizeGradientAngle(changes.angle ?? current.angle);
  }
  if (keys.glow) next.glow = normalizeAlpha(changes.glow ?? current.glow, current.glow);

  try {
    storage?.setItem?.(keys.enabled, next.enabled ? '1' : '0');
    storage?.setItem?.(keys.color, next.color);
    storage?.setItem?.(keys.alpha, String(next.alpha));
    if (keys.glow) storage?.setItem?.(keys.glow, String(next.glow));
    if (keys.mode) {
      storage?.setItem?.(keys.mode, next.mode);
      storage?.setItem?.(keys.secondaryColor, next.secondaryColor);
      storage?.setItem?.(keys.secondaryAlpha, String(next.secondaryAlpha));
      storage?.setItem?.(keys.angle, String(next.angle));
    }
  } catch {}

  return next;
}

export function getLeaderboardFontSetting(storage) {
  let value = UI_FONT_SIZE_LIMITS.defaultValue;
  try {
    value = normalizeFontSize(storage?.getItem?.(LEADERBOARD_FONT_KEYS.value));
  } catch {}

  return {
    enabled: readBooleanSetting(storage, LEADERBOARD_FONT_KEYS.enabled, false),
    value,
  };
}

export function setLeaderboardFontSetting(storage, changes) {
  const current = getLeaderboardFontSetting(storage);
  const next = {
    enabled: changes.enabled === undefined ? current.enabled : Boolean(changes.enabled),
    value: changes.value === undefined ? current.value : normalizeFontSize(changes.value),
  };

  try {
    storage?.setItem?.(LEADERBOARD_FONT_KEYS.enabled, next.enabled ? '1' : '0');
    storage?.setItem?.(LEADERBOARD_FONT_KEYS.value, String(next.value));
  } catch {}

  return next;
}

export function getLeaderboardSizeSetting(storage) {
  let width = null;
  let height = null;

  try {
    width = normalizeOptionalSize(
      storage?.getItem?.(LEADERBOARD_SIZE_KEYS.width),
      LEADERBOARD_SIZE_LIMITS.minWidth,
      LEADERBOARD_SIZE_LIMITS.maxWidth,
    );
    height = normalizeOptionalSize(
      storage?.getItem?.(LEADERBOARD_SIZE_KEYS.height),
      LEADERBOARD_SIZE_LIMITS.minHeight,
      LEADERBOARD_SIZE_LIMITS.maxHeight,
    );
  } catch {}

  return { width, height };
}

export function setLeaderboardSizeSetting(storage, changes = {}) {
  const current = getLeaderboardSizeSetting(storage);
  const next = {
    width: changes.width === undefined
      ? current.width
      : normalizeOptionalSize(
        changes.width,
        LEADERBOARD_SIZE_LIMITS.minWidth,
        LEADERBOARD_SIZE_LIMITS.maxWidth,
      ),
    height: changes.height === undefined
      ? current.height
      : normalizeOptionalSize(
        changes.height,
        LEADERBOARD_SIZE_LIMITS.minHeight,
        LEADERBOARD_SIZE_LIMITS.maxHeight,
      ),
  };

  try {
    if (next.width === null) {
      storage?.removeItem?.(LEADERBOARD_SIZE_KEYS.width);
    } else {
      storage?.setItem?.(LEADERBOARD_SIZE_KEYS.width, String(next.width));
    }

    if (next.height === null) {
      storage?.removeItem?.(LEADERBOARD_SIZE_KEYS.height);
    } else {
      storage?.setItem?.(LEADERBOARD_SIZE_KEYS.height, String(next.height));
    }
  } catch {}

  return next;
}

export function readInGameUiSettings(storage) {
  return {
    hideCaptchaLogo: readBooleanSetting(storage, CAPTCHA_LOGO_HIDDEN_KEY, true),
    hideKeyShortcuts: readBooleanSetting(storage, KEY_SHORTCUTS_HIDDEN_KEY, true),
    smoothChat: readBooleanSetting(storage, SMOOTH_CHAT_KEY, true),
    chatGlow: getColorSetting(storage, CHAT_GLOW_KEYS, DEFAULT_COLORS.glow),
    leaderboardGlow: getColorSetting(storage, LEADERBOARD_GLOW_KEYS, DEFAULT_COLORS.glow),
    minimapGlow: getColorSetting(storage, MINIMAP_GLOW_KEYS, DEFAULT_COLORS.glow),
    minimapGrid: getColorSetting(storage, MINIMAP_GRID_KEYS, DEFAULT_COLORS.minimapGrid),
    minimapFont: getColorSetting(storage, MINIMAP_FONT_KEYS, DEFAULT_COLORS.minimapFont),
    minimapOutline: getColorSetting(storage, MINIMAP_OUTLINE_KEYS, DEFAULT_COLORS.minimapOutline),
    minimapBackground: getColorSetting(storage, MINIMAP_BACKGROUND_KEYS, DEFAULT_COLORS.minimapBackground),
    chatBlur: getBlurSetting(storage, CHAT_BLUR_KEY),
    leaderboardBlur: getBlurSetting(storage, LEADERBOARD_BLUR_KEY),
    minimapBlur: getBlurSetting(storage, MINIMAP_BLUR_KEY),
    chatBackground: getColorSetting(storage, CHAT_BACKGROUND_KEYS, DEFAULT_COLORS.chatBackground),
    chatSlider: getColorSetting(storage, CHAT_SLIDER_KEYS, DEFAULT_COLORS.chatSlider),
    chatOutline: getColorSetting(storage, CHAT_OUTLINE_KEYS, DEFAULT_COLORS.chatOutline),
    leaderboardBackground: getColorSetting(
      storage,
      LEADERBOARD_BACKGROUND_KEYS,
      DEFAULT_COLORS.leaderboardBackground,
    ),
    leaderboardOutline: getColorSetting(
      storage,
      LEADERBOARD_OUTLINE_KEYS,
      DEFAULT_COLORS.leaderboardOutline,
    ),
    leaderboardFont: getLeaderboardFontSetting(storage),
    leaderboardSize: getLeaderboardSizeSetting(storage),
  };
}

export const IN_GAME_UI_DEFAULTS = DEFAULT_COLORS;
