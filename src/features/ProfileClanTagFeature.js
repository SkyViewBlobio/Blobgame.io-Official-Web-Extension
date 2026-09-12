import { shouldShowProfileClanText } from '../roles/RoleSettings.js';
import { createBlobioStorage } from '../storage/BlobioStorage.js';

const PROFILE_CLAN_STYLE_ID = 'blobio-profile-clan-tag-style';
const PROFILE_CLAN_TAG_CLASS = 'blobio-profile-clan-tag';

const PROFILE_CLAN_CSS = `
.fleft.username .${PROFILE_CLAN_TAG_CLASS} {
  display: inline-block !important;
  margin-left: 6px !important;
  color: #a9a9a9 !important;
  font-weight: 800 !important;
  text-decoration: none !important;
  text-shadow:
    -1px -1px 0 #000,
     0 -1px 0 #000,
     1px -1px 0 #000,
    -1px 0 0 #000,
     1px 0 0 #000,
    -1px 1px 0 #000,
     0 1px 0 #000,
     1px 1px 0 #000,
     0 0 6px rgba(210, 210, 210, 0.52) !important;
}
`;

export class ProfileClanTagFeature {
  constructor({
    document = globalThis.document,
    roleRegistry,
    uidDetector,
    storage = createBlobioStorage(document),
    logger = console,
  } = {}) {
    this.document = document;
    this.roleRegistry = roleRegistry;
    this.uidDetector = uidDetector;
    this.storage = storage;
    this.logger = logger;
    this.styleNode = null;
    this.pageObserver = null;
    this.unsubscribeRoles = null;
    this.unsubscribeUid = null;
    this.refreshBridge = null;
    this.started = false;
  }

  start() {
    if (this.started || !this.document?.documentElement) {
      return Boolean(this.started);
    }

    this.started = true;
    this.ensureStyle();
    this.installRefreshBridge();
    this.unsubscribeRoles = this.roleRegistry?.subscribe?.(() => this.sync()) || null;
    this.unsubscribeUid = this.uidDetector?.subscribe?.(() => this.sync()) || null;
    this.sync();
    this.watchUsernames();
    return true;
  }

  installRefreshBridge() {
    const win = this.document.defaultView || globalThis;
    this.refreshBridge = () => this.sync();
    try {
      win.__blobioProfileClanTextRefresh = this.refreshBridge;
    } catch {}
  }

  ensureStyle() {
    const existing = this.document.getElementById?.(PROFILE_CLAN_STYLE_ID);
    if (existing) {
      this.styleNode = existing;
      return;
    }

    const style = this.document.createElement('style');
    style.id = PROFILE_CLAN_STYLE_ID;
    style.textContent = PROFILE_CLAN_CSS;
    (this.document.head || this.document.documentElement).appendChild(style);
    this.styleNode = style;
  }

  sync() {
    const uid = this.uidDetector?.getUid?.() || '';
    const clanTag = uid && shouldShowProfileClanText(this.storage)
      ? String(this.roleRegistry?.getRoles?.(uid)?.clan?.tag || '').trim()
      : '';

    for (const username of this.document.querySelectorAll?.('.fleft.username') || []) {
      this.syncUsername(username, clanTag);
    }
  }

  syncUsername(username, clanTag) {
    if (!username || username.closest?.('.blobio-menu-toolbar, .blobio-footer-modal-host')) {
      return;
    }

    let tag = username.querySelector?.(`.${PROFILE_CLAN_TAG_CLASS}`) || null;
    if (!clanTag) {
      tag?.remove?.();
      delete username.dataset.blobioClanTag;
      return;
    }

    if (tag && tag.dataset.clanTag === clanTag) {
      return;
    }

    if (!tag) {
      tag = this.document.createElement('span');
      tag.classList.add(PROFILE_CLAN_TAG_CLASS);
      username.appendChild(tag);
    }

    tag.dataset.clanTag = clanTag;
    tag.textContent = ` {${clanTag}}`;
    username.dataset.blobioClanTag = clanTag;
  }

  watchUsernames() {
    const MutationObserver = this.document.defaultView?.MutationObserver || globalThis.MutationObserver;
    if (!MutationObserver) {
      return;
    }

    this.pageObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes || []) {
          if (node?.matches?.('.fleft.username') || node?.querySelector?.('.fleft.username')) {
            this.sync();
            return;
          }
        }
      }
    });
    this.pageObserver.observe(this.document.documentElement, { childList: true, subtree: true });
  }

  destroy() {
    this.pageObserver?.disconnect();
    this.pageObserver = null;
    this.unsubscribeRoles?.();
    this.unsubscribeUid?.();
    this.unsubscribeRoles = null;
    this.unsubscribeUid = null;
    const win = this.document.defaultView || globalThis;
    if (win.__blobioProfileClanTextRefresh === this.refreshBridge) {
      try {
        delete win.__blobioProfileClanTextRefresh;
      } catch {
        win.__blobioProfileClanTextRefresh = undefined;
      }
    }
    this.refreshBridge = null;

    for (const tag of this.document.querySelectorAll?.(`.${PROFILE_CLAN_TAG_CLASS}`) || []) {
      tag.remove();
    }

    this.styleNode?.remove();
    this.styleNode = null;
    this.started = false;
  }
}
