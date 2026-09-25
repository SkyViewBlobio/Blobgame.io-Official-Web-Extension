const API_ROOT = 'https://api.blobgame.io:988/api';

export function formatDailyReset(milliseconds) {
  if (!Number.isFinite(milliseconds)) return 'Reset time unavailable';
  const minutes = Math.ceil(Math.max(0, milliseconds) / 60_000);
  const hours = Math.floor(minutes / 60);
  return `Resets in ${hours}h ${minutes % 60}m`;
}

export async function loadDailyTasks({ fetch, token, names, signal }) {
  if (!token) throw new Error('sign-in-required');

  const profileUrl = `${API_ROOT}/users/myInfo/?api_ver=4.7&pl=3&token=${encodeURIComponent(token)}`;
  const namesUrl = `${API_ROOT}/quests/getNames/en?api_ver=4.7&pl=3&token=${encodeURIComponent(token)}`;
  const [profileResponse, namesResponse] = await Promise.all([
    fetch(profileUrl, { signal, cache: 'no-store' }),
    names ? Promise.resolve(null) : fetch(namesUrl, { signal }),
  ]);
  if (!profileResponse.ok || (namesResponse && !namesResponse.ok)) throw new Error('daily-tasks-unavailable');

  const profile = await profileResponse.json();
  const taskNames = names || (await namesResponse.json()).result;
  if (!Array.isArray(profile.qsts) || !taskNames || !profile.cur_date || !profile.qrdate) {
    throw new Error('daily-tasks-unavailable');
  }

  const serverNow = Date.parse(profile.cur_date.replace(' ', 'T'));
  const resetAt = Date.parse(profile.qrdate.replace(' ', 'T'));
  return {
    names: taskNames,
    tasks: profile.qsts,
    resetInMs: resetAt - serverNow,
  };
}
