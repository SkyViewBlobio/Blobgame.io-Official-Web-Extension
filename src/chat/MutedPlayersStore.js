import { normalizeUid } from '../roles/RoleRegistry.js';
import { createBlobioStorage } from '../storage/BlobioStorage.js';

export const MUTED_PLAYERS_ENABLED_KEY = 'blobio.chat.mutedPlayers.enabled';
export const MUTED_PLAYERS_LIST_KEY = 'blobio.chat.mutedPlayers.list';
export const MUTED_NO_UID_ALL_KEY = 'blobio.chat.mutedPlayers.noUidAll';
export const MUTED_NO_UID_NAMES_KEY = 'blobio.chat.mutedPlayers.noUidNames';

const MAX_SAVED_NAME_LENGTH = 40;


function normalizeNoUidName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, MAX_SAVED_NAME_LENGTH);
}

function getNoUidNameKey(value) {
  return normalizeNoUidName(value).toLocaleLowerCase();
}

function readEnabled(storage) {
  try {
    return storage?.getItem?.(MUTED_PLAYERS_ENABLED_KEY) === '1';
  } catch {
    return false;
  }
}

function readPlayers(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem?.(MUTED_PLAYERS_LIST_KEY) || '[]');
    if (!Array.isArray(parsed)) {
      return new Map();
    }

    const players = new Map();
    for (const entry of parsed) {
      const uid = normalizeUid(entry?.uid);
      if (!uid || players.has(uid)) {
        continue;
      }

      players.set(uid, String(entry?.name || '').trim().slice(0, MAX_SAVED_NAME_LENGTH));
    }
    return players;
  } catch {
    return new Map();
  }
}

function readNoUidAll(storage) {
  try {
    return storage?.getItem?.(MUTED_NO_UID_ALL_KEY) === '1';
  } catch {
    return false;
  }
}

function readNoUidNames(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem?.(MUTED_NO_UID_NAMES_KEY) || '[]');
    if (!Array.isArray(parsed)) {
      return new Map();
    }

    const names = new Map();
    for (const entry of parsed) {
      const name = normalizeNoUidName(entry?.name ?? entry);
      const key = getNoUidNameKey(name);
      if (!key || names.has(key)) {
        continue;
      }

      names.set(key, name);
    }
    return names;
  } catch {
    return new Map();
  }
}

export class MutedPlayersStore {
  constructor({
    document = globalThis.document,
    storage = createBlobioStorage(document),
    logger = console,
  } = {}) {
    this.storage = storage;
    this.logger = logger;
    this.enabled = readEnabled(storage);
    this.players = readPlayers(storage);
    this.noUidAll = readNoUidAll(storage);
    this.noUidNames = readNoUidNames(storage);
    this.listeners = new Set();
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(enabled) {
    const nextEnabled = Boolean(enabled);
    if (nextEnabled === this.enabled) {
      return this.enabled;
    }

    this.enabled = nextEnabled;
    try {
      this.storage?.setItem?.(MUTED_PLAYERS_ENABLED_KEY, nextEnabled ? '1' : '0');
    } catch (error) {
      this.logger.warn?.('[Blobio] Muted-player setting could not be saved.', error);
    }
    this.notify('enabled');
    return this.enabled;
  }

  isMuted(rawUid) {
    const uid = normalizeUid(rawUid);
    return Boolean(uid && this.players.has(uid));
  }

  isNoUidAllEnabled() {
    return this.noUidAll;
  }

  setNoUidAll(enabled) {
    const nextEnabled = Boolean(enabled);
    if (nextEnabled === this.noUidAll) {
      return this.noUidAll;
    }

    this.noUidAll = nextEnabled;
    try {
      this.storage?.setItem?.(MUTED_NO_UID_ALL_KEY, nextEnabled ? '1' : '0');
    } catch (error) {
      this.logger.warn?.('[Blobio] No-UID mute setting could not be saved.', error);
    }
    this.notify('no-uid-all');
    return this.noUidAll;
  }

  isNoUidMuted(rawName) {
    if (this.noUidAll) {
      return true;
    }

    const key = getNoUidNameKey(rawName);
    return Boolean(key && this.noUidNames.has(key));
  }

  getPlayers() {
    return Array.from(this.players, ([uid, name]) => ({ uid, name }));
  }

  getNoUidNames() {
    return Array.from(this.noUidNames.values());
  }

  add(rawUid) {
    const uid = normalizeUid(rawUid);
    if (!uid || this.players.has(uid)) {
      return false;
    }

    this.players.set(uid, '');
    this.savePlayers();
    this.notify('players');
    return true;
  }

  addNoUidName(value) {
    const name = normalizeNoUidName(value);
    const key = getNoUidNameKey(name);
    if (!key || this.noUidNames.has(key)) {
      return false;
    }

    this.noUidNames.set(key, name);
    this.saveNoUidNames();
    this.notify('no-uid-names');
    return true;
  }

  remove(rawUids) {
    const uids = Array.isArray(rawUids) ? rawUids : [rawUids];
    let changed = false;

    for (const rawUid of uids) {
      const uid = normalizeUid(rawUid);
      if (uid && this.players.delete(uid)) {
        changed = true;
      }
    }

    if (changed) {
      this.savePlayers();
      this.notify('players');
    }
    return changed;
  }

  removeNoUidName(values) {
    const names = Array.isArray(values) ? values : [values];
    let changed = false;

    for (const value of names) {
      const key = getNoUidNameKey(value);
      if (key && this.noUidNames.delete(key)) {
        changed = true;
      }
    }

    if (changed) {
      this.saveNoUidNames();
      this.notify('no-uid-names');
    }
    return changed;
  }

  setName(rawUid, value) {
    const uid = normalizeUid(rawUid);
    if (!uid || !this.players.has(uid)) {
      return false;
    }

    const name = String(value || '').trim().slice(0, MAX_SAVED_NAME_LENGTH);
    if (this.players.get(uid) === name) {
      return true;
    }

    this.players.set(uid, name);
    this.savePlayers();
    this.notify('players');
    return true;
  }

  subscribe(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }

    this.listeners.add(listener);
    listener(this.getSnapshot(), 'current');
    return () => this.listeners.delete(listener);
  }

  getSnapshot() {
    return {
      enabled: this.enabled,
      players: this.getPlayers(),
      noUidAll: this.noUidAll,
      noUidNames: this.getNoUidNames(),
    };
  }

  savePlayers() {
    try {
      this.storage?.setItem?.(MUTED_PLAYERS_LIST_KEY, JSON.stringify(this.getPlayers()));
    } catch (error) {
      this.logger.warn?.('[Blobio] Muted-player list could not be saved.', error);
    }
  }

  saveNoUidNames() {
    try {
      this.storage?.setItem?.(MUTED_NO_UID_NAMES_KEY, JSON.stringify(this.getNoUidNames()));
    } catch (error) {
      this.logger.warn?.('[Blobio] No-UID mute name list could not be saved.', error);
    }
  }

  notify(source) {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      try {
        listener(snapshot, source);
      } catch (error) {
        this.logger.warn?.('[Blobio] Muted-player listener failed.', error);
      }
    }
  }

  destroy() {
    this.listeners.clear();
  }
}
