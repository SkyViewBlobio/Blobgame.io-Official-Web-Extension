import { createBlobioStorage } from '../storage/BlobioStorage.js';
import {
  createRemoteFileConfig,
  decodeGitHubContentsApiText,
  getRemoteRequestHeaders,
} from '../remote/RemoteFileConfig.js';
import { getRuntimeRemoteFileConfig } from '../runtime/ExtensionInstancePolicy.js';

const DEFAULT_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const DEFAULT_REMOTE_FILE_CONFIG = createRemoteFileConfig('public');
const DEFAULT_VIP_URL = DEFAULT_REMOTE_FILE_CONFIG.roles.vip;
const DEFAULT_ADMIN_URL = DEFAULT_REMOTE_FILE_CONFIG.roles.admins;
const DEFAULT_CLAN_URL = DEFAULT_REMOTE_FILE_CONFIG.roles.clans;
const VIP_CACHE_KEY = 'blobio.roles.vipCache';
const ADMIN_CACHE_KEY = 'blobio.roles.adminCache';
const CLAN_CACHE_KEY = 'blobio.roles.clanCache';
const REMOTE_TEXT_BRIDGE_KEY = '__blobioFetchRemoteText';

export function normalizeUid(value) {
  const uid = String(value ?? '').replace(/\D/g, '');
  return uid && uid !== '0' ? uid : '';
}

export function parseVipRoleFile(value) {
  const data = parseRoleJson(value, 'VIP');
  const members = new Map();

  for (const [rawUid, entry] of Object.entries(data.members)) {
    const uid = normalizeUid(rawUid);
    if (!uid || !entry || typeof entry !== 'object') {
      continue;
    }

    const rawExpiry = String(entry.expiresAt ?? '').trim();
    if (rawExpiry.toUpperCase() === 'UNLIMITED') {
      members.set(uid, { unlimited: true, expiresAt: null });
      continue;
    }

    const expiresAt = Date.parse(rawExpiry);
    if (Number.isFinite(expiresAt)) {
      members.set(uid, { unlimited: false, expiresAt });
    }
  }

  return {
    schemaVersion: data.schemaVersion,
    updatedAt: String(data.updatedAt || ''),
    members,
  };
}

export function parseAdminRoleFile(value) {
  const data = parseRoleJson(value, 'ADMIN');
  const members = new Set();

  for (const [rawUid, enabled] of Object.entries(data.members)) {
    const uid = normalizeUid(rawUid);
    if (uid && enabled === true) {
      members.add(uid);
    }
  }

  return {
    schemaVersion: data.schemaVersion,
    updatedAt: String(data.updatedAt || ''),
    members,
  };
}

export function parseClanRoleFile(value) {
  const data = typeof value === 'string' ? JSON.parse(value) : value;
  if (!data || typeof data !== 'object' || data.schemaVersion !== 1) {
    throw new Error('CLAN role file has an invalid schema.');
  }

  const members = new Map();

  const clanRows = [];
  if (Array.isArray(data.clans)) {
    clanRows.push(...data.clans);
  } else if (data.clans && typeof data.clans === 'object') {
    clanRows.push(...Object.values(data.clans));
  } else if (data.clantag || data.clanTagUIDs) {
    clanRows.push(data);
  }

  for (const clan of clanRows) {
    if (!clan || typeof clan !== 'object') {
      continue;
    }

    const tag = String(clan.clantag ?? clan.clanTag ?? clan.tag ?? '').trim();
    const rawUids = Array.isArray(clan.clanTagUIDs)
      ? clan.clanTagUIDs
      : Array.isArray(clan.clanTagUids)
        ? clan.clanTagUids
        : Array.isArray(clan.uids)
          ? clan.uids
          : [];
    if (!tag || rawUids.length === 0) {
      continue;
    }

    for (const rawUid of rawUids) {
      const uid = normalizeUid(rawUid);
      if (uid && !members.has(uid)) {
        members.set(uid, { tag });
      }
    }
  }

  if (clanRows.length === 0 && data.members && typeof data.members === 'object') {
    for (const [rawUid, entry] of Object.entries(data.members)) {
      const uid = normalizeUid(rawUid);
      const tag = typeof entry === 'string'
        ? entry.trim()
        : String(entry?.tag ?? '').trim();
      if (uid && tag) {
        members.set(uid, { tag });
      }
    }
  } else if (clanRows.length === 0) {
    throw new Error('CLAN role file has an invalid schema.');
  }

  return {
    schemaVersion: data.schemaVersion,
    updatedAt: String(data.updatedAt || ''),
    members,
  };
}

