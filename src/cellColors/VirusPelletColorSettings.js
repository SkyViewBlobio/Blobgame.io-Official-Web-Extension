export const VIRUS_PELLET_COLOR_SNAPSHOT_KEY = 'blobio.settings.virusPelletColors.snapshot';
export const VIRUS_PELLET_COLOR_COOKIE_NAME = 'blobioVirusPelletColors';

export const DEFAULT_VIRUS_PELLET_COLOR_SETTINGS = Object.freeze({
  enabled: false,
  virus: {
    enabled: true,
    mode: 'solid',
    alpha: 100,
    solid: '#00d25a',
    gradient: {
      from: '#00ff8c',
      to: '#0078ff',
      angle: 135,
    },
  },
  pellets: {
    enabled: true,
    mode: 'solid',
    alpha: 100,
    solid: '#ffb450',
    gradient: {
      from: '#ff50a0',
      to: '#46dcff',
      angle: 45,
    },
  },
});

export function readVirusPelletColorSettings(storage, document = globalThis.document) {
  const storedSnapshot = parseVirusPelletColorSnapshot(storage?.getItem?.(VIRUS_PELLET_COLOR_SNAPSHOT_KEY));
  const cookieSnapshot = readVirusPelletColorCookie(document);
  const snapshot = chooseNewestSnapshot(storedSnapshot, cookieSnapshot);
  return normalizeVirusPelletColorSettings(snapshot || DEFAULT_VIRUS_PELLET_COLOR_SETTINGS);
}

export function saveVirusPelletColorSettings(storage, settings, document = globalThis.document) {
  const clean = normalizeVirusPelletColorSettings(settings);
  const snapshot = {
    ...clean,
    updatedAt: Date.now(),
  };

  storage?.setItem?.(VIRUS_PELLET_COLOR_SNAPSHOT_KEY, JSON.stringify(snapshot));
  return clean;
}

export function parseVirusPelletColorSnapshot(value) {
  if (!value) {
    return null;
  }

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return {
      ...normalizeVirusPelletColorSettings(parsed),
      updatedAt: normalizeUpdatedAt(parsed.updatedAt),
    };
  } catch {
    return null;
  }
}

export function readVirusPelletColorCookie(document = globalThis.document) {
  const cookie = String(document?.cookie || '');
  const prefix = `${VIRUS_PELLET_COLOR_COOKIE_NAME}=`;
  for (const part of cookie.split(';')) {
    const entry = part.trim();
    if (!entry.startsWith(prefix)) {
      continue;
    }

    try {
      return parseVirusPelletColorSnapshot(decodeURIComponent(entry.slice(prefix.length)));
    } catch {
      return null;
    }
  }
  return null;
}

export function normalizeVirusPelletColorSettings(settings = {}) {
  const source = settings && typeof settings === 'object' ? settings : {};
  return {
    enabled: Boolean(source.enabled),
    virus: normalizeTargetSettings(source.virus, DEFAULT_VIRUS_PELLET_COLOR_SETTINGS.virus),
    pellets: normalizeTargetSettings(source.pellets, DEFAULT_VIRUS_PELLET_COLOR_SETTINGS.pellets),
  };
}

export function colorToRgba(color, alpha = 100) {
  const clean = normalizeColor(color, '#000000').slice(1);
  const red = Number.parseInt(clean.slice(0, 2), 16);
  const green = Number.parseInt(clean.slice(2, 4), 16);
  const blue = Number.parseInt(clean.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${normalizeAlpha(alpha, 100) / 100})`;
}

function normalizeTargetSettings(value, fallback) {
  const source = value && typeof value === 'object' ? value : {};
  const gradient = source.gradient && typeof source.gradient === 'object' ? source.gradient : {};

  return {
    enabled: source.enabled !== false,
    mode: source.mode === 'gradient' ? 'gradient' : 'solid',
    alpha: normalizeAlpha(source.alpha, fallback.alpha),
    solid: normalizeColor(source.solid, fallback.solid),
    gradient: {
      from: normalizeColor(gradient.from, fallback.gradient.from),
      to: normalizeColor(gradient.to, fallback.gradient.to),
      angle: normalizeAngle(gradient.angle, fallback.gradient.angle),
    },
  };
}

function normalizeColor(value, fallback) {
  const color = String(value || '').trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(color) ? color : fallback;
}

function normalizeAlpha(value, fallback) {
  const alpha = Number(value);
  return Number.isFinite(alpha) ? Math.max(0, Math.min(100, Math.round(alpha))) : fallback;
}

function normalizeAngle(value, fallback) {
  const angle = Number(value);
  if (!Number.isFinite(angle)) {
    return fallback;
  }
  return Math.max(0, Math.min(360, Math.round(angle)));
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
