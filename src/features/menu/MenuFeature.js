import { createSettingsDrag } from '../../ui/SettingsDrag.js';
import { animateDisclosure } from '../../ui/animateDisclosure.js';
import { WATERMARK_KEYS, readWatermarkSettings, watermarkText } from '../../settings/WatermarkSettings.js';
import { buildMenuCss } from '../../css/MenuFeatureStyles.js';
import { GameBackgroundSettingsUi } from '../../background/GameBackgroundSettingsUi.js';
import { CellMassSettingsUi } from '../../cellMass/CellMassSettingsUi.js';
import {
  readCellBorderSyncSetting,
  saveCellBorderSyncSetting,
} from '../../cellRing/CellBorderSyncSettings.js';
import { CellRingSettingsUi } from '../../cellRing/CellRingSettingsUi.js';
import { VirusPelletColorSettingsUi } from '../../cellColors/VirusPelletColorSettingsUi.js';
import { FpsSaverSettingsUi } from '../../fpsSaver/FpsSaverSettingsUi.js';
import { readFpsSaverSettings, saveFpsSaverSettings } from '../../fpsSaver/FpsSaverSettings.js';
import { createBlobioStorage } from '../../storage/BlobioStorage.js';
import { applyConfig, clearLegacyConfigCookies, exportConfig, parseConfig, resetConfig } from '../../settings/ConfigManager.js';
import { getTampermonkeyPageWindow } from '../../runtimePageWindow.js';
import { installNicknameEncoding } from '../../names/NicknameEncoding.js';
import {
  readFriendMinimapSettings,
  saveFriendMinimapSettings,
} from '../../friends/FriendMinimapSettings.js';
import { JellyShaderSettingsUi } from '../../jelly/JellyShaderSettingsUi.js';
import { readLiquidJellySetting, saveLiquidJellySetting } from '../../jelly/LiquidJellySettings.js';
import {
  isHideAdminMdEnabled,
  readClanTextSettings,
  saveClanTextSettings,
  setHideAdminMdEnabled,
} from '../../roles/RoleSettings.js';
import { isFpsUncapEnabled, setFpsUncapEnabled } from '../../settings/RuntimeSettings.js';
import { VirusMotherCellSettingsUi } from '../../virus/VirusMotherCellSettingsUi.js';
import {
  OTHER_GAME_NAMES,
  UPDATE_NOTES,
} from './MenuFeatureContent.js';
import {
  extractBackgroundImage,
  findReplayButton,
  getFailedViralFrames,
  getFeaturedVideo,
  getOriginalPolicyLinks,
  getOtherProjectContainers,
  getOtherProjectLinks,
  getPartnerLinkContainers,
  getPolicyPanelLinks,
  getSocialLinks,
} from './MenuFeatureDiscovery.js';
import {
  EXTENSION_DEFAULT_CATEGORY,
  EXTENSION_OPTION_TOOLTIPS,
  EXTENSION_SETTING_CATEGORIES,
} from './MenuFeatureSettingsConfig.js';
import { renderExtensionTooltip } from './MenuFeatureTooltip.js';
import { loadDailyTasks, formatDailyReset } from './DailyTasks.js';
import {
  findNameInput,
  syncUsernameAnimation,
} from './MenuFeatureVisualSync.js';

// Replace only the known game filter; leave unrelated input handlers intact.
const NICKNAME_ASCII_FILTER = "this.value = this.value.replaceAll(/[^. a-zA-Z0-9!`?',;:\\(\\)\\[\\]\\{\\}<>|/@\\\\\\^$-%+=#_&~*]+/g, '');";

const DEFAULT_CLASS_NAME = 'blobio-menu-enabled';
const DEFAULT_STYLE_ID = 'blobio-menu-style';
const DEFAULT_TOOLBAR_CLASS = 'blobio-menu-toolbar';
const DEFAULT_EXTENSION_VERSION = '0.7.5';
const HIDDEN_CLASS = 'blobio-original-hidden';
const WATERMARK_STORAGE_KEY = 'blobio.watermark.enabled';
const DAILY_TASK_MODE_KEY = 'blobio.dailyTasks.mode';
const WATERMARK_RIGHT_NUDGE = 60;
const WATERMARK_EXTRA_WIDTH = 96;
const WATERMARK_INPUT_GAP = 6;
const MAIN_MENU_ALIGNMENT_CLASS = 'blobio-main-menu-align-target';
const MAIN_MENU_LAYERED_SELECT_CLASS = 'blobio-menu-layered-select';

export function formatWatermarkVersionText(version, buildChannel = 'public') {
  const suffix = buildChannel === 'beta' ? '-BETA' : '-Release';
  return ` v${version}${suffix}`;
}

export class MenuFeature {
  constructor({
    document = globalThis.document,
    assets = {},
    logger = console,
    className = DEFAULT_CLASS_NAME,
    styleId = DEFAULT_STYLE_ID,
    storage = createBlobioStorage(document),
    roleRegistry = null,
    uidDetector = null,
    friendHighlightStore = null,
    version = DEFAULT_EXTENSION_VERSION,
    buildChannel = 'public',
    frontPageUi = true,
  } = {}) {
    this.document = document;
    this.assets = assets;
    this.logger = logger;
    this.className = className;
    this.styleId = styleId;
    this.storage = storage;
    this.roleRegistry = roleRegistry;
    this.uidDetector = uidDetector;
    this.friendHighlightStore = friendHighlightStore;
    this.version = version;
    this.buildChannel = buildChannel === 'beta' ? 'beta' : 'public';
    this.frontPageUi = frontPageUi;
    this.started = false;
    this.styleNode = null;
    this.toolbar = null;
    this.footerModalHost = null;
    this.observer = null;
    this.refreshTimer = null;
    this.refreshReasons = new Set();
    this.refreshRunning = false;
    this.panelBodies = new Map();
    this.dailyTaskNames = null;
    this.dailyTaskResult = null;
    this.dailyTaskMode = storage.getItem(DAILY_TASK_MODE_KEY) === 'simple' ? 'simple' : 'fancy';
    this.dailyTaskTimer = null;
    this.dailyTaskRequest = null;
    this.hiddenOriginalNodes = new Set();
    this.mainMenuAlignmentTargets = new Set();
    this.policyDock = null;
    this.settingsListeners = [];
    this.extensionSettingsRoot = null;
    this.cogwheelObserver = null;
    this.cogwheelAnimations = new Map();
    this.mainMenuLayeredSelectTargets = new Set();
    this.extensionTooltip = null;
    this.documentClickHandler = null;
    this.keydownHandler = null;
    this.resizeHandler = null;
    this.unsubscribeAdminRoles = null;
    this.unsubscribeAdminUid = null;
    this.unsubscribeFriendHighlight = null;
    this.virusMotherCellSettingsUi = null;
    this.gameBackgroundSettingsUi = null;
    this.virusPelletColorSettingsUi = null;
    this.cellMassSettingsUi = null;
    this.cellRingSettingsUi = null;
    this.jellyShaderSettingsUi = null;
    this.clanTextSettingsUi = null;
    this.friendHighlightSettingsUi = null;
    this.fpsSaverSettingsUi = null;
    this.nicknameInput = null;
    this.nicknameInputFilter = null;
    this.nicknameInputHandler = null;
    this.restoreNicknameEncoding = null;
  }

  start() {
    if (this.started) {
      return true;
    }

    if (!this.document?.documentElement) {
      this.logger.warn('[Blobio] Menu feature could not start: document is not ready.');
      return false;
    }

    if (!this.frontPageUi) {
      this.started = true;
      return true;
    }

    this.restoreNicknameEncoding = installNicknameEncoding(this.document.defaultView, this.logger);
    this.ensureStyle();
    this.applyPageClass();
    this.syncMainMenuAlignment();
    this.installToolbar();
    this.hideOriginalSections();
    this.installPolicyDock();
    this.installExtensionSettings();
    this.installAdminSettingTracking();
    this.installFriendHighlightTracking();
    this.syncNicknameInput();
    this.syncWatermark();
    this.syncUsernameAnimation();
    this.watchPage();

    this.documentClickHandler = (event) => {
      if (this.toolbar?.contains(event.target) || this.policyDock?.contains(event.target) || this.footerModalHost?.contains(event.target)) {
        return;
      }

      this.closePanels();
    };

    this.keydownHandler = (event) => {
      if (event.key === 'Escape') {
        this.closePanels();
      }
    };

    this.document.addEventListener?.('click', this.documentClickHandler);
    this.document.addEventListener?.('keydown', this.keydownHandler);
    this.resizeHandler = () => this.scheduleRefresh('window-resize');
    this.document.defaultView?.addEventListener?.('resize', this.resizeHandler);

    this.started = true;
    return true;
  }