function parseRoleJson(value, label) {
  const data = typeof value === 'string' ? JSON.parse(value) : value;
  if (!data || typeof data !== 'object' || data.schemaVersion !== 1 || !data.members || typeof data.members !== 'object') {
    throw new Error(`${label} role file has an invalid schema.`);
  }

  return data;
}

function serializeVipData(data) {
  const members = {};
  for (const [uid, entry] of data.members) {
    members[uid] = {
      expiresAt: entry.unlimited ? 'UNLIMITED' : new Date(entry.expiresAt).toISOString(),
    };
  }

  return {
    schemaVersion: 1,
    updatedAt: data.updatedAt,
    members,
  };
}

function serializeAdminData(data) {
  const members = {};
  for (const uid of data.members) {
    members[uid] = true;
  }

  return {
    schemaVersion: 1,
    updatedAt: data.updatedAt,
    members,
  };
}

function serializeClanData(data) {
  const members = {};
  for (const [uid, entry] of data.members) {
    members[uid] = { tag: entry.tag };
  }

  return {
    schemaVersion: 1,
    updatedAt: data.updatedAt,
    members,
  };
}

function readCache(storage, key, parser, now, maxAgeMs) {
  try {
    const cached = JSON.parse(storage.getItem(key) || 'null');
    if (!cached || !Number.isFinite(cached.fetchedAt) || now - cached.fetchedAt > maxAgeMs) {
      return null;
    }

    return parser(cached.data);
  } catch {
    return null;
  }
}

function writeCache(storage, key, data, fetchedAt) {
  storage.setItem(key, JSON.stringify({ fetchedAt, data }));
}

function getWindow(document) {
  return document?.defaultView || globalThis;
}

function getRuntimeRemoteConfig(document) {
  const win = getWindow(document);
  const runtimeConfig = getRuntimeRemoteFileConfig(win);
  const defaults = createRemoteFileConfig(runtimeConfig?.channel === 'beta' ? 'beta' : 'public');

  if (!runtimeConfig || typeof runtimeConfig !== 'object') {
    return defaults;
  }

  return {
    ...defaults,
    ...runtimeConfig,
    repo: {
      ...defaults.repo,
      ...(runtimeConfig.repo || {}),
    },
    roles: {
      ...defaults.roles,
      ...(runtimeConfig.roles || {}),
    },
    bundleUrls: Array.isArray(runtimeConfig.bundleUrls) && runtimeConfig.bundleUrls.length > 0
      ? runtimeConfig.bundleUrls
      : defaults.bundleUrls,
  };
}

function readGitHubToken(document, remoteConfig) {
  const tokenKey = remoteConfig?.githubTokenKey;
  if (!tokenKey) {
    return '';
  }

  const win = getWindow(document);
  const gmGetValue = win?.GM_getValue || globalThis.GM_getValue;

  try {
    return typeof gmGetValue === 'function'
      ? String(gmGetValue(tokenKey, '') || '').trim()
      : '';
  } catch {
    return '';
  }
}

function getRemoteTextBridge(document) {
  const win = getWindow(document);
  const candidates = [
    win?.[REMOTE_TEXT_BRIDGE_KEY],
    win?.unsafeWindow?.[REMOTE_TEXT_BRIDGE_KEY],
    globalThis[REMOTE_TEXT_BRIDGE_KEY],
  ];

  try {
    if (typeof unsafeWindow !== 'undefined') {
      candidates.push(unsafeWindow[REMOTE_TEXT_BRIDGE_KEY]);
    }
  } catch {}

  return candidates.find((candidate) => typeof candidate === 'function') || null;
}

