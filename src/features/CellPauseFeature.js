import { readCellPauseSettings } from '../controls/CellPauseSettings.js';
import { createBlobioStorage } from '../storage/BlobioStorage.js';

const CELL_PAUSE_STYLE_ID = 'blobio-cell-pause-style';
const CELL_PAUSE_OVERLAY_CLASS = 'blobio-cell-pause-overlay';
const CELL_PAUSE_RUNTIME_KEY = '__blobioCellPauseRuntime';
const CELL_PAUSE_STATE_KEY = '__blobioCellPauseState';
const CELL_PAUSE_RUNTIME_VERSION = '0.2.56';
const CENTER_MOVE_INTERVAL_MS = 500;
const MOVEMENT_EVENT_TYPES = ['mousemove', 'pointermove', 'touchmove'];
const MOUSE_MENU_POINTER_EVENT_TYPES = ['mousedown', 'pointerdown', 'contextmenu'];
const GAME_CANVAS_CLASS = 'blobio-background-game-canvas';
const IGNORED_CANVAS_CLASSES = new Set([
  'blobio-cell-clan-tag-overlay',
  'blobio-emote-skin-overlay',
  'hidden',
]);

const CELL_PAUSE_CSS = `
.${CELL_PAUSE_OVERLAY_CLASS} {
  position: fixed !important;
  left: 50% !important;
  top: 22% !important;
  z-index: 2147483646 !important;
  transform: translate(-50%, -50%) !important;
  padding: 8px 14px !important;
  border: 1px solid rgba(142, 255, 174, 0.88) !important;
  border-radius: 5px !important;
  background: rgba(0, 16, 8, 0.86) !important;
  color: #eaffee !important;
  font: italic 800 18px/1.2 Arial, sans-serif !important;
  text-shadow: 0 1px 0 #000, 0 0 8px rgba(132, 255, 166, 0.82), 0 0 16px rgba(79, 255, 130, 0.46) !important;
  box-shadow: 0 0 11px rgba(79, 255, 130, 0.28), inset 0 0 12px rgba(79, 255, 130, 0.16) !important;
  animation: blobio-cell-pause-glow 12s ease-in-out infinite !important;
  pointer-events: none !important;
}

@keyframes blobio-cell-pause-glow {
  0%,
  100% {
    border-color: rgba(142, 255, 174, 0.58);
    box-shadow: 0 0 8px rgba(79, 255, 130, 0.18), inset 0 0 10px rgba(79, 255, 130, 0.1);
    text-shadow: 0 1px 0 #000, 0 0 7px rgba(132, 255, 166, 0.62), 0 0 14px rgba(79, 255, 130, 0.32);
  }

  25% {
    border-color: rgba(221, 255, 230, 0.98);
    box-shadow: 0 0 18px rgba(79, 255, 130, 0.62), 0 0 32px rgba(79, 255, 130, 0.34), inset 0 0 16px rgba(79, 255, 130, 0.22);
    text-shadow: 0 1px 0 #000, 0 0 12px rgba(225, 255, 233, 0.9), 0 0 24px rgba(79, 255, 130, 0.68);
  }

  41.666% {
    border-color: rgba(221, 255, 230, 0.98);
    box-shadow: 0 0 18px rgba(79, 255, 130, 0.62), 0 0 32px rgba(79, 255, 130, 0.34), inset 0 0 16px rgba(79, 255, 130, 0.22);
    text-shadow: 0 1px 0 #000, 0 0 12px rgba(225, 255, 233, 0.9), 0 0 24px rgba(79, 255, 130, 0.68);
  }

  66.666% {
    border-color: rgba(142, 255, 174, 0.58);
    box-shadow: 0 0 8px rgba(79, 255, 130, 0.18), inset 0 0 10px rgba(79, 255, 130, 0.1);
    text-shadow: 0 1px 0 #000, 0 0 7px rgba(132, 255, 166, 0.62), 0 0 14px rgba(79, 255, 130, 0.32);
  }
}
`;

function isEditableTarget(target) {
  if (!target) {
    return false;
  }

  const tag = String(target.tagName || '').toLowerCase();
  return target.isContentEditable
    || tag === 'input'
    || tag === 'textarea'
    || tag === 'select'
    || Boolean(target.closest?.('[contenteditable="true"], .blobio-chat-settings-root.is-open, #chat input, #message'));
}

