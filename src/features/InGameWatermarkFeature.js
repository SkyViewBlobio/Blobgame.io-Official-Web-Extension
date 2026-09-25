import { getUsernameSourceText } from './menu/MenuFeatureVisualSync.js';
import { createBlobioStorage } from '../storage/BlobioStorage.js';
import { WATERMARK_KEYS, readWatermarkSettings, watermarkText } from '../settings/WatermarkSettings.js';

export class InGameWatermarkFeature {
  constructor({ document, version, frontPage = false, storage = createBlobioStorage(document) }) {
    this.document = document;
    this.version = version;
    this.frontPage = frontPage;
    this.storage = storage;
    this.node = null;
    this.observer = null;
    this.timer = null;
    this.refresh = event => this.sync(event?.detail || undefined);
  }

  start() {
    const win = this.document.defaultView;
    this.sync();
    // Profile names and leaderboard containers can be replaced by the game.
    this.observer = new win.MutationObserver(mutations => {
      const relevant = mutations.some(mutation => {
        if (this.frontPage && (mutation.target.parentElement?.closest('.fleft.username')
          || mutation.target.closest?.('.fleft.username'))) return true;
        return [...mutation.addedNodes, ...mutation.removedNodes].some(node =>
          node === this.node || node.matches?.('.fleft.username, #leader-board-wrapper')
          || node.querySelector?.('.fleft.username, #leader-board-wrapper'));
      });
      if (!relevant || this.timer !== null) return;
      this.timer = win.setTimeout(() => { this.timer = null; this.sync(); }, 100);
    });
    this.observer.observe(this.document.documentElement, { childList: true, subtree: true, characterData: true });
    win.addEventListener('blobio-watermark-change', this.refresh);
    this.message = event => {
      if (event.data?.source === 'BlobioExtensionStorageBridge'
        && Object.values(WATERMARK_KEYS).includes(event.data.key)) this.sync();
    };
    win.addEventListener('message', this.message);
    return true;
  }

  sync(settings = readWatermarkSettings(this.storage)) {
    if (this.frontPage) {
      const username = this.document.querySelector('.fleft.username');
      if (username) {
        const name = getUsernameSourceText(username);
        if (this.storage.getItem(WATERMARK_KEYS.profileName) !== name) this.storage.setItem(WATERMARK_KEYS.profileName, name);
      } else if (this.storage.getItem(WATERMARK_KEYS.profileName)) {
        this.storage.setItem(WATERMARK_KEYS.profileName, '');
      }
      return;
    }
    const wrapper = this.document.querySelector('#leader-board-wrapper');
    if (!settings.enabled || !wrapper) {
      this.node?.remove();
      this.node = null;
      return;
    }
    if (!this.node) {
      this.node = this.document.createElement('div');
      this.node.className = 'blobio-ingame-watermark';
      this.node.style.cssText = 'display:block;text-align:center;font:600 12.32px/1.35 Arial,sans-serif;padding:3px 4px 7px;overflow-wrap:anywhere;pointer-events:none;text-shadow:0 1px 2px #000;';
    }
    const text = watermarkText(this.version, settings.mode, this.storage.getItem(WATERMARK_KEYS.profileName));
    if (this.node.textContent !== text) this.node.textContent = text;
    if (this.node.style.color !== settings.color) this.node.style.color = settings.color;
    if (this.node.parentNode !== wrapper || wrapper.firstElementChild !== this.node) wrapper.prepend(this.node);
  }

  destroy() {
    const win = this.document.defaultView;
    this.observer?.disconnect();
    if (this.timer !== null) win.clearTimeout(this.timer);
    win.removeEventListener('blobio-watermark-change', this.refresh);
    win.removeEventListener('message', this.message);
    this.node?.remove();
    this.node = null;
  }
}