function requestText(document, url, timeout = 15000, remoteConfig = getRuntimeRemoteConfig(document)) {
  const win = getWindow(document);
  const bridge = remoteConfig?.channel === 'beta' ? getRemoteTextBridge(document) : null;
  if (bridge) {
    return bridge(url, timeout);
  }

  const headers = {
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    ...getRemoteRequestHeaders(remoteConfig, url, readGitHubToken(document, remoteConfig)),
  };
  const gmRequest = win?.GM_xmlhttpRequest || globalThis.GM_xmlhttpRequest;

  if (typeof gmRequest === 'function') {
    return new Promise((resolve, reject) => {
      gmRequest({
        method: 'GET',
        url,
        timeout,
        headers,
        onload(response) {
          if (response.status >= 200 && response.status < 300 && response.responseText) {
            resolve(decodeGitHubContentsApiText(response.responseText));
            return;
          }

          reject(new Error(`Role request failed with HTTP ${response.status}.`));
        },
        onerror(error) {
          reject(error instanceof Error ? error : new Error('Role request failed.'));
        },
        ontimeout() {
          reject(new Error('Role request timed out.'));
        },
      });
    });
  }

  if (typeof win?.fetch === 'function') {
    return win.fetch(url, { cache: 'no-store', headers }).then((response) => {
      if (!response.ok) {
        throw new Error(`Role request failed with HTTP ${response.status}.`);
      }
      return response.text();
    }).then((text) => decodeGitHubContentsApiText(text));
  }

  return Promise.reject(new Error('No supported request API is available.'));
}

export class RoleRegistry {
  constructor({
    document = globalThis.document,
    storage = createBlobioStorage(document),
    logger = console,
    now = () => Date.now(),
    vipUrl = null,
    adminUrl = null,
    clanUrl = null,
    cacheMaxAgeMs = DEFAULT_CACHE_MAX_AGE_MS,
    request = null,
  } = {}) {
    const remoteConfig = getRuntimeRemoteConfig(document);
    this.document = document;
    this.storage = storage;
    this.logger = logger;
    this.now = now;
    this.remoteConfig = remoteConfig;
    this.vipUrl = vipUrl || remoteConfig.roles.vip || DEFAULT_VIP_URL;
    this.adminUrl = adminUrl || remoteConfig.roles.admins || DEFAULT_ADMIN_URL;
    this.clanUrl = clanUrl || remoteConfig.roles.clans || DEFAULT_CLAN_URL;
    this.cacheMaxAgeMs = cacheMaxAgeMs;
    this.request = request || ((url) => requestText(document, url, 15000, remoteConfig));
    this.vipData = { schemaVersion: 1, updatedAt: '', members: new Map() };
    this.adminData = { schemaVersion: 1, updatedAt: '', members: new Set() };
    this.clanData = { schemaVersion: 1, updatedAt: '', members: new Map() };
    this.listeners = new Set();
    this.started = false;
    this.readyPromise = null;
  }

  start() {
    if (this.started) {
      return this.readyPromise;
    }

    this.started = true;
    const now = this.now();
    const cachedVip = readCache(this.storage, VIP_CACHE_KEY, parseVipRoleFile, now, this.cacheMaxAgeMs);
    const cachedAdmins = readCache(this.storage, ADMIN_CACHE_KEY, parseAdminRoleFile, now, this.cacheMaxAgeMs);
    const cachedClans = readCache(this.storage, CLAN_CACHE_KEY, parseClanRoleFile, now, this.cacheMaxAgeMs);

    if (cachedVip) {
      this.vipData = cachedVip;
    }
    if (cachedAdmins) {
      this.adminData = cachedAdmins;
    }
    if (cachedClans) {
      this.clanData = cachedClans;
    }
    if (cachedVip || cachedAdmins || cachedClans) {
      this.notify('cache');
    }

    this.readyPromise = Promise.allSettled([
      this.refreshVip(),
      this.refreshAdmins(),
      this.refreshClans(),
    ]).then(() => this.getSnapshot());

    return this.readyPromise;
  }