export class CellPauseFeature {
  constructor({
    document = globalThis.document,
    storage = createBlobioStorage(document),
    logger = console,
  } = {}) {
    this.document = document;
    this.storage = storage;
    this.logger = logger;
    this.settings = readCellPauseSettings(storage);
    this.styleNode = null;
    this.overlay = null;
    this.keydownHandler = null;
    this.pointerBlocker = null;
    this.mouseMenuPointerHandler = null;
    this.pointerBlockerTargets = [];
    this.viewportChangeHandler = null;
    this.movementRuntime = null;
    this.centerTimer = null;
    this.paused = false;
    this.started = false;
    this.stats = {
      toggles: 0,
      centerMoves: 0,
      blockedMoves: 0,
      lastReason: 'not-started',
    };
  }

  start() {
    if (this.started || !this.document?.documentElement) {
      return Boolean(this.started);
    }

    this.started = true;
    this.movementRuntime = this.ensureMovementRuntime();
    this.ensureStyle();
    this.installKeyboard();
    this.installPointerBlocker();
    this.installMouseMenuPointerSync();
    this.installViewportChangeHandler();
    this.installRefreshBridge();
    this.installDebug();
    this.stats.lastReason = 'installed';
    return true;
  }

  ensureStyle() {
    const existing = this.document.getElementById?.(CELL_PAUSE_STYLE_ID);
    if (existing) {
      existing.textContent = CELL_PAUSE_CSS;
      this.styleNode = existing;
      return;
    }

    const style = this.document.createElement('style');
    style.id = CELL_PAUSE_STYLE_ID;
    style.textContent = CELL_PAUSE_CSS;
    (this.document.head || this.document.documentElement).appendChild(style);
    this.styleNode = style;
  }

  installKeyboard() {
    this.keydownHandler = (event) => this.handleKeydown(event);
    this.document.addEventListener?.('keydown', this.keydownHandler, true);
  }

  handleKeydown(event) {
    if (!this.settings.enabled || !this.settings.keyCode || event.repeat) {
      return;
    }
    if (event.code !== this.settings.keyCode || isEditableTarget(event.target) || this.isMenuOpen()) {
      return;
    }

    event.preventDefault?.();
    event.stopImmediatePropagation?.();
    event.stopPropagation?.();
    this.setPaused(!this.paused, 'hotkey');
  }

  isMenuOpen() {
    return Boolean(
      this.document.querySelector?.('.blobio-chat-settings-root.is-open')
        || this.document.querySelector?.('.modal.show, .modal.is-open, .popup.is-open, .dialog.is-open'),
    );
  }

  installPointerBlocker() {
    this.pointerBlocker = (event) => {
      if (!this.paused || event.__blobioCellPauseSynthetic) {
        return;
      }

      this.movementRuntime?.shouldBlockEvent?.(event);
      this.stats.blockedMoves += 1;
      event.preventDefault?.();
      event.stopImmediatePropagation?.();
      event.stopPropagation?.();
    };

    const win = this.document.defaultView || globalThis;
    for (const target of [
      win,
      this.document,
      this.document.documentElement,
      this.document.body,
      ...Array.from(this.document.querySelectorAll?.('canvas') || []),
    ]) {
      this.addPointerBlockerTarget(target);
    }
  }

  addPointerBlockerTarget(target) {
    if (!target || !this.pointerBlocker || this.pointerBlockerTargets.includes(target)) {
      return false;
    }

    this.pointerBlockerTargets.push(target);
    for (const type of MOVEMENT_EVENT_TYPES) {
      target.addEventListener?.(type, this.pointerBlocker, true);
    }
    return true;
  }

  installRefreshBridge() {
    const win = this.document.defaultView || globalThis;
    win.__blobioCellPauseRefresh = (settings) => {
      this.settings = settings || readCellPauseSettings(this.storage);
      if ((!this.settings.enabled || !this.settings.keyCode) && this.paused) {
        this.setPaused(false, 'settings-disabled');
      }
      return { ...this.settings };
    };
  }

  installDebug() {
    const win = this.document.defaultView || globalThis;
    win.__blobCellPauseDebug = () => ({
      installed: this.started,
      enabled: this.settings.enabled,
      keyCode: this.settings.keyCode,
      paused: this.paused,
      canvasFound: Boolean(this.findGameCanvas()),
      overlayVisible: Boolean(this.overlay?.parentNode),
      movementGate: this.getMovementRuntime()?.debug?.() || null,
      ...this.stats,
    });
  }

  getMovementRuntime() {
    const win = this.document.defaultView || globalThis;
    return win[CELL_PAUSE_RUNTIME_KEY] || globalThis[CELL_PAUSE_RUNTIME_KEY] || null;
  }

