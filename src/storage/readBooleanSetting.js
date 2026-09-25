export function readBooleanSetting(storage, key, fallback) {
  try {
    const value = storage?.getItem?.(key);
    if (value === null || value === undefined || value === '') {
      return fallback;
    }
    return value === '1' || String(value).toLowerCase() === 'true';
  } catch {
    return fallback;
  }
}
