const API_ROOT = 'https://api.blobgame.io:988/api';

const MODE_RECORD_IDS = {
  FFA: 1,
  TEAMS: 2,
  EXPERIMENTAL: 3,
  INSTANT_MERGE: 4,
  CRAZY: 5,
  SELF_FEED: 6,
  TS2V2: 7,
  ULTRA: 8,
  BATTLE_ROYALE: 9,
  DUAL: 10,
  MACRO: 11,
  PRIVATE: 97,
  UNOFFICIAL: 98,
  MINION: 98,
  PARTY: 10,
  CREATE_PARTY: 11,
};

export function recordForMode(profile, mode) {
  const id = Number.isInteger(mode) ? mode : MODE_RECORD_IDS[mode];
  if (!id || !profile?.records) return null;
  const value = profile.records[id] ?? 0;
  const record = Number(value);
  return Number.isFinite(record) && record >= 0 ? record : null;
}

export async function loadServerRecordId({ fetch, address, signal }) {
  const [host, portText] = String(address || '').split(':');
  const port = Number(portText);
  if (!host || !Number.isInteger(port)) return null;
  const response = await fetch('https://bal.blobgame.io:91', { signal });
  if (!response.ok) return null;
  const groups = await response.json();
  for (const servers of Object.values(groups)) {
    if (!Array.isArray(servers)) continue;
    const server = servers.find(item => item.host === host && Number(item.gamePort) === port);
    if (server) {
      const id = Number(server.gamemode_api_id);
      return Number.isInteger(id) && id > 0 ? id : null;
    }
  }
  return null;
}

export function gainedExperience(before, after) {
  if (!before || !after || before.id !== after.id) return null;
  const previousLevel = Number(before.lvl);
  const currentLevel = Number(after.lvl);
  const previousXp = Number(before.cur_exp);
  const currentXp = Number(after.cur_exp);
  const previousLimit = Number(before.next_lvl_exp);
  if (![previousLevel, currentLevel, previousXp, currentXp, previousLimit].every(Number.isFinite)) return null;
  if (currentLevel === previousLevel && currentXp >= previousXp) return currentXp - previousXp;
  if (currentLevel === previousLevel + 1 && previousLimit >= previousXp) {
    return previousLimit - previousXp + currentXp;
  }
  return null;
}

export function hasObservedExitUpdates(before, after, modeId, score) {
  if (!before || !after || before.id !== after.id) return false;
  const previousRecord = recordForMode(before, modeId);
  const newRecord = recordForMode(after, modeId);
  const recordExpected = score != null && previousRecord != null && score > previousRecord;
  return gainedExperience(before, after) > 0 && (!recordExpected || newRecord >= score);
}

export async function loadExitProfile({ fetch, token, signal }) {
  if (!token) return null;
  const url = `${API_ROOT}/users/myInfo/?api_ver=4.7&pl=3&token=${encodeURIComponent(token)}`;
  const response = await fetch(url, { signal, cache: 'no-store' });
  if (!response.ok) return null;
  const profile = await response.json();
  if (!profile?.id || profile.lvl == null || profile.cur_exp == null || profile.next_lvl_exp == null
    || !Number.isFinite(Number(profile.lvl))
    || !Number.isFinite(Number(profile.cur_exp))
    || !Number.isFinite(Number(profile.next_lvl_exp))) return null;
  return profile;
}