  ensureMovementRuntime() {
    const existing = this.getMovementRuntime();
    if (existing) {
      const win = this.document.defaultView || globalThis;
      const state = existing.state || win[CELL_PAUSE_STATE_KEY] || globalThis[CELL_PAUSE_STATE_KEY] || {
        installed: true,
        source: 'feature',
        paused: false,
        blockedEvents: 0,
        lastReason: 'feature-gate-installed',
      };
      this.upgradeMovementRuntime(existing, state);
      try {
        win[CELL_PAUSE_STATE_KEY] = state;
        win[CELL_PAUSE_RUNTIME_KEY] = existing;
        globalThis[CELL_PAUSE_STATE_KEY] = state;
        globalThis[CELL_PAUSE_RUNTIME_KEY] = existing;
      } catch {}
      return existing;
    }

    const win = this.document.defaultView || globalThis;
    const state = win[CELL_PAUSE_STATE_KEY] || {
      installed: true,
      source: 'feature',
      paused: false,
      blockedEvents: 0,
      targetWrites: 0,
      targetMisses: 0,
      inputTargetHits: 0,
      lastReason: 'feature-gate-installed',
    };
    const runtime = {
      state,
      setPaused(paused, reason = 'feature') {
        state.paused = Boolean(paused);
        state.lastReason = reason;
        return state.paused;
      },
      isPaused() {
        return Boolean(state.paused);
      },
      shouldBlockEvent(event) {
        if (!state.paused || event?.__blobioCellPauseSynthetic) {
          return false;
        }

        state.blockedEvents += 1;
        state.lastReason = 'blocked-movement';
        return true;
      },
    };
    this.upgradeMovementRuntime(runtime, state);

    try {
      win[CELL_PAUSE_STATE_KEY] = state;
      win[CELL_PAUSE_RUNTIME_KEY] = runtime;
      globalThis[CELL_PAUSE_STATE_KEY] = state;
      globalThis[CELL_PAUSE_RUNTIME_KEY] = runtime;
    } catch {}

    return runtime;
  }

  installMouseMenuPointerSync() {
    this.mouseMenuPointerHandler = (event) => this.rememberMouseMenuPointer(event);
    for (const type of MOUSE_MENU_POINTER_EVENT_TYPES) {
      this.document.addEventListener?.(type, this.mouseMenuPointerHandler, true);
    }
  }

  rememberMouseMenuPointer(event) {
    if (!this.paused || !event) {
      return false;
    }
    if (event.type !== 'contextmenu' && Number(event.button) !== 2) {
      return false;
    }

    const win = this.document.defaultView || globalThis;
    const docElement = this.document.documentElement || {};
    const body = this.document.body || {};
    const scrollX = Number(win.pageXOffset) || Number(docElement.scrollLeft) || Number(body.scrollLeft) || 0;
    const scrollY = Number(win.pageYOffset) || Number(docElement.scrollTop) || Number(body.scrollTop) || 0;
    const pageX = Number.isFinite(Number(event.pageX)) ? Number(event.pageX) : (Number(event.clientX) || 0) + scrollX;
    const pageY = Number.isFinite(Number(event.pageY)) ? Number(event.pageY) : (Number(event.clientY) || 0) + scrollY;

    win.mouseX = pageX;
    win.mouseY = pageY;
    this.stats.lastMenuPointer = {
      x: pageX,
      y: pageY,
      reason: event.type,
    };
    return true;
  }

  installViewportChangeHandler() {
    const win = this.document.defaultView || globalThis;
    this.viewportChangeHandler = () => {
      if (!this.paused) {
        return;
      }
      this.sendCenterMove('viewport-change');
    };
    win.addEventListener?.('resize', this.viewportChangeHandler, true);
    this.document.addEventListener?.('fullscreenchange', this.viewportChangeHandler, true);
  }