  async refreshVip() {
    try {
      const fetchedAt = this.now();
      const text = await this.request(this.withCacheBuster(this.vipUrl, fetchedAt));
      const data = parseVipRoleFile(text);
      this.vipData = data;
      writeCache(this.storage, VIP_CACHE_KEY, serializeVipData(data), fetchedAt);
      this.notify('fresh');
      return true;
    } catch (error) {
      this.logger.warn?.('[Blobio] VIP role file could not be refreshed.', error);
      return false;
    }
  }

  async refreshAdmins() {
    try {
      const fetchedAt = this.now();
      const text = await this.request(this.withCacheBuster(this.adminUrl, fetchedAt));
      const data = parseAdminRoleFile(text);
      this.adminData = data;
      writeCache(this.storage, ADMIN_CACHE_KEY, serializeAdminData(data), fetchedAt);
      this.notify('fresh');
      return true;
    } catch (error) {
      this.logger.warn?.('[Blobio] ADMIN role file could not be refreshed.', error);
      return false;
    }
  }

  async refreshClans() {
    try {
      const fetchedAt = this.now();
      const text = await this.request(this.withCacheBuster(this.clanUrl, fetchedAt));
      const data = parseClanRoleFile(text);
      this.clanData = data;
      writeCache(this.storage, CLAN_CACHE_KEY, serializeClanData(data), fetchedAt);
      this.notify('fresh');
      return true;
    } catch (error) {
      this.logger.warn?.('[Blobio] CLAN role file could not be refreshed.', error);
      return false;
    }
  }

  withCacheBuster(url, timestamp) {
    const separator = String(url).includes('?') ? '&' : '?';
    return `${url}${separator}blobioRoles=${timestamp}`;
  }

  subscribe(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }

    this.listeners.add(listener);
    listener(this.getSnapshot(), 'current');
    return () => this.listeners.delete(listener);
  }

  notify(source) {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      try {
        listener(snapshot, source);
      } catch (error) {
        this.logger.warn?.('[Blobio] Role listener failed.', error);
      }
    }
  }

  getVipStatus(rawUid, at = this.now()) {
    const uid = normalizeUid(rawUid);
    const entry = uid ? this.vipData.members.get(uid) : null;
    if (!entry) {
      return { active: false, unlimited: false, expiresAt: null, remainingMs: 0 };
    }

    if (entry.unlimited) {
      return { active: true, unlimited: true, expiresAt: null, remainingMs: Infinity };
    }

    const remainingMs = entry.expiresAt - at;
    return {
      active: remainingMs > 0,
      unlimited: false,
      expiresAt: entry.expiresAt,
      remainingMs: Math.max(0, remainingMs),
    };
  }

  isAdmin(rawUid) {
    const uid = normalizeUid(rawUid);
    return Boolean(uid && this.adminData.members.has(uid));
  }

  getClan(rawUid) {
    const uid = normalizeUid(rawUid);
    const entry = uid ? this.clanData.members.get(uid) : null;
    return entry ? { tag: entry.tag } : null;
  }

  getRoles(rawUid, at = this.now()) {
    const vip = this.getVipStatus(rawUid, at);
    return {
      uid: normalizeUid(rawUid),
      vip,
      admin: this.isAdmin(rawUid),
      clan: this.getClan(rawUid),
    };
  }

  getSnapshot() {
    return {
      vipCount: this.vipData.members.size,
      adminCount: this.adminData.members.size,
      clanCount: this.clanData.members.size,
      vipUpdatedAt: this.vipData.updatedAt,
      adminUpdatedAt: this.adminData.updatedAt,
      clanUpdatedAt: this.clanData.updatedAt,
    };
  }

  destroy() {
    this.listeners.clear();
    this.started = false;
    this.readyPromise = null;
  }
}

export const ROLE_STORAGE_KEYS = {
  ownUid: 'blobio.roles.ownUid',
  vipCache: VIP_CACHE_KEY,
  adminCache: ADMIN_CACHE_KEY,
  clanCache: CLAN_CACHE_KEY,
};

export const ROLE_DATABASE_URLS = {
  vip: DEFAULT_VIP_URL,
  admins: DEFAULT_ADMIN_URL,
  clans: DEFAULT_CLAN_URL,
};
