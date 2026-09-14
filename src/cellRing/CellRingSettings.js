export const CELL_RING_KEYS = {
  enabled: 'blobio.settings.cellRing.enabled',
  mode: 'blobio.settings.cellRing.mode',
  solidColor: 'blobio.settings.cellRing.solid.color',
  alpha: 'blobio.settings.cellRing.alpha',
  glowSize: 'blobio.settings.cellRing.glowSize',
  borderWidth: 'blobio.settings.cellRing.borderWidth',
  transparentCell: 'blobio.settings.cellRing.transparentCell.enabled',
  cellAlpha: 'blobio.settings.cellRing.transparentCell.alpha',
  nameStyle: 'blobio.settings.cellRing.preview.nameStyle',
  removeAllCellBorders: 'blobio.settings.cellRing.removeAllCellBorders',
  // Old keys kept only so older saved state can be migrated cleanly.
  sideGlowMode: 'blobio.settings.cellRing.sideGlow.mode',
  sideGlowColor: 'blobio.settings.cellRing.sideGlow.color',
  sideGlowAlpha: 'blobio.settings.cellRing.sideGlow.alpha',
  disabledCellRings: 'blobio.settings.cellRing.disabledCellRings',
};

export const CELL_RING_SNAPSHOT_KEY = 'blobio.settings.cellRing.snapshot';
export const CELL_RING_COOKIE_NAME = 'blobioCellRing';
export const CELL_RING_MODES = ['sync', 'solid'];
export const CELL_RING_NAME_STYLES = ['normal', 'vip', 'yt'];

export const DEFAULT_CELL_RING_SETTINGS = Object.freeze({
  enabled: true,
  mode: 'sync',
  solidColor: '#19e6ff',
  alpha: 0.72,
  glowSize: 1,
  borderWidth: 1,
  transparentCell: false,
  cellAlpha: 0.75,
  nameStyle: 'normal',
  removeAllCellBorders: false,
});

export function readCellRingSettings(storage, document = globalThis.document) {
  const storedSnapshot = parseCellRingSnapshot(storage?.getItem?.(CELL_RING_SNAPSHOT_KEY));
  const cookieSnapshot = readCellRingCookie(document);
  const snapshot = chooseNewestSnapshot(storedSnapshot, cookieSnapshot);

  if (snapshot) {
    return normalizeCellRingSettings(snapshot);
  }

  return normalizeCellRingSettings({
    enabled: readBoolean(storage, CELL_RING_KEYS.enabled, DEFAULT_CELL_RING_SETTINGS.enabled),
    mode: storage?.getItem?.(CELL_RING_KEYS.mode) || storage?.getItem?.(CELL_RING_KEYS.sideGlowMode),
    solidColor: storage?.getItem?.(CELL_RING_KEYS.solidColor) || storage?.getItem?.(CELL_RING_KEYS.sideGlowColor),
    alpha: storage?.getItem?.(CELL_RING_KEYS.alpha) ?? storage?.getItem?.(CELL_RING_KEYS.sideGlowAlpha),
    glowSize: storage?.getItem?.(CELL_RING_KEYS.glowSize),
    borderWidth: storage?.getItem?.(CELL_RING_KEYS.borderWidth),
    transparentCell: readBoolean(storage, CELL_RING_KEYS.transparentCell, DEFAULT_CELL_RING_SETTINGS.transparentCell),
    cellAlpha: storage?.getItem?.(CELL_RING_KEYS.cellAlpha),
    nameStyle: storage?.getItem?.(CELL_RING_KEYS.nameStyle),
    removeAllCellBorders: readBoolean(
      storage,
      CELL_RING_KEYS.removeAllCellBorders,
      readBoolean(storage, CELL_RING_KEYS.disabledCellRings, DEFAULT_CELL_RING_SETTINGS.removeAllCellBorders),
    ),
  });
}