  upgradeMovementRuntime(runtime, state) {
    if (!runtime || !state) {
      return runtime;
    }

    runtime.state = state;
    state.installed = true;
    state.targetWrites = Number(state.targetWrites) || 0;
    state.targetMisses = Number(state.targetMisses) || 0;
    state.inputTargetHits = Number(state.inputTargetHits) || 0;
    state.blockedEvents = Number(state.blockedEvents) || 0;

    if (runtime.__blobioCellPauseApiVersion === CELL_PAUSE_RUNTIME_VERSION) {
      return runtime;
    }

    runtime.registerGameCanvas = (canvas) => {
      if (!canvas || String(canvas.tagName || '').toUpperCase() !== 'CANVAS') {
        return false;
      }

      runtime.__blobioCellPauseCanvas = canvas;
      state.canvasRegistered = true;
      return true;
    };

    runtime.registerGameInputTarget = (inputTarget) => {
      if (!inputTarget || typeof inputTarget !== 'object') {
        return false;
      }

      runtime.__blobioCellPauseInputTarget = inputTarget;
      state.inputTargetSeen = true;
      return true;
    };

    runtime.getTarget = () => {
      const canvas = runtime.__blobioCellPauseCanvas;
      if (!canvas || canvas.isConnected === false) {
        state.targetMisses += 1;
        state.lastReason = 'canvas-target-missing';
        return null;
      }

      const rect = canvas.getBoundingClientRect?.();
      const width = Number(rect?.width) || Number(canvas.clientWidth) || Number(canvas.width) || 0;
      const height = Number(rect?.height) || Number(canvas.clientHeight) || Number(canvas.height) || 0;
      if (width <= 0 || height <= 0) {
        state.targetMisses += 1;
        state.lastReason = 'canvas-target-empty';
        return null;
      }

      return {
        x: width / 2,
        y: height / 2,
        source: 'canvas-center',
      };
    };

    runtime.forceTarget = (reason = 'force-target') => {
      const inputTarget = runtime.__blobioCellPauseInputTarget;
      if (!state.paused) {
        state.lastReason = 'target-not-paused';
        return false;
      }
      if (!inputTarget) {
        state.lastReason = 'input-target-missing';
        return false;
      }

      const target = runtime.getTarget();
      if (!target) {
        return false;
      }

      inputTarget.d = target.x;
      inputTarget.e = target.y;
      state.targetWrites += 1;
      state.lastTarget = { ...target, reason };
      state.lastReason = reason;
      return true;
    };

    runtime.applyGameInputTarget = (inputTarget, x, y) => {
      runtime.registerGameInputTarget(inputTarget);
      state.lastNativeTarget = {
        x: Number(x) || 0,
        y: Number(y) || 0,
      };
      if (!state.paused) {
        return null;
      }

      const target = runtime.getTarget();
      if (!target) {
        return null;
      }

      state.inputTargetHits += 1;
      state.targetWrites += 1;
      state.lastTarget = { ...target, reason: 'game-input-patch' };
      state.lastReason = 'game-input-patch';
      return target;
    };

    runtime.debug = () => ({
      ...state,
      canvasRegistered: Boolean(runtime.__blobioCellPauseCanvas),
      canvasConnected: runtime.__blobioCellPauseCanvas?.isConnected !== false,
      inputTargetSeen: Boolean(runtime.__blobioCellPauseInputTarget),
      apiVersion: CELL_PAUSE_RUNTIME_VERSION,
    });

    runtime.__blobioCellPauseApiVersion = CELL_PAUSE_RUNTIME_VERSION;
    return runtime;
  }

  syncMovementRuntime(paused, reason) {
    this.movementRuntime = this.ensureMovementRuntime();
    this.movementRuntime?.setPaused?.(paused, reason);
  }

  setPaused(paused, reason) {
    const next = Boolean(paused);
    this.syncMovementRuntime(next, reason);
    if (this.paused === next) {
      return;
    }

    this.paused = next;
    this.stats.toggles += 1;
    this.stats.lastReason = reason;
    if (this.paused) {
      this.showOverlay();
      this.startCenterLoop();
    } else {
      this.hideOverlay();
      this.stopCenterLoop();
    }
  }

  showOverlay() {
    if (!this.overlay) {
      this.overlay = this.document.createElement('div');
      this.overlay.classList.add(CELL_PAUSE_OVERLAY_CLASS);
      this.overlay.textContent = 'Cell movement Paused!';
    }

    if (!this.overlay.parentNode) {
      (this.document.body || this.document.documentElement).appendChild(this.overlay);
    }
  }

  hideOverlay() {
    this.overlay?.remove?.();
  }

  startCenterLoop() {
    this.stopCenterLoop();
    this.sendCenterMove('pause-start');
    const win = this.document.defaultView || globalThis;
    this.centerTimer = win.setInterval?.(() => this.sendCenterMove('pause-loop'), CENTER_MOVE_INTERVAL_MS) ?? null;
  }

  stopCenterLoop() {
    if (this.centerTimer === null) {
      return;
    }

    const win = this.document.defaultView || globalThis;
    win.clearInterval?.(this.centerTimer);
    this.centerTimer = null;
  }

