export const CELL_MASS_SNAPSHOT_KEY = 'blobio.settings.cellMass.snapshot';
export const CELL_MASS_COOKIE_NAME = 'blobioCellMass';

export const DEFAULT_CELL_MASS_SETTINGS = Object.freeze({
  enabled: true,
  compact: true,
  smartRendering: true,
  emphasizeBiggest: true,
  textScale: 0.65,
  nameGap: 0.3,
  updateDelayMs: 3000,
});

export function readCellMassSettings(storage, document = globalThis.document) {
  const storedSnapshot = parseCellMassSnapshot(storage?.getItem?.(CELL_MASS_SNAPSHOT_KEY));
  const cookieSnapshot = readCellMassCookie(document);
  const snapshot = chooseNewestSnapshot(storedSnapshot, cookieSnapshot);
  return normalizeCellMassSettings(snapshot || DEFAULT_CELL_MASS_SETTINGS);
}

export function saveCellMassSettings(storage, settings, document = globalThis.document) {
  const clean = normalizeCellMassSettings(settings);
  const snapshot = {
    ...clean,
    updatedAt: Date.now(),
  };

  storage?.setItem?.(CELL_MASS_SNAPSHOT_KEY, JSON.stringify(snapshot));
  return clean;
}

export function parseCellMassSnapshot(value) {
  if (!value) {
    return null;
  }

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return {
      ...normalizeCellMassSettings(parsed),
      updatedAt: normalizeUpdatedAt(parsed.updatedAt),
    };
  } catch {
    return null;
  }
}

export function readCellMassCookie(document = globalThis.document) {
  const cookie = String(document?.cookie || '');
  const prefix = `${CELL_MASS_COOKIE_NAME}=`;

  for (const part of cookie.split(';')) {
    const entry = part.trim();
    if (!entry.startsWith(prefix)) {
      continue;
    }

    try {
      return parseCellMassSnapshot(decodeURIComponent(entry.slice(prefix.length)));
    } catch {
      return null;
    }
  }
  return null;
}

export function normalizeCellMassSettings(settings = {}) {
  const source = settings && typeof settings === 'object' ? settings : {};

  return {
    enabled: source.enabled === undefined ? DEFAULT_CELL_MASS_SETTINGS.enabled : Boolean(source.enabled),
    compact: source.compact === undefined ? DEFAULT_CELL_MASS_SETTINGS.compact : Boolean(source.compact),
    smartRendering: source.smartRendering === undefined
      ? DEFAULT_CELL_MASS_SETTINGS.smartRendering
      : Boolean(source.smartRendering),
    emphasizeBiggest: source.emphasizeBiggest === undefined
      ? DEFAULT_CELL_MASS_SETTINGS.emphasizeBiggest
      : Boolean(source.emphasizeBiggest),
    textScale: clampNumber(source.textScale, 0.35, 1.4, DEFAULT_CELL_MASS_SETTINGS.textScale),
    nameGap: clampNumber(source.nameGap, 0.1, 3, DEFAULT_CELL_MASS_SETTINGS.nameGap),
    updateDelayMs: Math.round(clampNumber(source.updateDelayMs, 0, 10000, DEFAULT_CELL_MASS_SETTINGS.updateDelayMs)),
  };
}

function clampNumber(value, min, max, fallback) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function chooseNewestSnapshot(storedSnapshot, cookieSnapshot) {
  if (!storedSnapshot) {
    return cookieSnapshot;
  }
  if (!cookieSnapshot) {
    return storedSnapshot;
  }
  return normalizeUpdatedAt(cookieSnapshot.updatedAt) > normalizeUpdatedAt(storedSnapshot.updatedAt)
    ? cookieSnapshot : storedSnapshot;
}

function normalizeUpdatedAt(value) {
  const updatedAt = Number(value);
  return Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : 0;
}