export function saveCellRingSettings(storage, settings, document = globalThis.document) {
  const clean = normalizeCellRingSettings(settings);
  const snapshot = {
    ...clean,
    updatedAt: Date.now(),
  };

  storage?.setItem?.(CELL_RING_SNAPSHOT_KEY, JSON.stringify(snapshot));
  storage?.setItem?.(CELL_RING_KEYS.enabled, clean.enabled ? '1' : '0');
  storage?.setItem?.(CELL_RING_KEYS.mode, clean.mode);
  storage?.setItem?.(CELL_RING_KEYS.solidColor, clean.solidColor);
  storage?.setItem?.(CELL_RING_KEYS.alpha, String(clean.alpha));
  storage?.setItem?.(CELL_RING_KEYS.glowSize, String(clean.glowSize));
  storage?.setItem?.(CELL_RING_KEYS.borderWidth, String(clean.borderWidth));
  storage?.setItem?.(CELL_RING_KEYS.transparentCell, clean.transparentCell ? '1' : '0');
  storage?.setItem?.(CELL_RING_KEYS.cellAlpha, String(clean.cellAlpha));
  storage?.setItem?.(CELL_RING_KEYS.nameStyle, clean.nameStyle);
  storage?.setItem?.(CELL_RING_KEYS.removeAllCellBorders, clean.removeAllCellBorders ? '1' : '0');

  // Keep old loader/template keys in sync until every installed loader has refreshed.
  storage?.setItem?.(CELL_RING_KEYS.sideGlowMode, clean.mode);
  storage?.setItem?.(CELL_RING_KEYS.sideGlowColor, clean.solidColor);
  storage?.setItem?.(CELL_RING_KEYS.sideGlowAlpha, String(clean.alpha));
  storage?.setItem?.(CELL_RING_KEYS.disabledCellRings, clean.removeAllCellBorders ? '1' : '0');

  return clean;
}

export function parseCellRingSnapshot(value) {
  if (!value) {
    return null;
  }

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return {
      ...normalizeCellRingSettings(parsed),
      updatedAt: normalizeUpdatedAt(parsed.updatedAt),
    };
  } catch {
    return null;
  }
}

export function readCellRingCookie(document = globalThis.document) {
  const cookie = String(document?.cookie || '');
  const prefix = `${CELL_RING_COOKIE_NAME}=`;
  for (const part of cookie.split(';')) {
    const entry = part.trim();
    if (!entry.startsWith(prefix)) {
      continue;
    }

    try {
      return parseCellRingSnapshot(decodeURIComponent(entry.slice(prefix.length)));
    } catch {
      return null;
    }
  }
  return null;
}

export function normalizeCellRingSettings(settings = {}) {
  const borderWidth = Number(settings.borderWidth);
  const mode = settings.mode ?? settings.sideGlowMode;
  const solidColor = settings.solidColor ?? settings.sideGlowColor;
  const alpha = settings.alpha ?? settings.sideGlowAlpha;
  const removeAllCellBorders = settings.removeAllCellBorders ?? settings.disabledCellRings;

  return {
    enabled: settings.enabled === undefined ? DEFAULT_CELL_RING_SETTINGS.enabled : Boolean(settings.enabled),
    mode: normalizeMode(mode),
    solidColor: normalizeHexColor(solidColor, DEFAULT_CELL_RING_SETTINGS.solidColor),
    alpha: normalizeAlpha(alpha, DEFAULT_CELL_RING_SETTINGS.alpha),
    glowSize: normalizeGlowSize(settings.glowSize),
    borderWidth: settings.borderWidth === null || settings.borderWidth === undefined || settings.borderWidth === '' || !Number.isFinite(borderWidth)
      ? 1 : Math.max(0, Math.min(6, Math.round(borderWidth * 4) / 4)),
    transparentCell: settings.transparentCell === undefined
      ? DEFAULT_CELL_RING_SETTINGS.transparentCell
      : Boolean(settings.transparentCell),
    cellAlpha: normalizeAlpha(settings.cellAlpha, DEFAULT_CELL_RING_SETTINGS.cellAlpha),
    nameStyle: normalizeNameStyle(settings.nameStyle),
    removeAllCellBorders: Boolean(removeAllCellBorders),
  };
}

export function normalizeGlowSize(value) {
  const size = Number(value);
  return value === null || value === undefined || value === '' || !Number.isFinite(size)
    ? 1 : Math.max(0.25, Math.min(3, Math.round(size * 100) / 100));
}

export function normalizeMode(value) {
  const mode = String(value || '').trim().toLowerCase();
  return CELL_RING_MODES.includes(mode) ? mode : DEFAULT_CELL_RING_SETTINGS.mode;
}

export function normalizeNameStyle(value) {
  const style = String(value || '').trim().toLowerCase();
  return CELL_RING_NAME_STYLES.includes(style) ? style : DEFAULT_CELL_RING_SETTINGS.nameStyle;
}

export function normalizeHexColor(value, fallback = '#ffffff') {
  const color = String(value || '').trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(color) ? color : fallback;
}

export function normalizeAlpha(value, fallback = 1) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const alpha = Number(value);
  if (!Number.isFinite(alpha)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, Math.round(alpha * 100) / 100));
}

function chooseNewestSnapshot(...snapshots) {
  return snapshots
    .filter(Boolean)
    .sort((left, right) => normalizeUpdatedAt(right.updatedAt) - normalizeUpdatedAt(left.updatedAt))[0] || null;
}

function normalizeUpdatedAt(value) {
  const updatedAt = Number(value);
  return Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : 0;
}

function readBoolean(storage, key, fallback) {
  const value = storage?.getItem?.(key);
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  return value === '1' || value === 'true';
}