  sendCenterMove(reason) {
    const canvas = this.findGameCanvas();
    const rect = canvas?.getBoundingClientRect?.();
    if (!canvas || !rect || rect.width < 20 || rect.height < 20) {
      this.stats.lastReason = 'canvas-missing';
      return false;
    }

    this.movementRuntime?.registerGameCanvas?.(canvas);
    this.movementRuntime?.forceTarget?.(reason);
    const clientX = rect.left + rect.width / 2;
    const clientY = rect.top + rect.height / 2;
    this.addPointerBlockerTarget(canvas);
    this.dispatchMove(canvas, 'mousemove', clientX, clientY);
    this.dispatchMove(canvas, 'pointermove', clientX, clientY);
    this.stats.centerMoves += 1;
    this.stats.lastReason = reason;
    return true;
  }

  dispatchMove(target, type, clientX, clientY) {
    const win = this.document.defaultView || globalThis;
    const EventCtor = type === 'pointermove' && typeof win.PointerEvent === 'function'
      ? win.PointerEvent
      : win.MouseEvent;
    if (typeof EventCtor !== 'function' || !target?.dispatchEvent) {
      return;
    }

    const event = new EventCtor(type, {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      screenX: clientX,
      screenY: clientY,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
    });
    event.__blobioCellPauseSynthetic = true;
    target.dispatchEvent(event);
  }

  findGameCanvas() {
    let best = null;
    let bestArea = 0;
    let fallback = null;
    let fallbackArea = 0;

    for (const canvas of this.document.querySelectorAll?.('canvas') || []) {
      if (this.shouldIgnoreCanvas(canvas)) {
        continue;
      }
      const rect = canvas.getBoundingClientRect?.();
      const area = Math.max(0, Number(rect?.width) || 0) * Math.max(0, Number(rect?.height) || 0);
      if (area < 160000) {
        continue;
      }
      if (this.canvasHasClass(canvas, GAME_CANVAS_CLASS) && area > bestArea) {
        best = canvas;
        bestArea = area;
      }
      if (area > fallbackArea) {
        fallback = canvas;
        fallbackArea = area;
      }
    }

    const canvas = best || fallback;
    if (canvas) {
      this.movementRuntime?.registerGameCanvas?.(canvas);
    }

    return canvas;
  }

  shouldIgnoreCanvas(canvas) {
    if (!canvas || String(canvas.tagName || '').toUpperCase() !== 'CANVAS') {
      return true;
    }
    if (canvas.id === 'pie-chart') {
      return true;
    }
    for (const className of IGNORED_CANVAS_CLASSES) {
      if (this.canvasHasClass(canvas, className)) {
        return true;
      }
    }
    const rect = canvas.getBoundingClientRect?.();
    const width = Math.max(0, Number(rect?.width) || Number(canvas.clientWidth) || 0);
    const height = Math.max(0, Number(rect?.height) || Number(canvas.clientHeight) || 0);
    return width < 20 || height < 20;
  }

  canvasHasClass(canvas, className) {
    return Boolean(canvas?.classList?.contains?.(className)
      || String(canvas?.className || '').split(/\s+/).includes(className));
  }

  destroy() {
    const win = this.document.defaultView || globalThis;
    this.setPaused(false, 'destroy');
    if (this.keydownHandler) {
      this.document.removeEventListener?.('keydown', this.keydownHandler, true);
      this.keydownHandler = null;
    }
    if (this.pointerBlocker) {
      for (const type of MOVEMENT_EVENT_TYPES) {
        for (const target of this.pointerBlockerTargets) {
          target.removeEventListener?.(type, this.pointerBlocker, true);
        }
      }
      this.pointerBlocker = null;
      this.pointerBlockerTargets = [];
    }
    if (this.mouseMenuPointerHandler) {
      for (const type of MOUSE_MENU_POINTER_EVENT_TYPES) {
        this.document.removeEventListener?.(type, this.mouseMenuPointerHandler, true);
      }
      this.mouseMenuPointerHandler = null;
    }
    if (this.viewportChangeHandler) {
      win.removeEventListener?.('resize', this.viewportChangeHandler, true);
      this.document.removeEventListener?.('fullscreenchange', this.viewportChangeHandler, true);
      this.viewportChangeHandler = null;
    }

    this.syncMovementRuntime(false, 'destroy');
    try { delete win.__blobioCellPauseRefresh; } catch {}
    try { delete win.__blobCellPauseDebug; } catch {}
    this.overlay?.remove?.();
    this.overlay = null;
    this.styleNode?.remove();
    this.styleNode = null;
    this.started = false;
  }
}
