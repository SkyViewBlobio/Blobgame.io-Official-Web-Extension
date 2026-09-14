export function migrateLegacySettingsCookies(document, storage) {
  const keys = {
    blobioCellRing: 'blobio.settings.cellRing.snapshot',
    blobioCellMass: 'blobio.settings.cellMass.snapshot',
    blobioFpsSaver: 'blobio.settings.fpsSaver.snapshot',
    blobioVirusMotherCell: 'blobio.settings.virusMotherCell.snapshot',
    blobioVirusPelletColors: 'blobio.settings.virusPelletColors.snapshot',
  };
  const result = { migrated: 0, removed: 0, failed: 0 };
  let cookies;
  try {
    cookies = String(document?.cookie || '').split(';').map(entry => entry.trim());
  } catch {
    return result;
  }

  for (const [name, key] of Object.entries(keys)) {
    const entries = cookies.filter(entry => entry.startsWith(`${name}=`));
    if (!entries.length) continue;
    try {
      const stored = storage?.getItem?.(key);
      let selected = parseSnapshot(stored);
      let selectedRaw = stored;
      for (const entry of entries) {
        let raw;
        try { raw = decodeURIComponent(entry.slice(name.length + 1)); } catch { continue; }
        const candidate = parseSnapshot(raw);
        if (candidate && (!selected || candidate.updatedAt > selected.updatedAt)) {
          selected = candidate;
          selectedRaw = raw;
        }
      }
      if (selected && selectedRaw !== stored) {
        storage?.setItem?.(key, selectedRaw);
        // Keep the legacy copy if storage is blocked or a write did not persist.
        if (storage?.getItem?.(key) !== selectedRaw) {
          result.failed += 1;
          continue;
        }
        result.migrated += 1;
      }
      const host = String(document.defaultView?.location?.hostname || '');
      const domains = [''];
      if (host === 'blobgame.io' || host.endsWith('.blobgame.io')) {
        domains.push('; Domain=.blobgame.io', `; Domain=${host}`);
      }
      for (const domain of domains) {
        document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${domain}`;
      }
      if (String(document.cookie || '').split(';').some(entry => entry.trim().startsWith(`${name}=`))) {
        result.failed += 1;
      } else {
        result.removed += 1;
      }
    } catch {
      result.failed += 1;
    }
  }
  if (result.failed) {
    document.defaultView?.console?.warn?.('[Blobio] Some legacy settings cookies could not be migrated; their saved copies were kept.');
  }
  return result;

  function parseSnapshot(raw) {
    try {
      const value = JSON.parse(raw);
      if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
      const time = Number(value.updatedAt);
      return { updatedAt: Number.isFinite(time) && time > 0 ? time : 0 };
    } catch {
      return null;
    }
  }
}