  destroy() {
    this.observer?.disconnect();
    this.observer = null;
    this.clearRefreshTimer();
    this.syncNicknameInput(null);
    this.restoreNicknameEncoding?.();
    this.restoreNicknameEncoding = null;

    if (this.documentClickHandler) {
      this.document.removeEventListener?.('click', this.documentClickHandler);
      this.documentClickHandler = null;
    }

    if (this.keydownHandler) {
      this.document.removeEventListener?.('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }

    if (this.resizeHandler) {
      this.document.defaultView?.removeEventListener?.('resize', this.resizeHandler);
      this.resizeHandler = null;
    }

    this.toolbar?.remove();
    this.toolbar = null;
    this.policyDock?.remove();
    this.policyDock = null;
    this.footerModalHost?.remove();
    this.footerModalHost = null;
    this.panelBodies.clear();
    this.stopDailyTasks();
    this.unsubscribeAdminRoles?.();
    this.unsubscribeAdminUid?.();
    this.unsubscribeFriendHighlight?.();
    this.unsubscribeAdminRoles = null;
    this.unsubscribeAdminUid = null;
    this.unsubscribeFriendHighlight = null;
    this.cleanupExtensionSettings();
    for (const node of this.hiddenOriginalNodes) {
      node.classList?.remove(HIDDEN_CLASS);
    }

    this.hiddenOriginalNodes.clear();
    this.clearMainMenuAlignment();

    const style = this.styleNode || this.document.getElementById?.(this.styleId);
    style?.remove();
    this.styleNode = null;

    this.document.documentElement?.classList.remove(this.className);
    this.document.body?.classList.remove(this.className);
    this.started = false;
  }

  ensureStyle() {
    const existingStyle = this.document.getElementById?.(this.styleId);
    if (existingStyle) {
      this.styleNode = existingStyle;
      return;
    }

    const style = this.document.createElement('style');
    style.id = this.styleId;
    style.textContent = this.buildCss();

    const parent = this.document.head || this.document.documentElement;
    parent.appendChild(style);
    this.styleNode = style;
  }

  buildCss() {
    return buildMenuCss({
      className: this.className,
      hiddenClass: HIDDEN_CLASS,
      toolbarClass: DEFAULT_TOOLBAR_CLASS,
    });
  }

  applyPageClass() {
    if (!this.document.documentElement.classList.contains(this.className)) {
      this.document.documentElement.classList.add(this.className);
    }
    if (this.document.body && !this.document.body.classList.contains(this.className)) {
      this.document.body.classList.add(this.className);
    }
  }

  syncMainMenuAlignment() {
    if (!this.frontPageUi) {
      return;
    }

    const selectors = [
      '.logo',
      '.main-logo',
      '.inputs-container',
      '#game-wrapper .custom-select',
      '#ip-container',
    ];
    const nextTargets = new Set();
    const nextLayeredSelects = new Set();
    const gameSelects = [];

    for (const selector of selectors) {
      for (const node of this.document.querySelectorAll?.(selector) || []) {
        if (this.isInsideOwnUi(node)) {
          continue;
        }

        if (!node.classList?.contains(MAIN_MENU_ALIGNMENT_CLASS)) {
          node.classList?.add(MAIN_MENU_ALIGNMENT_CLASS);
        }
        nextTargets.add(node);
        if (selector === '#game-wrapper .custom-select') {
          gameSelects.push(node);
        }
      }
    }

    for (const node of gameSelects.slice(0, 2)) {
      if (!node.classList?.contains(MAIN_MENU_LAYERED_SELECT_CLASS)) {
        node.classList?.add(MAIN_MENU_LAYERED_SELECT_CLASS);
      }
      nextLayeredSelects.add(node);
    }

    for (const node of this.mainMenuAlignmentTargets) {
      if (!nextTargets.has(node)) {
        node.classList?.remove(MAIN_MENU_ALIGNMENT_CLASS);
      }
    }

    this.mainMenuAlignmentTargets = nextTargets;

    for (const node of this.mainMenuLayeredSelectTargets) {
      if (!nextLayeredSelects.has(node)) {
        node.classList?.remove(MAIN_MENU_LAYERED_SELECT_CLASS);
      }
    }

    this.mainMenuLayeredSelectTargets = nextLayeredSelects;
  }

  clearMainMenuAlignment() {
    for (const node of this.mainMenuAlignmentTargets) {
      node.classList?.remove(MAIN_MENU_ALIGNMENT_CLASS);
    }

    this.mainMenuAlignmentTargets.clear();

    for (const node of this.mainMenuLayeredSelectTargets) {
      node.classList?.remove(MAIN_MENU_LAYERED_SELECT_CLASS);
    }

    this.mainMenuLayeredSelectTargets.clear();
  }

  watchPage() {
    const MutationObserver = this.document.defaultView?.MutationObserver || globalThis.MutationObserver;
    if (!MutationObserver) {
      return;
    }

    this.observer = new MutationObserver((mutations = []) => this.handlePageMutations(mutations));

    this.observer.observe(this.document.documentElement, { childList: true, subtree: true });
  }

  handlePageMutations(mutations = []) {
    if (mutations.length === 0) {
      this.scheduleRefresh('empty-mutation-batch');
      return;
    }

    let ownMutations = 0;
    for (const mutation of mutations) {
      if (this.isOwnMutation(mutation)) {
        ownMutations += 1;
      }
    }
    if (ownMutations === mutations.length) {
      return;
    }

    const reasons = [ownMutations > 0 ? 'mixed-mutation-batch' : 'external-mutation-batch'];
    const settingsRootConnected = !this.extensionSettingsRoot
      || (typeof this.extensionSettingsRoot.isConnected === 'boolean'
        ? this.extensionSettingsRoot.isConnected
        : this.document.documentElement?.contains?.(this.extensionSettingsRoot));
    if (this.extensionSettingsRoot && !settingsRootConnected) {
      reasons.push('settings-root-detached');
    }
    this.scheduleRefresh(reasons);
  }

  scheduleRefresh(reasons = 'unspecified') {
    const nextReasons = Array.isArray(reasons) ? reasons : [reasons];
    for (const reason of nextReasons) {
      if (reason) {
        this.refreshReasons.add(String(reason));
      }
    }

    if (this.refreshTimer !== null) {
      return;
    }

    const setTimer = this.document.defaultView?.setTimeout || globalThis.setTimeout;
    this.refreshTimer = setTimer(() => {
      this.refreshTimer = null;
      const pendingReasons = Array.from(this.refreshReasons);
      this.refreshReasons.clear();
      if (!this.started) {
        return;
      }

      this.refreshRunning = true;
      try {
        this.refreshPage(pendingReasons);
      } finally {
        this.refreshRunning = false;
      }
    }, 0);
  }

  refreshPage(reasons = []) {
    if (reasons.length > 0 && reasons.every((reason) => reason === 'window-resize')) {
      this.syncExtensionSettingsPanelHeight(this.extensionSettingsRoot);
      this.syncWatermark();
      return;
    }

    this.applyPageClass();
    this.syncMainMenuAlignment();
    this.installToolbar();
    this.hideOriginalSections();
    this.installPolicyDock();
    this.installExtensionSettings();
    this.syncNicknameInput();
    this.syncWatermark();
    this.syncUsernameAnimation();
  }

  clearRefreshTimer() {
    if (this.refreshTimer !== null) {
      const clearTimer = this.document.defaultView?.clearTimeout || globalThis.clearTimeout;
      clearTimer(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.refreshReasons.clear();
  }

  installToolbar() {
    if (!this.document.body) {
      return;
    }

    if (!this.toolbar) {
      this.toolbar = this.createToolbar();
    }

    const replayButton = findReplayButton(this.document);
    if (replayButton?.parentNode) {
      const parent = replayButton.parentNode;
      if (this.toolbar.parentNode === parent && replayButton.nextSibling === this.toolbar) {
        if (this.toolbar.classList.contains('is-floating')) {
          this.toolbar.classList.remove('is-floating');
        }
        return;
      }

      const referenceNode = replayButton.nextSibling || null;
      parent.insertBefore(this.toolbar, referenceNode);
      if (this.toolbar.classList.contains('is-floating')) {
        this.toolbar.classList.remove('is-floating');
      }
      return;
    }

    if (this.toolbar.parentNode !== this.document.body) {
      this.document.body.appendChild(this.toolbar);
    }

    if (!this.toolbar.classList.contains('is-floating')) {
      this.toolbar.classList.add('is-floating');
    }
  }

  createToolbar() {
    const toolbar = this.document.createElement('div');
    toolbar.classList.add(DEFAULT_TOOLBAR_CLASS);

    const buttons = this.document.createElement('div');
    buttons.classList.add('blobio-menu-buttons');
    buttons.append(
      this.createButton('Featured', this.assets.recommendedButton, 'featured'),
      this.createButton('Updates', this.assets.updatesButton, 'updates'),
      this.createButton('Socials', this.assets.socialsButton, 'socials'),
      this.createButton('Daily Tasks', this.assets.dailyTasksButton, 'daily-tasks'),
    );

    toolbar.appendChild(buttons);
    toolbar.append(this.createFeaturedPanel(), this.createUpdatesPanel(), this.createSocialsPanel(), this.createDailyTasksPanel());
    return toolbar;
  }

  createButton(label, imageUrl, panelName) {
    const button = this.document.createElement('button');
    button.type = 'button';
    button.title = label;
    button.setAttribute('aria-label', label);
    button.setAttribute('_ngcontent-c1', '');
    button.dataset.panel = panelName;
    button.classList.add('icon-button', 'blobio-menu-button');
    button.style.backgroundImage = imageUrl ? `url("${imageUrl}")` : '';

    const hiddenLabel = this.document.createElement('span');
    hiddenLabel.classList.add('blobio-menu-label');
    hiddenLabel.textContent = label;

    button.appendChild(hiddenLabel);
    button.addEventListener('click', (event) => {
      event.stopPropagation?.();
      this.togglePanel(panelName);
    });

    return button;
  }

  createFeaturedPanel() {
    const panel = this.createPanel('featured', 'Featured Blob.io Video');
    this.renderFeaturedPanel();
    return panel;
  }

  createUpdatesPanel() {
    const panel = this.createPanel('updates', 'Update Notes');
    const body = this.panelBodies.get('updates');
    const list = this.document.createElement('div');
    list.classList.add('blobio-update-list');

    for (const note of UPDATE_NOTES) {
      const entry = this.document.createElement('div');
      entry.classList.add('blobio-update-entry');

      const date = this.document.createElement('div');
      date.classList.add('blobio-update-date');
      date.textContent = note.date;

      const items = this.document.createElement('ul');
      items.classList.add('blobio-update-items');

      for (const item of note.items) {
        const row = this.document.createElement('li');
        row.textContent = item;
        items.appendChild(row);
      }

      entry.append(date, items);
      list.appendChild(entry);
    }

    body.appendChild(list);
    return panel;
  }

  createSocialsPanel() {
    const panel = this.createPanel('socials', 'Blobio Socials');
    panel.querySelector('.blobio-panel-title').classList.add('blobio-social-title');
    this.renderSocialPanel();
    return panel;
  }

  createDailyTasksPanel() {
    const panel = this.createPanel('daily-tasks', 'Daily Tasks');
    const header = panel.querySelector('.blobio-panel-header');
    const close = panel.querySelector('.blobio-panel-close');
    const actions = this.document.createElement('div');
    actions.className = 'blobio-task-header-actions';

    const mode = this.document.createElement('button');
    mode.type = 'button';
    mode.className = 'blobio-task-mode-button';
    mode.classList.toggle('is-simple', this.dailyTaskMode === 'simple');
    mode.setAttribute('aria-label', `Task display: ${this.dailyTaskMode === 'fancy' ? 'Fancy. Switch to Simple' : 'Simple. Switch to Fancy'}`);
    mode.innerHTML = '<span>Fancy</span><span>Simple</span>';
    mode.addEventListener('click', () => {
      this.dailyTaskMode = this.dailyTaskMode === 'fancy' ? 'simple' : 'fancy';
      this.storage.setItem(DAILY_TASK_MODE_KEY, this.dailyTaskMode);
      mode.classList.toggle('is-simple', this.dailyTaskMode === 'simple');
      mode.setAttribute('aria-label', `Task display: ${this.dailyTaskMode === 'fancy' ? 'Fancy. Switch to Simple' : 'Simple. Switch to Fancy'}`);
      if (this.dailyTaskResult) this.renderDailyTasks(this.dailyTaskResult);
    });

    actions.append(mode, close);
    header.appendChild(actions);
    this.panelBodies.get('daily-tasks').textContent = 'Open to load your daily tasks.';
    return panel;
  }

  renderDailyTasks(result) {
    const panel = this.document.getElementById('blobio-panel-daily-tasks');
    const body = this.panelBodies.get('daily-tasks');
    this.clearElement(body);

    const reset = this.document.createElement('div');
    reset.className = 'blobio-tasks-reset';
    reset.textContent = formatDailyReset(result.resetInMs);
    body.appendChild(reset);

    let visibleTasks = 0;
    for (const task of result.tasks) {
      const completed = task.p >= task.l;
      if (completed && this.dailyTaskMode === 'simple') continue;
      visibleTasks++;

      const row = this.document.createElement('div');
      row.className = completed ? 'blobio-task is-complete' : 'blobio-task';
      const top = this.document.createElement('div');
      top.className = 'blobio-task-top';
      const summary = this.document.createElement('div');
      summary.className = 'blobio-task-summary';
      const copy = this.document.createElement('div');
      copy.className = 'blobio-task-copy';
      const objective = this.document.createElement('span');
      objective.className = 'blobio-task-objective';
      objective.textContent = result.names[task.id]?.d || result.names[task.id]?.n || `Task ${task.id}`;
      if (completed) {
        const check = this.document.createElement('img');
        check.className = 'blobio-task-check';
        check.src = this.assets.taskCompleteIcon;
        check.alt = '';
        summary.appendChild(check);
        const label = this.document.createElement('span');
        label.className = 'blobio-task-completed';
        label.textContent = 'COMPLETED';
        copy.append(objective, label);
      } else {
        copy.appendChild(objective);
      }
      summary.appendChild(copy);
      const reward = this.document.createElement('span');
      reward.className = 'blobio-task-reward';
      const coin = this.document.createElement('img');
      coin.src = this.assets.dailyTaskCoin;
      coin.alt = '';
      reward.append(coin, String(task.rv));
      top.append(summary, reward);

      const progress = this.document.createElement('div');
      progress.className = 'blobio-task-progress';
      const fill = this.document.createElement('span');
      fill.style.width = `${Math.min(100, task.p / task.l * 100)}%`;
      if (task.p === 0) fill.style.display = 'none';
      progress.appendChild(fill);
      progress.setAttribute('role', 'progressbar');
      progress.setAttribute('aria-label', objective.textContent);
      progress.setAttribute('aria-valuenow', String(task.p));
      progress.setAttribute('aria-valuemin', '0');
      progress.setAttribute('aria-valuemax', String(task.l));
      const count = this.document.createElement('div');
      count.className = 'blobio-task-count';
      count.textContent = `${task.p} / ${task.l}`;
      row.append(top, progress, count);
      body.appendChild(row);
    }

    if (!visibleTasks) {
      const empty = this.document.createElement('div');
      empty.className = 'blobio-tasks-empty';
      empty.textContent = 'All daily tasks completed.';
      body.appendChild(empty);
    }
    panel.style.setProperty('--blobio-panel-height', `${panel.firstElementChild.scrollHeight + 2}px`);
  }

  async refreshDailyTasks() {
    const panel = this.document.getElementById?.('blobio-panel-daily-tasks');
    if (!panel?.classList.contains('is-open')) return;

    this.dailyTaskRequest?.abort();
    const request = new AbortController();
    this.dailyTaskRequest = request;
    const body = this.panelBodies.get('daily-tasks');
    if (!this.dailyTaskNames) body.textContent = 'Loading daily tasks…';

    try {
      const result = await loadDailyTasks({
        fetch: this.document.defaultView.fetch.bind(this.document.defaultView),
        token: this.storage.getItem('access-token'),
        names: this.dailyTaskNames,
        signal: request.signal,
      });
      if (request.signal.aborted) return;
      this.dailyTaskNames = result.names;
      this.dailyTaskResult = result;
      this.renderDailyTasks(result);
    } catch (error) {
      if (request.signal.aborted) return;
      this.dailyTaskResult = null;
      body.textContent = error.message === 'sign-in-required'
        ? 'Sign in to see your daily tasks.'
        : 'Daily tasks are unavailable. Open this panel to try again.';
      panel.style.setProperty('--blobio-panel-height', `${panel.firstElementChild.scrollHeight + 2}px`);
    } finally {
      if (this.dailyTaskRequest === request) this.dailyTaskRequest = null;
    }
  }

  stopDailyTasks() {
    this.dailyTaskRequest?.abort();
    this.dailyTaskRequest = null;
    if (this.dailyTaskTimer !== null) {
      this.document.defaultView.clearInterval(this.dailyTaskTimer);
      this.dailyTaskTimer = null;
    }
  }

  installPolicyDock() {
    const links = getPolicyPanelLinks(this.document, (node) => this.isInsideOwnUi(node));
    const games = getOtherProjectLinks(this.document, (node) => this.isInsideOwnUi(node));
    if (links.length === 0 && games.length === 0) {
      this.policyDock?.remove();
      this.policyDock = null;
      this.footerModalHost?.remove();
      this.footerModalHost = null;
      return;
    }

    if (!this.policyDock) {
      this.policyDock = this.createPolicyDock();
      this.document.body?.appendChild(this.policyDock);
    }

    if (!this.footerModalHost) {
      this.footerModalHost = this.createFooterModalHost();
      this.document.body?.appendChild(this.footerModalHost);
    }

    this.ensureDockPanel('policy-games', links.length > 0 || games.length > 0);
  }

  createPolicyDock() {
    const dock = this.document.createElement('div');
    dock.classList.add('blobio-footer-dock', 'blobio-policy-dock');

    const buttons = this.document.createElement('div');
    buttons.classList.add('blobio-dock-buttons');

    if (
      getPolicyPanelLinks(this.document, (node) => this.isInsideOwnUi(node)).length > 0 ||
      getOtherProjectLinks(this.document, (node) => this.isInsideOwnUi(node)).length > 0
    ) {
      buttons.appendChild(this.createDockButton('Policy/Other Games', 'policy-games', 'blobio-policy-games-button'));
    }

    dock.appendChild(buttons);
    return dock;
  }

  createFooterModalHost() {
    const host = this.document.createElement('div');
    host.classList.add('blobio-footer-modal-host');
    return host;
  }

  ensureDockPanel(panelName, shouldExist) {
    const existingPanel = this.document.getElementById?.(`blobio-panel-${panelName}`);

    if (!shouldExist) {
      existingPanel?.remove();
      this.panelBodies.delete(panelName);
      return;
    }

    if (!existingPanel && this.footerModalHost) {
      this.footerModalHost.appendChild(this.createPanel(panelName, 'Policy / Other Games'));
    }
  }

  createDockButton(label, panelName, className) {
    const button = this.document.createElement('button');
    button.type = 'button';
    button.classList.add('blobio-dock-button', className);
    button.dataset.panel = panelName;
    button.textContent = label;
    button.addEventListener('click', (event) => {
      event.stopPropagation?.();
      this.togglePanel(panelName);
    });

    return button;
  }

  createPanel(name, titleText) {
    const panel = this.document.createElement('section');
    panel.id = `blobio-panel-${name}`;
    panel.classList.add('blobio-menu-panel');
    const updateScrollState = (event) => {
      if (event.target !== panel || event.propertyName !== 'max-height') return;
      panel.classList.toggle('is-settled', event.type === 'transitionend' && panel.classList.contains('is-open'));
    };
    panel.addEventListener('transitionrun', updateScrollState);
    panel.addEventListener('transitionend', updateScrollState);

    const inner = this.document.createElement('div');
    inner.classList.add('blobio-panel-inner');

    const header = this.document.createElement('div');
    header.classList.add('blobio-panel-header');

    const title = this.document.createElement('h3');
    title.classList.add('blobio-panel-title');
    title.textContent = titleText;

    const close = this.document.createElement('button');
    close.type = 'button';
    close.classList.add('blobio-panel-close');
    close.setAttribute('aria-label', titleText ? `Close ${titleText}` : 'Close panel');
    close.textContent = 'X';
    close.addEventListener('click', (event) => {
      event.stopPropagation?.();
      this.closePanels();
    });

    const body = this.document.createElement('div');
    body.classList.add('blobio-panel-body');

    if (titleText) {
      header.appendChild(title);
    }

    header.appendChild(close);
    inner.append(header, body);
    panel.appendChild(inner);
    this.panelBodies.set(name, body);
    return panel;
  }

  renderFeaturedPanel() {
    const body = this.panelBodies.get('featured');
    if (!body) {
      return;
    }

    this.clearElement(body);

    const video = getFeaturedVideo(this.document);
    const link = this.document.createElement('a');
    link.classList.add('blobio-video-link');
    link.setAttribute('href', video.url);
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');

    const image = this.document.createElement('img');
    image.classList.add('blobio-video-thumb');
    image.setAttribute('alt', '');
    image.setAttribute('src', video.thumbnail);

    const title = this.document.createElement('p');
    title.classList.add('blobio-video-title');
    title.textContent = video.title;

    link.append(image, title);
    body.appendChild(link);
  }

  renderSocialPanel() {
    const body = this.panelBodies.get('socials');
    if (!body) {
      return;
    }

    this.clearElement(body);

    const row = this.document.createElement('div');
    row.classList.add('blobio-social-row');

    for (const social of getSocialLinks(this.document)) {
      const link = this.document.createElement('a');
      link.classList.add('blobio-social-link');
      link.setAttribute('href', social.href);
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      link.setAttribute('title', social.label);

      const image = this.document.createElement('img');
      image.setAttribute('alt', social.label);
      image.setAttribute('src', this.assets[social.assetKey] || '');

      link.appendChild(image);
      row.appendChild(link);
    }

    body.appendChild(row);
  }

  renderPolicyPanel() {
    const body = this.panelBodies.get('policy');
    if (!body) {
      return;
    }

    this.clearElement(body);

    const links = this.document.createElement('div');
    links.classList.add('blobio-policy-links');

    for (const original of getPolicyPanelLinks(this.document, (node) => this.isInsideOwnUi(node))) {
      const link = this.document.createElement('a');
      link.classList.add('blobio-policy-link');
      link.setAttribute('href', original.getAttribute('href'));
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      link.textContent = original.textContent.trim() || original.getAttribute('href');
      links.appendChild(link);
    }

    body.appendChild(links);
  }

  renderPolicyGamesPanel() {
    const body = this.panelBodies.get('policy-games');
    if (!body) {
      return;
    }

    this.clearElement(body);

    const policyLinks = getPolicyPanelLinks(this.document, (node) => this.isInsideOwnUi(node));
    if (policyLinks.length > 0) {
      const section = this.createPanelSection('Policy');
      const links = this.document.createElement('div');
      links.classList.add('blobio-policy-links');

      for (const original of policyLinks) {
        const link = this.document.createElement('a');
        link.classList.add('blobio-policy-link');
        link.setAttribute('href', original.getAttribute('href'));
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        link.textContent = original.textContent.trim() || original.getAttribute('href');
        links.appendChild(link);
      }

      section.appendChild(links);
      body.appendChild(section);
    }

    const gameLinks = getOtherProjectLinks(this.document, (node) => this.isInsideOwnUi(node));
    if (gameLinks.length > 0) {
      const section = this.createPanelSection('Other Games');
      section.appendChild(this.createGameLinks(gameLinks));
      body.appendChild(section);
    }
  }

  createPanelSection(titleText) {
    const section = this.document.createElement('section');
    section.classList.add('blobio-panel-section');

    const title = this.document.createElement('div');
    title.classList.add('blobio-panel-section-title');
    title.textContent = titleText;

    section.appendChild(title);
    return section;
  }

  renderGamesPanel() {
    const body = this.panelBodies.get('games');
    if (!body) {
      return;
    }

    this.clearElement(body);
    body.appendChild(this.createGameLinks(getOtherProjectLinks(this.document, (node) => this.isInsideOwnUi(node))));
  }

  createGameLinks(projectLinks) {
    const links = this.document.createElement('div');
    links.classList.add('blobio-game-links');

    for (const [index, original] of projectLinks.entries()) {
      const labelText = OTHER_GAME_NAMES[index] || original.getAttribute('aria-label') || original.getAttribute('title') || 'Other game';
      const href = original.getAttribute('href');
      const card = this.document.createElement('div');
      card.classList.add('blobio-game-card');

      const label = this.document.createElement('div');
      label.classList.add('blobio-game-label');
      label.textContent = labelText;

      const gameLink = this.document.createElement(href ? 'a' : 'button');
      gameLink.classList.add('blobio-game-link');
      gameLink.setAttribute('aria-label', labelText);
      gameLink.style.backgroundImage = original.style?.backgroundImage || extractBackgroundImage(original.getAttribute('style') || '');

      if (href) {
        gameLink.setAttribute('href', href);
        gameLink.setAttribute('target', original.getAttribute('target') || '_blank');
        gameLink.setAttribute('rel', 'noopener noreferrer');
      } else {
        gameLink.type = 'button';
        gameLink.addEventListener('click', (event) => {
          event.stopPropagation?.();
          original.click?.();
        });
      }

      card.append(label, gameLink);
      links.appendChild(card);
    }

    return links;
  }

  installExtensionSettings() {
    const settingsRootConnected = !this.extensionSettingsRoot
      || (typeof this.extensionSettingsRoot.isConnected === 'boolean'
        ? this.extensionSettingsRoot.isConnected
        : this.document.documentElement?.contains?.(this.extensionSettingsRoot));
    if (this.extensionSettingsRoot && !settingsRootConnected) {
      this.cleanupExtensionSettings(this.extensionSettingsRoot);
    }

    const settingsPanels = Array.from(this.document.querySelectorAll?.('app-settings') || []);

    for (const settings of settingsPanels) {
      if (this.isInsideOwnUi(settings)) {
        continue;
      }

      const left = settings.querySelector?.('.left');
      const tabs = left?.querySelector?.('ul');
      const right = settings.querySelector?.('.right');
      const content = right?.querySelector?.('.content-container');
      if (!tabs || !content) {
        continue;
      }

      this.extensionSettingsRoot = settings;

      let tab = settings.querySelector?.('.blobio-extension-settings-tab');
      let panel = settings.querySelector?.('.blobio-extension-settings-panel');
      let installationChanged = false;

      if (!tab) {
        tab = this.createExtensionSettingsTab(settings);
        tabs.appendChild(tab);
        installationChanged = true;
      }

      if (panel && !panel.querySelector?.('.blobio-extension-category-tabs')) {
        panel.remove?.();
        panel = null;
        installationChanged = true;
      }

      if (!panel) {
        panel = this.createExtensionSettingsPanel();
        content.appendChild(panel);
        installationChanged = true;
      }

      const extensionSettingsActive = settings.classList.contains('blobio-extension-settings-active');
      if (extensionSettingsActive) {
        this.activateExtensionCategory(panel, panel.dataset.activeCategory || EXTENSION_DEFAULT_CATEGORY);
      }
      if (installationChanged || extensionSettingsActive) {
        this.syncExtensionSettingsCheckboxes(panel);
      }
      if (extensionSettingsActive) {
        this.syncExtensionSettingsPanelHeight(settings);
      }
      this.bindExtensionSettingsWheel(settings);

      if (tab.dataset.blobioExtensionListener !== 'true') {
        tab.dataset.blobioExtensionListener = 'true';
        this.addSettingsListener(tab, 'click', (event) => {
          event.stopPropagation?.();
          this.activateExtensionSettings(settings);
        });
      }

      for (const item of tabs.children || []) {
        if (item === tab) {
          continue;
        }

        if (item.dataset.blobioExtensionCloseListener !== 'true') {
          item.dataset.blobioExtensionCloseListener = 'true';
          this.addSettingsListener(item, 'click', () => {
            this.deactivateExtensionSettings(settings);
          });
        }
      }
    }
  }

  createExtensionSettingsTab(settings) {
    const tab = this.document.createElement('li');
    tab.classList.add('blobio-extension-settings-tab');
    tab.setAttribute('_ngcontent-c3', '');
    tab.textContent = 'Extension';
    tab.dataset.settingsPanel = 'extension';
    return tab;
  }

  createExtensionSettingsPanel() {
    this.cleanupCogwheels();
    const panel = this.document.createElement('div');
    panel.classList.add('blobio-extension-settings-panel');
    panel.setAttribute('_ngcontent-c3', '');
    if (this.assets.cogwheelIcon) {
      panel.classList.add('blobio-has-cogwheel');
      panel.style.setProperty('--blobio-cogwheel-icon', `url("${this.assets.cogwheelIcon}")`);
    }

    const tabs = this.document.createElement('div');
    tabs.classList.add('blobio-extension-category-tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Extension setting categories');
    tabs.setAttribute('_ngcontent-c3', '');

    const categoryPanels = new Map();
    for (const [key, label] of EXTENSION_SETTING_CATEGORIES) {
      const button = this.document.createElement('button');
      button.type = 'button';
      button.classList.add('blobio-extension-category-button');
      button.dataset.category = key;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', 'false');
      button.setAttribute('_ngcontent-c3', '');
      button.textContent = label;
      this.addSettingsListener(button, 'click', (event) => {
        event.preventDefault?.();
        event.stopPropagation?.();
        this.activateExtensionCategory(panel, key);
      });
      tabs.appendChild(button);

      const categoryPanel = this.document.createElement('div');
      categoryPanel.classList.add('grid-container', 'blobio-extension-category-panel');
      categoryPanel.dataset.category = key;
      categoryPanel.setAttribute('role', 'tabpanel');
      categoryPanel.setAttribute('aria-label', `${label} extension settings`);
      categoryPanel.setAttribute('_ngcontent-c3', '');
      categoryPanels.set(key, categoryPanel);
    }

    this.fpsSaverSettingsUi?.destroy?.();
    this.fpsSaverSettingsUi = new FpsSaverSettingsUi({
      document: this.document,
      storage: this.storage,
      showTooltip: (row, event) => this.showExtensionTooltip(row, event),
      moveTooltip: (event) => this.moveExtensionTooltip(event),
      hideTooltip: () => this.hideExtensionTooltip(),
      onOpen: (ui) => this.closeExtensionSettingMenus(ui),
    });
    categoryPanels.get('fps').append(...this.fpsSaverSettingsUi.create());

    const fpsSaverSettings = readFpsSaverSettings(this.storage, this.document);
    categoryPanels.get('fps').append(
      this.createFpsSaverSwitchRow({
        id: 'config-switch-fps-saver-lite-mode',
        key: 'liteMode',
        label: 'Lite-Mode',
        description: EXTENSION_OPTION_TOOLTIPS.liteMode,
        checked: fpsSaverSettings.liteMode,
      }),
      this.createFpsSaverSwitchRow({
        id: 'config-switch-fps-saver-no-transitions',
        key: 'noTransitions',
        label: 'No-Transitions',
        description: EXTENSION_OPTION_TOOLTIPS.noTransitions,
        checked: fpsSaverSettings.noTransitions,
      }),
      this.createFpsSaverSwitchRow({
        id: 'config-switch-fps-saver-game-overlay',
        key: 'gameOverlay',
        label: 'Game-Overlay',
        description: EXTENSION_OPTION_TOOLTIPS.gameOverlay,
        checked: fpsSaverSettings.gameOverlay,
      }),
      this.createFpsSaverSwitchRow({
        id: 'config-switch-fps-saver-toast-modal-anim',
        key: 'toastModalAnim',
        label: 'Toast-Modal-Anim',
        description: EXTENSION_OPTION_TOOLTIPS.toastModalAnim,
        checked: fpsSaverSettings.toastModalAnim,
      }),
      this.createFpsSaverSwitchRow({
        id: 'config-switch-fps-saver-chat-guard',
        key: 'chatGuard',
        label: 'Chat-Guard',
        description: EXTENSION_OPTION_TOOLTIPS.chatGuard,
        checked: fpsSaverSettings.chatGuard,
      }),
      this.createExtensionSwitchRow({
        id: 'config-switch-fps-uncap',
        label: 'FPS-uncap',
        description: EXTENSION_OPTION_TOOLTIPS.fpsUncap,
        checked: isFpsUncapEnabled(this.storage),
        onChange: (enabled, checkbox) => {
          checkbox.checked = setFpsUncapEnabled(this.storage, enabled);
        },
      }),
    );

    this.cellMassSettingsUi?.destroy?.();
    this.cellMassSettingsUi = new CellMassSettingsUi({
      document: this.document,
      storage: this.storage,
      showTooltip: (row, event) => this.showExtensionTooltip(row, event),
      moveTooltip: (event) => this.moveExtensionTooltip(event),
      hideTooltip: () => this.hideExtensionTooltip(),
      onOpen: (ui) => this.closeExtensionSettingMenus(ui),
    });
    categoryPanels.get('cell').appendChild(this.cellMassSettingsUi.create());

    this.cellRingSettingsUi?.destroy?.();
    this.cellRingSettingsUi = new CellRingSettingsUi({
      document: this.document,
      storage: this.storage,
      logger: this.logger,
      showTooltip: (row, event) => this.showExtensionTooltip(row, event),
      moveTooltip: (event) => this.moveExtensionTooltip(event),
      hideTooltip: () => this.hideExtensionTooltip(),
      onOpen: (ui) => this.closeExtensionSettingMenus(ui),
    });
    categoryPanels.get('cell').appendChild(this.cellRingSettingsUi.create());
    categoryPanels.get('cell').appendChild(this.createExtensionSwitchRow({
      id: 'config-switch-cell-border-sync',
      label: 'Cell Border Sync',
      description: EXTENSION_OPTION_TOOLTIPS.cellBorderSync,
      checked: readCellBorderSyncSetting(this.storage),
      onChange: (enabled, checkbox) => {
        checkbox.checked = saveCellBorderSyncSetting(this.storage, enabled);
      },
    }));

    this.virusMotherCellSettingsUi?.destroy?.();
    this.virusMotherCellSettingsUi = new VirusMotherCellSettingsUi({
      document: this.document,
      storage: this.storage,
      assets: this.assets,
      logger: this.logger,
      showTooltip: (row, event) => this.showExtensionTooltip(row, event),
      moveTooltip: (event) => this.moveExtensionTooltip(event),
      hideTooltip: () => this.hideExtensionTooltip(),
      onOpen: (ui) => this.closeExtensionSettingMenus(ui),
    });
    categoryPanels.get('theme').appendChild(this.virusMotherCellSettingsUi.create());

    this.gameBackgroundSettingsUi?.destroy?.();
    this.gameBackgroundSettingsUi = new GameBackgroundSettingsUi({
      document: this.document,
      storage: this.storage,
      showTooltip: (row, event) => this.showExtensionTooltip(row, event),
      moveTooltip: (event) => this.moveExtensionTooltip(event),
      hideTooltip: () => this.hideExtensionTooltip(),
      onOpen: (ui) => this.closeExtensionSettingMenus(ui),
    });
    categoryPanels.get('theme').appendChild(this.gameBackgroundSettingsUi.create());

    this.virusPelletColorSettingsUi?.destroy?.();
    this.virusPelletColorSettingsUi = new VirusPelletColorSettingsUi({
      document: this.document,
      storage: this.storage,
      assets: this.assets,
      logger: this.logger,
      showTooltip: (row, event) => this.showExtensionTooltip(row, event),
      moveTooltip: (event) => this.moveExtensionTooltip(event),
      hideTooltip: () => this.hideExtensionTooltip(),
      onOpen: (ui) => this.closeExtensionSettingMenus(ui),
    });
    categoryPanels.get('theme').appendChild(this.virusPelletColorSettingsUi.create());

    this.jellyShaderSettingsUi?.destroy?.();
    this.jellyShaderSettingsUi = new JellyShaderSettingsUi({
      document: this.document,
      storage: this.storage,
      showTooltip: (row, event) => this.showExtensionTooltip(row, event),
      moveTooltip: (event) => this.moveExtensionTooltip(event),
      hideTooltip: () => this.hideExtensionTooltip(),
      onOpen: (ui) => this.closeExtensionSettingMenus(ui),
    });
    categoryPanels.get('animation').appendChild(this.jellyShaderSettingsUi.create());
    categoryPanels.get('animation').appendChild(this.createExtensionSwitchRow({
      id: 'config-switch-liquid-jelly',
      label: 'Liquid Jelly',
      description: 'FPS-Impact: Low[1-20]\nA new version of the old Jelly-Physics shader.',
      checked: readLiquidJellySetting(this.storage),
      onChange: (enabled, checkbox) => {
        checkbox.checked = saveLiquidJellySetting(this.storage, enabled);
        getTampermonkeyPageWindow(this.document.defaultView)?.__blobioLiquidJellyRefresh?.({
          enabled: checkbox.checked,
          version: this.version,
        });
      },
    }));

    categoryPanels.get('text').append(
      this.createWatermarkSettingsGroup(),
      this.createFriendHighlightSettingsGroup(),
      this.createClanTextSettingsGroup(),
      this.createExtensionSwitchRow({
        id: 'config-switch-hide-admin-md',
        label: 'Hide MD badge',
        description: EXTENSION_OPTION_TOOLTIPS.hideAdminMd,
        checked: isHideAdminMdEnabled(this.storage),
        rowClass: 'blobio-admin-only-setting-row',
        onChange: (enabled, checkbox) => {
          checkbox.checked = setHideAdminMdEnabled(this.storage, enabled);
        },
      }),
    );

    categoryPanels.get('misc').appendChild(this.createConfigManagerGroup());

    panel.appendChild(tabs);
    for (const [key] of EXTENSION_SETTING_CATEGORIES) {
      panel.appendChild(categoryPanels.get(key));
    }

    if (this.assets.cogwheelIcon) {
      const cogwheelButtons = panel.querySelectorAll('.blobio-extension-setting-row > button[aria-expanded]');
      for (const button of cogwheelButtons) {
        const icon = this.document.createElement('span');
        icon.className = 'blobio-cogwheel-icon';
        icon.setAttribute('aria-hidden', 'true');
        button.appendChild(icon);
      }

      this.cogwheelObserver = new this.document.defaultView.MutationObserver(records => {
        for (const record of records) {
          const button = record.target;
          const open = button.getAttribute('aria-expanded') === 'true';
          if (record.oldValue === String(open)) {
            continue;
          }

          const icon = button.querySelector('.blobio-cogwheel-icon');
          const matrix = new this.document.defaultView.DOMMatrix(this.document.defaultView.getComputedStyle(icon).transform);
          const angle = (Math.atan2(matrix.b, matrix.a) * 180 / Math.PI + 360) % 360;
          this.cogwheelAnimations.get(icon)?.cancel();

          if (open) {
            this.cogwheelAnimations.set(icon, icon.animate([
              { transform: `rotate(${angle}deg)` },
              { transform: `rotate(${angle + 360}deg)` },
            ], { duration: 7200, iterations: Infinity, easing: 'linear' }));
          } else if (angle > 0.5) {
            this.cogwheelAnimations.set(icon, icon.animate([
              { transform: `rotate(${angle}deg)` },
              { transform: 'rotate(0deg)' },
            ], { duration: Math.max(180, angle / 360 * 900), easing: 'cubic-bezier(.25, .9, .4, 1)' }));
          } else {
            this.cogwheelAnimations.delete(icon);
          }
        }
      });
      for (const button of cogwheelButtons) {
        this.cogwheelObserver.observe(button, {
          attributes: true,
          attributeFilter: ['aria-expanded'],
          attributeOldValue: true,
        });
      }
    }

    this.activateExtensionCategory(panel, EXTENSION_DEFAULT_CATEGORY);
    this.syncAdminSettingVisibility(panel);
    return panel;
  }

  bindExtensionSettingsWheel(settings) {
    if (settings.dataset.blobioExtensionWheelListener === 'true') {
      return;
    }

    settings.dataset.blobioExtensionWheelListener = 'true';
    this.addSettingsListener(
      settings,
      'wheel',
      (event) => this.handleExtensionSettingsWheel(settings, event),
      { passive: false },
    );
  }

  handleExtensionSettingsWheel(settings, event) {
    if (!settings?.classList?.contains('blobio-extension-settings-active') || !settings.contains?.(event.target)) {
      return;
    }

    const deltaY = Number(event.deltaY) || 0;
    if (!deltaY) {
      return;
    }

    const scroller = this.getExtensionWheelScroller(settings, event.target, deltaY);
    if (!scroller) {
      return;
    }

    const maxTop = Math.max(0, (Number(scroller.scrollHeight) || 0) - (Number(scroller.clientHeight) || 0));
    const currentTop = Math.min(maxTop, Math.max(0, Number(scroller.scrollTop) || 0));
    const nextTop = Math.min(maxTop, Math.max(0, currentTop + deltaY));
    if (nextTop === currentTop) {
      return;
    }

    scroller.scrollTop = nextTop;
    event.preventDefault?.();
    event.stopPropagation?.();
  }

  getExtensionWheelScroller(settings, target, deltaY) {
    const panel = settings.querySelector?.('.blobio-extension-category-panel.is-active');
    if (panel?.contains?.(target)) {
      let node = target?.classList ? target : target?.parentElement;
      while (node && node !== panel) {
        if (this.canScrollByWheel(node, deltaY)) {
          return node;
        }
        node = node.parentElement;
      }
    }

    if (this.canScrollByWheel(panel, deltaY)) {
      return panel;
    }

    const content = settings.querySelector?.('.content-container.scroll')
      || settings.querySelector?.('.content-container');
    return this.canScrollByWheel(content, deltaY) ? content : null;
  }

  canScrollByWheel(node, deltaY) {
    const maxTop = Math.max(0, (Number(node?.scrollHeight) || 0) - (Number(node?.clientHeight) || 0));
    if (maxTop <= 0) {
      return false;
    }

    const currentTop = Math.min(maxTop, Math.max(0, Number(node?.scrollTop) || 0));
    return deltaY < 0 ? currentTop > 0 : currentTop < maxTop;
  }

  closeExtensionSettingMenus(except = null) {
    for (const ui of [
      this.virusMotherCellSettingsUi,
      this.gameBackgroundSettingsUi,
      this.virusPelletColorSettingsUi,
      this.cellMassSettingsUi,
      this.cellRingSettingsUi,
      this.jellyShaderSettingsUi,
      this.fpsSaverSettingsUi,
      this.clanTextSettingsUi,
      this.friendHighlightSettingsUi,
      this.watermarkSettingsUi,
      this.configManagerUi,
    ]) {
      if (ui && ui !== except) {
        ui.setOpen?.(false);
      }
    }
  }

  activateExtensionCategory(panel, category) {
    if (!panel) {
      return;
    }

    const validCategory = EXTENSION_SETTING_CATEGORIES.some(([key]) => key === category)
      ? category
      : EXTENSION_DEFAULT_CATEGORY;
    if (panel.dataset.activeCategory !== validCategory) {
      panel.dataset.activeCategory = validCategory;
    }

    for (const button of panel.querySelectorAll?.('.blobio-extension-category-button') || []) {
      const active = button.dataset.category === validCategory;
      if (active && !button.classList.contains('is-active')) {
        button.classList.add('is-active');
      } else if (!active && button.classList.contains('is-active')) {
        button.classList.remove('is-active');
      }
      if (button.getAttribute?.('aria-selected') !== String(active)) {
        button.setAttribute('aria-selected', String(active));
      }
    }

    for (const categoryPanel of panel.querySelectorAll?.('.blobio-extension-category-panel') || []) {
      const active = categoryPanel.dataset.category === validCategory;
      if (categoryPanel.hidden !== !active) {
        categoryPanel.hidden = !active;
      }
      if (active && !categoryPanel.classList.contains('is-active')) {
        categoryPanel.classList.add('is-active');
      } else if (!active && categoryPanel.classList.contains('is-active')) {
        categoryPanel.classList.remove('is-active');
      }
    }
  }

  createExtensionSwitchRow({ id, label, description, checked, onChange, rowClass = '' }) {
    const row = this.document.createElement('div');
    row.classList.add('grid-item', 'blobio-extension-setting-row');
    if (rowClass) {
      row.classList.add(rowClass);
    }
    row.setAttribute('_ngcontent-c3', '');
    if (description) {
      row.dataset.blobioTooltip = description;
    }

    const switchLabel = this.document.createElement('label');
    switchLabel.classList.add('switch');
    switchLabel.setAttribute('_ngcontent-c3', '');

    const checkbox = this.document.createElement('input');
    checkbox.id = id;
    checkbox.type = 'checkbox';
    checkbox.checked = checked;
    checkbox.classList.add('ng-untouched', 'ng-pristine', 'ng-valid');
    checkbox.setAttribute('_ngcontent-c3', '');
    checkbox.setAttribute('type', 'checkbox');

    const slider = this.document.createElement('span');
    slider.classList.add('slider');
    slider.setAttribute('_ngcontent-c3', '');

    const textLabel = this.document.createElement('label');
    textLabel.setAttribute('_ngcontent-c3', '');
    textLabel.setAttribute('for', checkbox.id);
    textLabel.textContent = label;

    const spacer = this.document.createElement('span');
    spacer.classList.add('blobio-extension-row-spacer');
    spacer.setAttribute('aria-hidden', 'true');

    switchLabel.append(checkbox, slider);
    row.append(switchLabel, textLabel, spacer);

    this.addSettingsListener(checkbox, 'change', () => {
      onChange(Boolean(checkbox.checked), checkbox);
    });

    if (description) {
      this.addSettingsListener(row, 'mouseenter', (event) => this.showExtensionTooltip(row, event));
      this.addSettingsListener(row, 'mousemove', (event) => this.moveExtensionTooltip(event));
      this.addSettingsListener(row, 'mouseleave', () => this.hideExtensionTooltip());
    }

    return row;
  }

  createFpsSaverSwitchRow({ id, key, label, description, checked }) {
    return this.createExtensionSwitchRow({
      id,
      label,
      description,
      checked,
      onChange: (enabled, checkbox) => {
        const settings = this.setFpsSaverSetting({ [key]: enabled });
        checkbox.checked = Boolean(settings[key]);
        this.fpsSaverSettingsUi?.sync?.();
      },
    });
  }

  createConfigManagerGroup() {
    const group = this.document.createElement('div');
    group.className = 'grid-item blobio-extension-setting-group blobio-config-manager-group';
    const row = this.document.createElement('div');
    row.className = 'blobio-extension-setting-row blobio-config-manager-main-row';
    const title = this.document.createElement('span');
    title.textContent = 'Config Manager';
    const arrow = this.document.createElement('button');
    arrow.type = 'button';
    arrow.className = 'blobio-clan-text-dropdown-button';
    arrow.setAttribute('aria-label', 'Open Config Manager');
    const symbol = this.document.createElement('span');
    symbol.className = 'blobio-clan-text-dropdown-symbol';
    symbol.setAttribute('aria-hidden', 'true');
    arrow.appendChild(symbol);
    row.append(title, arrow);

    const menu = this.document.createElement('div');
    menu.className = 'blobio-background-button-menu blobio-config-manager-menu';
    menu.hidden = true;
    const api = { setOpen: open => {
      animateDisclosure(menu, open);
      symbol.textContent = open ? '-' : '+';
      arrow.setAttribute('aria-expanded', String(open));
      group.classList.toggle('is-open', open);
    } };
    this.configManagerUi = api;
    api.setOpen(false);
    this.addSettingsListener(arrow, 'click', event => {
      event.preventDefault();
      event.stopPropagation();
      const open = menu.hidden;
      if (open) this.closeExtensionSettingMenus(api);
      api.setOpen(open);
    });

    const status = this.document.createElement('div');
    status.className = 'blobio-config-manager-status';
    status.setAttribute('role', 'status');
    const button = (label, onClick) => {
      const control = this.document.createElement('button');
      control.type = 'button';
      control.className = 'blobio-config-manager-action';
      control.textContent = label;
      this.addSettingsListener(control, 'click', onClick);
      return control;
    };

    const fileInput = this.document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.hidden = true;
    this.addSettingsListener(fileInput, 'change', async () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (!file) return;
      try {
        if (file.size > 1024 * 1024) throw new Error('Config file is too large.');
        const settings = parseConfig(await file.text());
        if (!clearLegacyConfigCookies(this.document)) throw new Error('Old settings cookies could not be cleared.');
        applyConfig(this.storage, settings);
        this.document.defaultView.location.reload();
      } catch (error) {
        status.textContent = `Import failed: ${error.message}`;
      }
    });

    const save = button('Save config', async () => {
      try {
        const contents = JSON.stringify(exportConfig(this.storage), null, 2);
        const filename = `Blobio-config-${new Date().toISOString().slice(0, 10)}.json`;
        const win = this.document.defaultView;
        if (typeof win.showSaveFilePicker === 'function') {
          try {
            const handle = await win.showSaveFilePicker({
              suggestedName: filename,
              types: [{ description: 'Blobio config', accept: { 'application/json': ['.json'] } }],
            });
            const writable = await handle.createWritable();
            await writable.write(contents);
            await writable.close();
            status.textContent = 'Config saved.';
            return;
          } catch (error) {
            if (error.name === 'AbortError') return;
            if (error.name !== 'SecurityError' && error.name !== 'NotAllowedError') throw error;
          }
        }
        const url = win.URL.createObjectURL(new win.Blob([contents], { type: 'application/json' }));
        const link = this.document.createElement('a');
        link.href = url;
        link.download = filename;
        this.document.body.appendChild(link);
        link.click();
        link.remove();
        win.setTimeout(() => win.URL.revokeObjectURL(url), 1000);
        status.textContent = 'Config download started.';
      } catch (error) {
        status.textContent = `Save failed: ${error.message}`;
      }
    });
    const reset = button('Reset config', () => {
      if (!this.document.defaultView.confirm('Reset all extension settings to defaults? Saved tokens will stay on this device.')) return;
      try {
        if (!clearLegacyConfigCookies(this.document)) throw new Error('Old settings cookies could not be cleared.');
        resetConfig(this.storage);
        this.document.defaultView.location.reload();
      } catch (error) {
        status.textContent = `Reset failed: ${error.message}`;
      }
    });
    const importButton = button('Import config', () => fileInput.click());
    menu.append(save, reset, importButton, fileInput, status);
    group.append(row, menu);
    return group;
  }

  createWatermarkSettingsGroup() {
    this.watermarkSettingsUi?.flush?.();
    const group = this.document.createElement('div');
    group.className = 'grid-item blobio-extension-setting-group blobio-watermark-setting-group';
    const main = this.createExtensionSwitchRow({
      id: 'config-switch-watermark', label: 'WaterMark',
      description: EXTENSION_OPTION_TOOLTIPS.watermark, checked: this.isWatermarkEnabled(),
      onChange: enabled => { this.setWatermarkEnabled(enabled); this.syncWatermark(); },
    });
    const menu = this.document.createElement('div');
    menu.className = 'blobio-background-button-menu';
    menu.hidden = true;
    const arrow = this.document.createElement('button');
    arrow.type = 'button';
    arrow.className = 'blobio-clan-text-dropdown-button';
    arrow.setAttribute('aria-label', 'Open WaterMark settings');
    const disclosure = this.document.createElement('span');
    disclosure.className = 'blobio-clan-text-dropdown-symbol';
    disclosure.setAttribute('aria-hidden', 'true');
    arrow.appendChild(disclosure);
    const api = { setOpen: open => {
      if (!open) this.watermarkSettingsUi?.flush?.();
      animateDisclosure(menu, open);
      disclosure.textContent = open ? '-' : '+';
      arrow.setAttribute('aria-expanded', String(open));
      group.classList.toggle('is-open', open);
    } };
    this.watermarkSettingsUi = api;
    api.setOpen(false);
    this.addSettingsListener(arrow, 'click', event => {
      event.preventDefault(); event.stopPropagation();
      const open = menu.hidden;
      if (open) this.closeExtensionSettingMenus(api);
      api.setOpen(open);
    });
    main.querySelector('.blobio-extension-row-spacer')?.remove();
    main.classList.add('blobio-clan-text-main-row');
    main.append(arrow);
    const current = readWatermarkSettings(this.storage);
    const controls = this.document.createElement('div');
    controls.hidden = !current.enabled;
    controls.className = 'blobio-watermark-controls';
    const save = (key, value) => {
      this.storage.setItem(key, value);
      sync();
      this.document.defaultView.dispatchEvent(new this.document.defaultView.Event('blobio-watermark-change'));
    };
    const enabled = this.createClanTextCheckboxRow({
      id: 'config-switch-ingame-watermark', label: 'In-game Watermark', checked: current.enabled,
      onChange: value => { this.watermarkSettingsUi?.flush?.(); animateDisclosure(controls, value); save(WATERMARK_KEYS.enabled, value ? '1' : '0'); },
    });
    const modes = this.document.createElement('div');
    modes.className = 'blobio-background-mode-row';
    const modeLabel = this.document.createElement('span');
    modeLabel.textContent = 'Mode';
    const modeButton = this.document.createElement('button');
    modeButton.type = 'button';
    modeButton.className = 'blobio-background-mode-button';
    for (const [mode, style] of [['normal', 'solid'], ['welcomer', 'gradient']]) {
      const text = this.document.createElement('span');
      text.className = `blobio-background-mode-text is-${style}`;
      text.textContent = mode === 'normal' ? 'Normal' : 'Welcomer';
      modeButton.append(text);
    }
    this.addSettingsListener(modeButton, 'click', () => {
      this.watermarkSettingsUi?.flush?.();
      const mode = readWatermarkSettings(this.storage).mode === 'normal' ? 'welcomer' : 'normal';
      save(WATERMARK_KEYS.mode, mode);
    });
    modes.append(modeLabel, modeButton);
    const colorLabel = this.document.createElement('label');
    colorLabel.className = 'blobio-background-control blobio-background-color-control';
    const colorTitle = this.document.createElement('span');
    colorTitle.textContent = 'Text Color';
    const wheel = this.document.createElement('span');
    wheel.className = 'blobio-background-color-wheel';
    const swatch = this.document.createElement('span');
    swatch.className = 'blobio-background-color-swatch';
    const color = this.document.createElement('input');
    color.type = 'color'; color.value = current.color;
    color.className = 'blobio-background-color-input';
    color.setAttribute('aria-label', 'Watermark text color');
    let colorDraft = null;
    const drag = createSettingsDrag(this.document.defaultView || globalThis, () => {
      sync(colorDraft);
      const win = this.document.defaultView;
      win.dispatchEvent(new win.CustomEvent('blobio-watermark-change', { detail: colorDraft }));
    }, () => {
      save(WATERMARK_KEYS.color, colorDraft.color);
      colorDraft = null;
    });
    api.flush = drag.flush;
    this.addSettingsListener(color, 'input', () => {
      colorDraft = { ...(colorDraft || readWatermarkSettings(this.storage)), color: color.value };
      drag.schedule();
    });
    this.addSettingsListener(color, 'change', () => drag.flush());
    this.addSettingsListener(color, 'blur', () => drag.flush());
    wheel.append(swatch, color);
    colorLabel.append(colorTitle, wheel);
    const preview = this.document.createElement('div');
    preview.className = 'blobio-background-preview blobio-watermark-preview';
    const sync = (settings = readWatermarkSettings(this.storage)) => {
      preview.textContent = watermarkText(this.version, settings.mode, this.storage.getItem(WATERMARK_KEYS.profileName));
      preview.style.color = settings.color;
      swatch.style.backgroundColor = settings.color;
      modeButton.classList.toggle('is-gradient', settings.mode === 'welcomer');
      modeButton.setAttribute('aria-label', `Watermark mode: ${settings.mode === 'normal' ? 'Normal' : 'Welcomer'}. Click to switch.`);
    };
    sync();
    controls.append(preview, modes, colorLabel);
    menu.append(enabled, controls);
    group.append(main, menu);
    return group;
  }

  createFriendHighlightSettingsGroup() {
    const group = this.document.createElement('div');
    group.className = 'grid-item blobio-extension-setting-group blobio-extension-clan-text-group';

    const main = this.createExtensionSwitchRow({
      id: 'config-switch-friend-highlight',
      label: 'Friends-highlight',
      description: EXTENSION_OPTION_TOOLTIPS.friendHighlight,
      checked: Boolean(this.friendHighlightStore?.isEnabled?.()),
      onChange: (enabled, checkbox) => {
        checkbox.checked = this.friendHighlightStore?.setEnabled?.(enabled) ?? false;
      },
    });
    main.classList.add('blobio-clan-text-main-row');
    main.querySelector?.('.blobio-extension-row-spacer')?.remove();

    const arrowButton = this.document.createElement('button');
    arrowButton.type = 'button';
    arrowButton.className = 'blobio-clan-text-dropdown-button';
    arrowButton.setAttribute('aria-label', 'Open Friends-highlight settings');
    arrowButton.setAttribute('aria-expanded', 'false');
    const disclosure = this.document.createElement('span');
    disclosure.className = 'blobio-clan-text-dropdown-symbol';
    disclosure.setAttribute('aria-hidden', 'true');
    disclosure.textContent = '+';
    arrowButton.append(disclosure);
    main.append(arrowButton);

    const menu = this.document.createElement('div');
    menu.className = 'blobio-clan-text-button-menu';
    menu.hidden = true;
    const current = readFriendMinimapSettings(this.storage);
    const refreshRuntime = (settings) => {
      getTampermonkeyPageWindow(this.document.defaultView)?.__blobioCellMassRefresh?.({
        friendMinimapName: settings.enabled,
        friendMinimapColor: settings.color,
        friendMinimapMode: settings.mode,
        friendMinimapNameMode: settings.nameMode,
        friendMinimapInGameColor: settings.inGameColor,
      });
    };
    const save = (changes) => {
      const settings = saveFriendMinimapSettings(this.storage, changes);
      refreshRuntime(settings);
      return settings;
    };
    const minimapName = this.createClanTextCheckboxRow({
      id: 'config-switch-friend-minimap-name',
      label: 'Friend minimap name',
      checked: current.enabled,
      onChange: (enabled, checkbox) => {
        checkbox.checked = save({ enabled }).enabled;
      },
    });
    minimapName.dataset.blobioTooltip = EXTENSION_OPTION_TOOLTIPS.friendMinimapName;
    this.addSettingsListener(minimapName, 'mouseenter', (event) => this.showExtensionTooltip(minimapName, event));
    this.addSettingsListener(minimapName, 'mousemove', (event) => this.moveExtensionTooltip(event));
    this.addSettingsListener(minimapName, 'mouseleave', () => this.hideExtensionTooltip());

    const controls = this.document.createElement('div');
    controls.className = 'blobio-friend-minimap-controls';
    const modesTitle = this.document.createElement('div');
    modesTitle.className = 'blobio-cell-ring-section-title';
    modesTitle.textContent = 'Modes/Options';
    const modeRow = this.document.createElement('div');
    modeRow.className = 'blobio-background-mode-row';
    const modeLabel = this.document.createElement('span');
    modeLabel.textContent = 'Brackets';
    const modeButton = this.document.createElement('button');
    modeButton.type = 'button';
    modeButton.className = 'blobio-background-mode-button';
    for (const [mode, style] of [['normal', 'solid'], ['bracket', 'gradient']]) {
      const text = this.document.createElement('span');
      text.className = `blobio-background-mode-text is-${style}`;
      text.textContent = mode === 'normal' ? 'Normal' : 'Bracket';
      modeButton.append(text);
    }
    modeRow.append(modeLabel, modeButton);

    const nameModeRow = this.document.createElement('div');
    nameModeRow.className = 'blobio-background-mode-row';
    const nameModeLabel = this.document.createElement('span');
    nameModeLabel.textContent = 'Names';
    const nameModeButton = this.document.createElement('button');
    nameModeButton.type = 'button';
    nameModeButton.className = 'blobio-background-mode-button';
    for (const [nameMode, style] of [['both', 'solid'], ['onlyProfile', 'gradient']]) {
      const text = this.document.createElement('span');
      text.className = `blobio-background-mode-text is-${style}`;
      text.textContent = nameMode === 'both' ? 'Both' : 'OnlyProfile';
      nameModeButton.append(text);
    }
    nameModeRow.append(nameModeLabel, nameModeButton);

    const colorsTitle = this.document.createElement('div');
    colorsTitle.className = 'blobio-cell-ring-section-title';
    colorsTitle.textContent = 'Colors';
    const colors = [];
    for (const [key, title, ariaLabel] of [
      ['color', 'Profile Name Color', 'Friend minimap profile name color'],
      ['inGameColor', 'In-game Name Color', 'Friend minimap in-game name color'],
    ]) {
      const label = this.document.createElement('label');
      label.className = 'blobio-background-control blobio-background-color-control';
      const caption = this.document.createElement('span');
      caption.textContent = title;
      const wheel = this.document.createElement('span');
      wheel.className = 'blobio-background-color-wheel';
      const swatch = this.document.createElement('span');
      swatch.className = 'blobio-background-color-swatch';
      const input = this.document.createElement('input');
      input.type = 'color';
      input.value = current[key];
      input.className = 'blobio-background-color-input';
      input.setAttribute('aria-label', ariaLabel);
      wheel.append(swatch, input);
      label.append(caption, wheel);
      colors.push({ key, label, input, swatch });
    }

    const sync = (settings = readFriendMinimapSettings(this.storage)) => {
      for (const { key, input, swatch } of colors) {
        input.value = settings[key];
        swatch.style.backgroundColor = settings[key];
      }
      modeButton.classList.toggle('is-gradient', settings.mode === 'bracket');
      modeButton.setAttribute('aria-label', `Friend minimap name mode: ${settings.mode === 'bracket' ? 'Bracket' : 'Normal'}. Click to switch.`);
      nameModeButton.classList.toggle('is-gradient', settings.nameMode === 'onlyProfile');
      nameModeButton.setAttribute('aria-label', `Friend minimap names: ${settings.nameMode === 'onlyProfile' ? 'OnlyProfile' : 'Both'}. Click to switch.`);
    };
    let colorDraft = null;
    let colorKey = null;
    const drag = createSettingsDrag(this.document.defaultView || globalThis, () => {
      sync(colorDraft);
      refreshRuntime(colorDraft);
    }, () => {
      save({ [colorKey]: colorDraft[colorKey] });
      colorDraft = null;
      colorKey = null;
    });
    this.addSettingsListener(modeButton, 'click', () => {
      drag.flush();
      const mode = readFriendMinimapSettings(this.storage).mode === 'normal' ? 'bracket' : 'normal';
      sync(save({ mode }));
    });
    this.addSettingsListener(nameModeButton, 'click', () => {
      drag.flush();
      const nameMode = readFriendMinimapSettings(this.storage).nameMode === 'both' ? 'onlyProfile' : 'both';
      sync(save({ nameMode }));
    });
    for (const { key, input } of colors) {
      this.addSettingsListener(input, 'input', () => {
        if (colorKey !== key) drag.flush();
        colorKey = key;
        colorDraft = { ...readFriendMinimapSettings(this.storage), [key]: input.value };
        drag.schedule();
      });
      this.addSettingsListener(input, 'change', () => drag.flush());
      this.addSettingsListener(input, 'blur', () => drag.flush());
    }
    sync(current);
    controls.append(modesTitle, modeRow, nameModeRow, colorsTitle, ...colors.map(({ label }) => label));
    menu.append(minimapName, controls);

    const api = {
      setOpen: (open) => {
        if (!open) {
          drag.flush();
        }
        animateDisclosure(menu, open);
        arrowButton.setAttribute('aria-expanded', String(open));
        disclosure.textContent = open ? '-' : '+';
        group.classList.toggle('is-open', open);
      },
      flush: drag.flush,
      sync,
    };
    this.friendHighlightSettingsUi = api;
    this.addSettingsListener(arrowButton, 'click', (event) => {
      event.preventDefault?.();
      event.stopPropagation?.();
      const open = menu.hidden !== false;
      if (open) {
        this.closeExtensionSettingMenus(api);
      }
      api.setOpen(open);
    });

    group.append(main, menu);
    return group;
  }

  createClanTextSettingsGroup() {
    const group = this.document.createElement('div');
    group.classList.add('grid-item', 'blobio-extension-setting-group', 'blobio-extension-clan-text-group');
    group.setAttribute('_ngcontent-c3', '');

    const current = readClanTextSettings(this.storage);
    const main = this.createClanTextHeaderRow(current.enabled);

    const menu = this.document.createElement('div');
    menu.classList.add('blobio-clan-text-button-menu');
    menu.hidden = true;
    menu.setAttribute('_ngcontent-c3', '');

    const profile = this.createClanTextCheckboxRow({
      id: 'config-switch-clan-text-profile',
      label: 'Show behind Profile name',
      checked: current.showProfileName,
      onChange: (enabled) => {
        const next = saveClanTextSettings(this.storage, {
          ...readClanTextSettings(this.storage),
          showProfileName: enabled,
        });
        this.syncClanTextSettingsGroup(group, next);
        this.refreshClanTextFeatures();
      },
    });

    const inGame = this.createClanTextCheckboxRow({
      id: 'config-switch-clan-text-ingame',
      label: 'Show In-game clan tags',
      checked: current.showInGameTags,
      onChange: (enabled) => {
        const next = saveClanTextSettings(this.storage, {
          ...readClanTextSettings(this.storage),
          showInGameTags: enabled,
        });
        this.syncClanTextSettingsGroup(group, next);
        this.refreshClanTextFeatures();
      },
    });

    const cellTags = this.createClanTextCheckboxRow({
      id: 'config-switch-clan-text-cell',
      label: 'Cell Clan Tag',
      checked: current.showCellTags,
      onChange: (enabled) => {
        const next = saveClanTextSettings(this.storage, {
          ...readClanTextSettings(this.storage),
          showCellTags: enabled,
        });
        this.syncClanTextSettingsGroup(group, next);
        this.refreshClanTextFeatures();
      },
    });

    const arrowButton = main.querySelector?.('.blobio-clan-text-dropdown-button');
    const disclosure = main.querySelector?.('.blobio-clan-text-dropdown-symbol');
    const api = {
      setOpen: (open) => {
        animateDisclosure(menu, open);
        arrowButton?.setAttribute?.('aria-expanded', String(open));
        if (disclosure) {
          disclosure.textContent = open ? '-' : '+';
        }
        group.classList.toggle('is-open', open);
      },
    };
    this.clanTextSettingsUi = api;

    this.addSettingsListener(arrowButton, 'click', (event) => {
      event.preventDefault?.();
      event.stopPropagation?.();
      const open = menu.hidden !== false;
      if (open) {
        this.closeExtensionSettingMenus(api);
      }
      api.setOpen(open);
    });

    menu.append(profile, inGame, cellTags);
    group.append(main, menu);
    this.syncClanTextSettingsGroup(group, current);
    return group;
  }

  createClanTextCheckboxRow({ id, label, checked, onChange }) {
    const row = this.document.createElement('label');
    row.classList.add('blobio-clan-text-checkbox-row');
    row.setAttribute('_ngcontent-c3', '');

    const input = this.document.createElement('input');
    input.id = id;
    input.type = 'checkbox';
    input.checked = checked;
    input.classList.add('blobio-clan-text-checkbox-input');
    input.setAttribute('_ngcontent-c3', '');

    const text = this.document.createElement('span');
    text.textContent = label;

    row.append(input, text);
    this.addSettingsListener(input, 'change', () => {
      onChange(Boolean(input.checked), input);
    });
    return row;
  }

  createClanTextHeaderRow(checked) {
    const row = this.document.createElement('div');
    row.classList.add('grid-item', 'blobio-extension-setting-row', 'blobio-clan-text-main-row');
    row.dataset.blobioTooltip = EXTENSION_OPTION_TOOLTIPS.clanText;
    row.setAttribute('_ngcontent-c3', '');

    const switchLabel = this.document.createElement('label');
    switchLabel.classList.add('switch');
    switchLabel.setAttribute('_ngcontent-c3', '');

    const checkbox = this.document.createElement('input');
    checkbox.id = 'config-switch-clan-text';
    checkbox.type = 'checkbox';
    checkbox.checked = checked;
    checkbox.classList.add('ng-untouched', 'ng-pristine', 'ng-valid');
    checkbox.setAttribute('_ngcontent-c3', '');

    const slider = this.document.createElement('span');
    slider.classList.add('slider');
    slider.setAttribute('_ngcontent-c3', '');
    switchLabel.append(checkbox, slider);

    const textLabel = this.document.createElement('label');
    textLabel.setAttribute('for', checkbox.id);
    textLabel.setAttribute('_ngcontent-c3', '');
    textLabel.textContent = 'Clan-Text';

    const arrowButton = this.document.createElement('button');
    arrowButton.type = 'button';
    arrowButton.classList.add('blobio-clan-text-dropdown-button');
    arrowButton.setAttribute('aria-label', 'Open Clan-Text settings');
    arrowButton.setAttribute('aria-expanded', 'false');
    arrowButton.setAttribute('_ngcontent-c3', '');

    const disclosure = this.document.createElement('span');
    disclosure.classList.add('blobio-clan-text-dropdown-symbol');
    disclosure.setAttribute('aria-hidden', 'true');
    disclosure.textContent = '+';
    arrowButton.appendChild(disclosure);

    row.append(switchLabel, textLabel, arrowButton);
    this.addSettingsListener(checkbox, 'change', () => {
      const next = saveClanTextSettings(this.storage, {
        ...readClanTextSettings(this.storage),
        enabled: Boolean(checkbox.checked),
      });
      this.syncClanTextSettingsGroup(row.parentNode || row, next);
      this.refreshClanTextFeatures();
    });
    this.addSettingsListener(row, 'mouseenter', (event) => this.showExtensionTooltip(row, event));
    this.addSettingsListener(row, 'mousemove', (event) => this.moveExtensionTooltip(event));
    this.addSettingsListener(row, 'mouseleave', () => this.hideExtensionTooltip());
    return row;
  }

  syncClanTextSettingsGroup(group, settings = readClanTextSettings(this.storage)) {
    const enabled = Boolean(settings.enabled);
    const main = group?.querySelector?.('#config-switch-clan-text');
    const profile = group?.querySelector?.('#config-switch-clan-text-profile');
    const inGame = group?.querySelector?.('#config-switch-clan-text-ingame');
    const cellTags = group?.querySelector?.('#config-switch-clan-text-cell');
    const menu = group?.querySelector?.('.blobio-clan-text-button-menu');

    if (main) main.checked = enabled;
    if (profile) {
      profile.checked = Boolean(settings.showProfileName);
      profile.disabled = !enabled;
    }
    if (inGame) {
      inGame.checked = Boolean(settings.showInGameTags);
      inGame.disabled = !enabled;
    }
    if (cellTags) {
      cellTags.checked = Boolean(settings.showCellTags);
      cellTags.disabled = !enabled;
    }
    menu?.classList.toggle('is-disabled', !enabled);
  }

  refreshClanTextFeatures() {
    const win = this.document.defaultView || globalThis;
    win.__blobioProfileClanTextRefresh?.();
    win.__blobioChatRoleRefresh?.();
    win.__blobioCellClanTagRefresh?.();
  }

  setFpsSaverSetting(changes) {
    this.fpsSaverSettingsUi?.drag.flush();
    return saveFpsSaverSettings(this.storage, {
      ...readFpsSaverSettings(this.storage, this.document),
      ...changes,
    }, this.document);
  }

  activateExtensionSettings(settings) {
    const left = settings.querySelector?.('.left');
    const extensionTab = settings.querySelector?.('.blobio-extension-settings-tab');

    for (const item of left?.querySelector?.('ul')?.children || []) {
      if (item.classList?.contains('active')) {
        item.classList.remove('active');
      }
    }

    const panel = settings.querySelector?.('.blobio-extension-settings-panel');
    if (!settings.classList.contains('blobio-extension-settings-active')) {
      settings.classList.add('blobio-extension-settings-active');
    }
    if (extensionTab && !extensionTab.classList.contains('active')) {
      extensionTab.classList.add('active');
    }
    this.activateExtensionCategory(panel, panel?.dataset?.activeCategory || EXTENSION_DEFAULT_CATEGORY);
    this.syncExtensionSettingsCheckboxes(panel);
    this.syncExtensionSettingsPanelHeight(settings);
  }

  deactivateExtensionSettings(settings) {
    if (settings.classList.contains('blobio-extension-settings-active')) {
      settings.classList.remove('blobio-extension-settings-active');
    }
    const tab = settings.querySelector?.('.blobio-extension-settings-tab');
    if (tab?.classList.contains('active')) {
      tab.classList.remove('active');
    }
  }

  syncExtensionSettingsPanelHeight(settings) {
    if (!settings?.classList?.contains('blobio-extension-settings-active')) {
      return;
    }

    const right = settings.querySelector?.('.right');
    const inner = right?.querySelector?.(':scope > .inner-container')
      || settings.querySelector?.('.right > .inner-container')
      || settings.querySelector?.('.right .inner-container');
    if (!right || !inner) {
      return;
    }

    const rightRect = right.getBoundingClientRect?.() || {};
    const innerRect = inner.getBoundingClientRect?.() || {};
    const rightHeight = Math.max(
      Number(rightRect.height) || 0,
      Number(right.clientHeight) || 0,
      Number(right.offsetHeight) || 0,
    );
    const rightBottom = Number(rightRect.bottom) || ((Number(rightRect.top) || 0) + rightHeight);
    const innerTop = Number(innerRect.top) || Number(rightRect.top) || 0;
    const availableHeight = rightBottom > innerTop
      ? rightBottom - innerTop - 8
      : rightHeight - 8;
    const fallbackHeight = Math.max(
      Number(innerRect.height) || 0,
      Number(inner.clientHeight) || 0,
      Number(inner.offsetHeight) || 0,
    );
    const height = Math.max(availableHeight, fallbackHeight);

    if (height < 100) {
      return;
    }

    this.setStyleProperty(settings, '--blobio-extension-settings-panel-height', `${Math.floor(height)}px`);
  }

  syncExtensionSettingsCheckboxes(panel) {
    if (!panel) {
      return;
    }
    const watermark = panel.querySelector?.('#config-switch-watermark');
    setCheckedIfChanged(watermark, this.isWatermarkEnabled());

    const fpsUncap = panel.querySelector?.('#config-switch-fps-uncap');
    setCheckedIfChanged(fpsUncap, isFpsUncapEnabled(this.storage));

    const fpsSaverSettings = readFpsSaverSettings(this.storage, this.document);
    const fpsSaverSwitches = {
      '#config-switch-fps-saver-lite-mode': 'liteMode',
      '#config-switch-fps-saver-no-transitions': 'noTransitions',
      '#config-switch-fps-saver-game-overlay': 'gameOverlay',
      '#config-switch-fps-saver-toast-modal-anim': 'toastModalAnim',
      '#config-switch-fps-saver-chat-guard': 'chatGuard',
    };
    for (const [selector, key] of Object.entries(fpsSaverSwitches)) {
      const checkbox = panel.querySelector?.(selector);
      setCheckedIfChanged(checkbox, fpsSaverSettings[key]);
    }

    const friendHighlight = panel.querySelector?.('#config-switch-friend-highlight');
    setCheckedIfChanged(friendHighlight, this.friendHighlightStore?.isEnabled?.());

    const friendMinimapName = panel.querySelector?.('#config-switch-friend-minimap-name');
    setCheckedIfChanged(friendMinimapName, readFriendMinimapSettings(this.storage).enabled);
    this.friendHighlightSettingsUi?.sync?.();

    const hideAdminMd = panel.querySelector?.('#config-switch-hide-admin-md');
    setCheckedIfChanged(hideAdminMd, isHideAdminMdEnabled(this.storage));

    this.jellyShaderSettingsUi?.sync?.();
    const liquidJelly = panel.querySelector?.('#config-switch-liquid-jelly');
    setCheckedIfChanged(liquidJelly, readLiquidJellySetting(this.storage));
    this.cellMassSettingsUi?.sync?.();
    this.cellRingSettingsUi?.sync?.();
    const cellBorderSync = panel.querySelector?.('#config-switch-cell-border-sync');
    setCheckedIfChanged(cellBorderSync, readCellBorderSyncSetting(this.storage));
    this.fpsSaverSettingsUi?.sync?.();
    this.syncAdminSettingVisibility(panel);
  }

  installFriendHighlightTracking() {
    if (!this.unsubscribeFriendHighlight) {
      this.unsubscribeFriendHighlight = this.friendHighlightStore?.subscribe?.(() => {
        for (const panel of this.document.querySelectorAll?.('.blobio-extension-settings-panel') || []) {
          const checkbox = panel.querySelector?.('#config-switch-friend-highlight');
          setCheckedIfChanged(checkbox, this.friendHighlightStore?.isEnabled?.());
        }
      }) || null;
    }
  }

  installAdminSettingTracking() {
    if (!this.unsubscribeAdminRoles) {
      this.unsubscribeAdminRoles = this.roleRegistry?.subscribe?.(() => this.syncAdminSettings()) || null;
    }
    if (!this.unsubscribeAdminUid) {
      this.unsubscribeAdminUid = this.uidDetector?.subscribe?.(() => this.syncAdminSettings()) || null;
    }
    this.syncAdminSettings();
  }

  syncAdminSettings() {
    for (const panel of this.document.querySelectorAll?.('.blobio-extension-settings-panel') || []) {
      this.syncExtensionSettingsCheckboxes(panel);
    }
  }

  syncAdminSettingVisibility(panel) {
    const row = panel?.querySelector?.('.blobio-admin-only-setting-row');
    if (!row) {
      return;
    }

    const visible = this.isCurrentUserAdmin();
    if (row.hidden !== !visible) {
      row.hidden = !visible;
    }
    if (visible && row.classList.contains('is-hidden')) {
      row.classList.remove('is-hidden');
    } else if (!visible && !row.classList.contains('is-hidden')) {
      row.classList.add('is-hidden');
    }
  }

  isCurrentUserAdmin() {
    const uid = this.uidDetector?.getUid?.() || '';
    return Boolean(uid && this.roleRegistry?.isAdmin?.(uid));
  }

  addSettingsListener(node, type, handler, options) {
    node.addEventListener?.(type, handler, options);
    this.settingsListeners.push({ node, type, handler, options });
  }

  cleanupCogwheels() {
    this.cogwheelObserver?.disconnect();
    this.cogwheelObserver = null;
    for (const animation of this.cogwheelAnimations.values()) {
      animation.cancel();
    }
    this.cogwheelAnimations.clear();
  }

  cleanupExtensionSettings(root = null) {
    const retainedListeners = [];
    for (const listener of this.settingsListeners) {
      const { node, type, handler, options } = listener;
      if (root && node !== root && !root.contains?.(node)) {
        retainedListeners.push(listener);
        continue;
      }
      node.removeEventListener?.(type, handler, options);
    }
    this.settingsListeners = retainedListeners;

    if (root && root !== this.extensionSettingsRoot) {
      return;
    }

    this.cleanupCogwheels();
    this.watermarkSettingsUi?.flush?.();
    this.friendHighlightSettingsUi?.flush?.();
    this.virusMotherCellSettingsUi?.destroy?.();
    this.gameBackgroundSettingsUi?.destroy?.();
    this.virusPelletColorSettingsUi?.destroy?.();
    this.cellMassSettingsUi?.destroy?.();
    this.cellRingSettingsUi?.destroy?.();
    this.jellyShaderSettingsUi?.destroy?.();
    this.fpsSaverSettingsUi?.destroy?.();
    this.virusMotherCellSettingsUi = null;
    this.gameBackgroundSettingsUi = null;
    this.virusPelletColorSettingsUi = null;
    this.cellMassSettingsUi = null;
    this.cellRingSettingsUi = null;
    this.jellyShaderSettingsUi = null;
    this.clanTextSettingsUi = null;
    this.friendHighlightSettingsUi = null;
    this.fpsSaverSettingsUi = null;
    this.watermarkSettingsUi = null;
    this.configManagerUi = null;
    this.extensionSettingsRoot = null;

    const settingsRoots = root ? [root] : Array.from(this.document.querySelectorAll?.('app-settings') || []);
    for (const settings of settingsRoots) {
      settings.classList?.remove('blobio-extension-settings-active');
      delete settings.dataset.blobioExtensionWheelListener;
    }

    const queryRoot = root || this.document;
    for (const node of queryRoot.querySelectorAll?.('.blobio-extension-settings-tab, .blobio-extension-settings-panel') || []) {
      node.remove();
    }

    this.hideExtensionTooltip();
    this.removeWatermarks();
  }

  showExtensionTooltip(row, event) {
    const text = row?.dataset?.blobioTooltip || '';
    if (!text) {
      return;
    }

    if (!this.extensionTooltip) {
      this.extensionTooltip = this.document.createElement('div');
      this.extensionTooltip.classList.add('blobio-extension-tooltip');
      this.document.body?.appendChild(this.extensionTooltip);
    }

    this.renderExtensionTooltip(text);
    this.moveExtensionTooltip(event);
  }

  renderExtensionTooltip(text) {
    return renderExtensionTooltip(this.document, this.extensionTooltip, text);
  }

  moveExtensionTooltip(event) {
    if (!this.extensionTooltip || !event) {
      return;
    }

    this.extensionTooltip.style.left = `${Number(event.clientX || 0) + 14}px`;
    this.extensionTooltip.style.top = `${Number(event.clientY || 0) + 14}px`;
  }

  hideExtensionTooltip() {
    this.extensionTooltip?.remove();
    this.extensionTooltip = null;
  }

  isWatermarkEnabled() {
    try {
      const value = this.storage?.getItem?.(WATERMARK_STORAGE_KEY);
      return value === null ? true : value === '1';
    } catch (error) {
      this.logger.warn('[Blobio] Could not read WaterMark setting.', error);
      return true;
    }
  }

  setWatermarkEnabled(enabled) {
    try {
      this.storage?.setItem?.(WATERMARK_STORAGE_KEY, enabled ? '1' : '0');
    } catch (error) {
      this.logger.warn('[Blobio] Could not save WaterMark setting.', error);
    }
  }

  syncNicknameInput(input = findNameInput(this.document)) {
    if (input === this.nicknameInput) {
      return;
    }

    if (this.nicknameInput) {
      this.nicknameInput.removeEventListener('input', this.nicknameInputHandler);
      this.nicknameInput.removeEventListener('compositionend', this.nicknameInputHandler);
      if (this.nicknameInput.getAttribute('oninput') === null && this.nicknameInput.oninput === null) {
        this.nicknameInput.setAttribute('oninput', this.nicknameInputFilter);
      }
    }

    this.nicknameInput = null;
    this.nicknameInputFilter = null;
    this.nicknameInputHandler = null;
    const filter = input?.getAttribute?.('oninput');
    if (filter !== NICKNAME_ASCII_FILTER) {
      return;
    }

    this.nicknameInput = input;
    this.nicknameInputFilter = filter;
    input.removeAttribute('oninput');
    this.nicknameInputHandler = (event) => {
      if (event.isComposing) {
        return;
      }
      // The game saves names on keyup; mouse paste and IME completion need the same update.
      const KeyboardEvent = this.document.defaultView.KeyboardEvent;
      input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Unidentified' }));
    };
    input.addEventListener('input', this.nicknameInputHandler);
    input.addEventListener('compositionend', this.nicknameInputHandler);
  }

  syncWatermark() {
    if (!this.isWatermarkEnabled()) {
      this.removeWatermarks();
      return;
    }

    const nameInput = findNameInput(this.document);
    if (!nameInput?.parentNode) {
      return;
    }

    let watermark = this.document.querySelector?.('.blobio-watermark');
    if (!watermark) {
      watermark = this.createWatermark();
    }

    const host = nameInput.parentNode;
    host.classList?.add('blobio-watermark-host');

    if (watermark.parentNode !== host) {
      host.appendChild(watermark);
    }

    this.positionWatermark(watermark, nameInput, host);
  }

  positionWatermark(watermark, nameInput, host) {
    const inputRect = this.getElementRect(nameInput);
    const hostRect = this.getElementRect(host);

    if (!inputRect || !hostRect) {
      this.setStyleProperty(watermark, '--blobio-watermark-left', '0px');
      this.setStyleProperty(watermark, '--blobio-watermark-top', '-6px');
      this.setStyleProperty(watermark, '--blobio-watermark-width', '100%');
      return;
    }

    const left = Math.round(inputRect.left - hostRect.left - WATERMARK_EXTRA_WIDTH / 2 + WATERMARK_RIGHT_NUDGE);
    const top = Math.round(inputRect.top - hostRect.top - WATERMARK_INPUT_GAP);
    const width = Math.round(inputRect.width + WATERMARK_EXTRA_WIDTH);

    this.setStyleProperty(watermark, '--blobio-watermark-left', `${left}px`);
    this.setStyleProperty(watermark, '--blobio-watermark-top', `${top}px`);
    this.setStyleProperty(watermark, '--blobio-watermark-width', `${width}px`);
  }

  getElementRect(node) {
    const rect = node?.getBoundingClientRect?.();
    if (!rect || !Number.isFinite(rect.left) || !Number.isFinite(rect.top) || !Number.isFinite(rect.width)) {
      return null;
    }

    return rect;
  }

  createWatermark() {
    const watermark = this.document.createElement('div');
    watermark.classList.add('blobio-watermark');

    const prefix = this.document.createElement('span');
    prefix.classList.add('blobio-watermark-prefix');
    prefix.textContent = 'Blob ';

    const extension = this.document.createElement('span');
    extension.classList.add('blobio-watermark-extension');
    extension.textContent = 'Extension';

    const version = this.document.createElement('span');
    version.classList.add('blobio-watermark-version');
    version.textContent = formatWatermarkVersionText(this.version, this.buildChannel);

    watermark.append(prefix, extension, version);
    return watermark;
  }

  removeWatermarks() {
    for (const watermark of this.document.querySelectorAll?.('.blobio-watermark') || []) {
      watermark.remove();
    }

    for (const host of this.document.querySelectorAll?.('.blobio-watermark-host') || []) {
      host.classList?.remove('blobio-watermark-host');
    }
  }

  togglePanel(panelName) {
    const panel = this.document.getElementById?.(`blobio-panel-${panelName}`);
    if (!panel) {
      return;
    }

    if (panelName === 'featured') {
      this.renderFeaturedPanel();
    } else if (panelName === 'socials') {
      this.renderSocialPanel();
    } else if (panelName === 'policy') {
      this.renderPolicyPanel();
    } else if (panelName === 'games') {
      this.renderGamesPanel();
    } else if (panelName === 'policy-games') {
      this.renderPolicyGamesPanel();
    }

    const willOpen = !panel.classList.contains('is-open');
    this.closePanels();

    if (!willOpen) {
      return;
    }

    panel.style.setProperty('--blobio-panel-height', `${panel.scrollHeight + 2}px`);
    panel.classList.add('is-open');
    if (panelName === 'daily-tasks') {
      this.refreshDailyTasks();
      this.dailyTaskTimer = this.document.defaultView.setInterval(() => this.refreshDailyTasks(), 60_000);
    }

    for (const button of this.getPanelButtons()) {
      if (button.dataset.panel === panelName) {
        button.classList.add('is-active');
      }
    }
  }

  closePanels() {
    this.stopDailyTasks();
    for (const panel of this.getPanels()) {
      panel.classList.remove('is-open', 'is-settled');
    }

    for (const button of this.getPanelButtons()) {
      button.classList.remove('is-active');
    }
  }

  hideOriginalSections() {
    const directSelectors = [
      '#youtube-title',
      '.youtube.hide-on-small-screen',
      'cued-overlay.ytmCuedOverlayHost',
      '.ytmCuedOverlayGradient',
      '.history-wrapper',
      '.social',
    ];

    for (const selector of directSelectors) {
      for (const node of this.document.querySelectorAll?.(selector) || []) {
        this.hideOriginalNode(node);

        const parent = node.parentElement;
        if (
          node.classList?.contains('history-wrapper') &&
          parent &&
          parent.tagName !== 'ASIDE' &&
          /updates?\s*notes?:/i.test(parent.textContent || '')
        ) {
          this.hideOriginalNode(parent);
        }
      }
    }

    for (const node of this.document.querySelectorAll?.('.aside.aside-2 h1, .aside.aside-2 h2, .aside.aside-2 h3, .aside.aside-2 h4') || []) {
      if (/updates?/i.test(node.textContent || '')) {
        this.hideOriginalNode(node);
      }
    }

    for (const node of this.document.querySelectorAll?.('aside div, aside span, aside p') || []) {
      if (/^\s*updates?\s*notes?:/i.test(node.textContent || '') && node.querySelector?.('.history-wrapper')) {
        this.hideOriginalNode(node);
      }
    }

    for (const node of getPartnerLinkContainers(this.document, (item) => this.isInsideOwnUi(item))) {
      this.hideOriginalNode(node);
    }

    for (const node of getOtherProjectContainers(this.document, (item) => this.isInsideOwnUi(item))) {
      this.hideOriginalNode(node);
    }

    for (const frame of getFailedViralFrames(this.document)) {
      this.hideOriginalNode(frame);

      const parent = frame.parentElement;
      if (parent && parent.children?.length === 1) {
        this.hideOriginalNode(parent);
      }
    }

    for (const link of getOriginalPolicyLinks(this.document, (item) => this.isInsideOwnUi(item))) {
      this.hideOriginalNode(link);
    }
  }

  hideOriginalNode(node) {
    if (this.isInsideOwnUi(node)) {
      return;
    }

    if (this.isInsideOriginalFooter(node)) {
      return;
    }

    node.classList?.add(HIDDEN_CLASS);
    this.hiddenOriginalNodes.add(node);
  }

  syncUsernameAnimation() {
    syncUsernameAnimation({
      document: this.document,
      isInsideOwnUi: (node) => this.isInsideOwnUi(node),
      clearElement: (node) => this.clearElement(node),
      setStyleProperty: (node, name, value) => this.setStyleProperty(node, name, value),
    });
  }

  setStyleProperty(node, name, value) {
    if (typeof node.style?.setProperty === 'function') {
      if (node.style.getPropertyValue?.(name) === String(value)
          && !node.style.getPropertyPriority?.(name)) {
        return;
      }
      node.style.setProperty(name, value);
      return;
    }

    if (node.style && node.style[name] !== value) {
      node.style[name] = value;
    }
  }

  isInsideOwnUi(node) {
    return Boolean(
      node &&
        (this.toolbar?.contains(node) ||
          this.policyDock?.contains(node) ||
          this.footerModalHost?.contains(node) ||
          this.isExtensionOwnedNode(node))
    );
  }

  isOwnMutation(mutation) {
    if (this.isInsideOwnUi(mutation.target)) {
      return true;
    }

    const touchedNodes = [
      ...Array.from(mutation.addedNodes || []),
      ...Array.from(mutation.removedNodes || []),
    ];

    return touchedNodes.length > 0 && touchedNodes.every((node) => this.isInsideOwnUi(node));
  }

  isExtensionOwnedNode(node) {
    let current = node?.classList ? node : node?.parentElement;

    while (current) {
      const classList = current.classList;
      if (
        classList?.contains(DEFAULT_TOOLBAR_CLASS) ||
        classList?.contains('blobio-menu-panel') ||
        classList?.contains('blobio-footer-dock') ||
        classList?.contains('blobio-footer-modal-host') ||
        classList?.contains('blobio-watermark') ||
        classList?.contains('blobio-extension-settings-tab') ||
        classList?.contains('blobio-extension-settings-panel') ||
        classList?.contains('blobio-vip-plus-slot') ||
        classList?.contains('blobio-vip-plus-icon')
      ) {
        return true;
      }

      current = current.parentElement;
    }

    return false;
  }

  isInsideOriginalFooter(node) {
    let current = node;

    while (current) {
      if (current.tagName === 'FOOTER' && current.classList?.contains('footer')) {
        return true;
      }

      current = current.parentElement;
    }

    return false;
  }

  getPanels() {
    return [
      ...Array.from(this.toolbar?.querySelectorAll('.blobio-menu-panel') || []),
      ...Array.from(this.footerModalHost?.querySelectorAll('.blobio-menu-panel') || []),
    ];
  }

  getPanelButtons() {
    return [
      ...Array.from(this.toolbar?.querySelectorAll('button') || []),
      ...Array.from(this.policyDock?.querySelectorAll('button') || []),
    ];
  }

  clearElement(element) {
    while (element.children.length > 0) {
      element.children[0].remove();
    }

    element.textContent = '';
  }
}

function setCheckedIfChanged(checkbox, checked) {
  const value = Boolean(checked);
  if (checkbox && checkbox.checked !== value) {
    checkbox.checked = value;
  }
}
