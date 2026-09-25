import { createBlobioStorage } from '../storage/BlobioStorage.js';
import { KEYSTROKE_HUD_CSS, KEYSTROKE_HUD_STYLE_ID } from '../css/KeystrokeHudStyles.js';
import {
  KEYSTROKE_ACTIONS, KEYSTROKE_COLORS, KEYSTROKE_HUD_KEY, keystrokeKeyLabel,
  normalizeKeystrokeHudSettings, readKeystrokeBindings, readKeystrokeHudSettings,
  saveKeystrokeHudSettings,
} from '../settings/KeystrokeHudSettings.js';

export class KeystrokeHudFeature {
  constructor({ document = globalThis.document, storage = createBlobioStorage(document) } = {}) {
    this.document = document;
    this.win = document.defaultView || globalThis;
    this.storage = storage;
    this.settings = readKeystrokeHudSettings(storage);
    this.root = null;
    this.canvas = null;
    this.keys = [];
    this.bindings = [];
    this.frame = null;
    this.drag = null;
    this.resizeObserver = null;
    this.pageObserver = null;
    this.handlers = {
      keydown: event => this.handleKey(event, true),
      keyup: event => this.handleKey(event, false),
      blur: () => { this.clearPressed(); this.finishDrag(); },
      focus: () => { this.refreshBindings(); this.scheduleLayout(); },
      resize: () => this.scheduleLayout(),
      storage: event => {
        if (event.key === null || event.key === KEYSTROKE_HUD_KEY) this.refresh();
        if (event.key === null || KEYSTROKE_ACTIONS.some(action => action.key === event.key)) this.refreshBindings();
      },
    };
    this.onVisibility = () => { if (this.document.hidden) { this.clearPressed(); this.finishDrag(); } };
    this.onPointerDown = event => this.beginDrag(event);
    this.onPointerMove = event => {
      if (!this.drag || event.pointerId !== this.drag.pointerId) return;
      this.drag.x = event.clientX - this.drag.grabX;
      this.drag.y = event.clientY - this.drag.grabY;
      event.stopPropagation();
      this.scheduleLayout();
    };
    this.onPointerUp = event => {
      if (this.drag && event.pointerId === this.drag.pointerId) {
        event.stopPropagation();
        this.finishDrag();
      }
    };
  }

  start() {
    if (this.root) return true;
    this.styleNode = this.document.createElement('style');
    this.styleNode.id = KEYSTROKE_HUD_STYLE_ID;
    this.styleNode.textContent = KEYSTROKE_HUD_CSS;
    this.document.head.appendChild(this.styleNode);
    this.root = this.document.createElement('div');
    this.root.className = 'blobio-keystroke-hud';
    this.root.setAttribute('aria-label', 'Keystroke HUD');
    this.keys = KEYSTROKE_ACTIONS.map(action => {
      const tile = this.document.createElement('div');
      tile.className = 'blobio-keystroke-key';
      const key = this.document.createElement('kbd');
      const label = this.document.createElement('span');
      label.textContent = action.label;
      tile.append(key, label);
      this.root.appendChild(tile);
      return { tile, key };
    });
    this.document.body.appendChild(this.root);
    for (const [type, handler] of Object.entries(this.handlers)) this.win.addEventListener(type, handler, true);
    this.document.addEventListener('visibilitychange', this.onVisibility);
    this.root.addEventListener('pointerdown', this.onPointerDown);
    this.root.addEventListener('pointermove', this.onPointerMove);
    this.root.addEventListener('pointerup', this.onPointerUp);
    this.root.addEventListener('pointercancel', this.onPointerUp);
    this.root.addEventListener('lostpointercapture', this.onPointerUp);
    this.resizeObserver = new this.win.ResizeObserver(() => this.scheduleLayout());
    this.pageObserver = new this.win.MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeName === 'CANVAS' || node.querySelector?.('canvas')) {
            this.attachCanvas();
            return;
          }
        }
      }
    });
    this.pageObserver.observe(this.document.body, { childList: true, subtree: true });
    this.attachCanvas();
    this.refreshBindings();
    this.refresh();
    return true;
  }

  attachCanvas() {
    const canvas = this.document.querySelector('canvas.blobio-background-game-canvas, canvas:not(.hidden)');
    if (canvas === this.canvas) return;
    this.resizeObserver.disconnect();
    this.canvas = canvas;
    if (canvas) this.resizeObserver.observe(canvas);
    this.scheduleLayout();
  }

  refresh(settings = readKeystrokeHudSettings(this.storage)) {
    if (this.drag) {
      this.finishDrag();
      settings = { ...settings, x: this.settings.x, y: this.settings.y };
    }
    this.settings = normalizeKeystrokeHudSettings(settings);
    if (!this.root) return;
    for (const name of Object.keys(KEYSTROKE_COLORS)) {
      const { color, alpha } = this.settings[name];
      this.root.style.setProperty(`--blobio-keystroke-${name}`, `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`);
    }
    this.root.style.backdropFilter = this.settings.blur.enabled ? `blur(${this.settings.blur.value}px)` : 'none';
    this.root.classList.toggle('is-editing', this.settings.positionEditor);
    this.root.classList.toggle('is-vertical', this.settings.layout === 'vertical');
    if (!this.settings.enabled) this.clearPressed();
    this.layout();
  }

  refreshBindings() {
    this.bindings = readKeystrokeBindings(this.storage);
    this.clearPressed();
    this.keys.forEach(({ key }, index) => { key.textContent = keystrokeKeyLabel(this.bindings[index]); });
  }

  handleKey(event, pressed) {
    if (pressed && event.key === 'Escape' && this.settings.positionEditor) {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.finishDrag();
      this.refresh(saveKeystrokeHudSettings(this.storage, { positionEditor: false }));
      this.win.dispatchEvent(new this.win.Event('blobio-keystroke-editor-change'));
      return;
    }
    if (!this.settings.enabled || !this.root || this.root.hidden || pressed && event.repeat) return;
    if (pressed && (this.document.hidden || event.defaultPrevented
        || event.target?.closest?.('input, textarea, select, button, [contenteditable]:not([contenteditable="false"]), .blobio-chat-settings-root, app-settings, app-skins, .modal'))) return;
    const code = event.keyCode || event.which;
    if (!code) return;
    this.keys.forEach(({ tile }, index) => {
      if (this.bindings[index] === code) tile.classList.toggle('is-pressed', pressed);
    });
  }

  clearPressed() {
    for (const { tile } of this.keys) tile.classList.remove('is-pressed');
  }

  scheduleLayout() {
    if (this.frame !== null || !this.root) return;
    this.frame = this.win.requestAnimationFrame(() => { this.frame = null; this.layout(); });
  }

  layout() {
    if (!this.root) return;
    const rect = this.canvas?.getBoundingClientRect();
    this.root.hidden = !this.settings.enabled || !rect || rect.width <= 0 || rect.height <= 0;
    if (this.root.hidden) return;
    const left = Math.max(0, rect.left) + 8;
    const top = Math.max(0, rect.top) + 8;
    const width = Math.max(0, Math.min(this.win.innerWidth, rect.right) - left - 8);
    const height = Math.max(0, Math.min(this.win.innerHeight, rect.bottom) - top - 8);
    if (width <= 0 || height <= 0) { this.root.hidden = true; return; }
    const vertical = this.settings.layout === 'vertical';
    const baseWidth = vertical ? 80 : 312;
    const baseHeight = vertical ? 312 : 80;
    const scale = Math.min(this.settings.size / 100, width / baseWidth, height / baseHeight);
    const hudWidth = baseWidth * scale;
    const hudHeight = baseHeight * scale;
    this.root.style.setProperty('--blobio-keystroke-scale', String(scale));
    const travelX = width - hudWidth;
    const travelY = height - hudHeight;
    const x = Math.max(left, Math.min(left + travelX, this.drag ? this.drag.x : left + travelX * this.settings.x));
    const y = Math.max(top, Math.min(top + travelY, this.drag ? this.drag.y : top + travelY * this.settings.y));
    this.root.style.width = `${hudWidth}px`;
    this.root.style.height = `${hudHeight}px`;
    this.root.style.left = `${x}px`;
    this.root.style.top = `${y}px`;
    if (this.drag) {
      this.settings.x = travelX > 0 ? (x - left) / travelX : 0;
      this.settings.y = travelY > 0 ? (y - top) / travelY : 0;
    }
  }

  beginDrag(event) {
    if (!this.settings.enabled || !this.settings.positionEditor || event.button !== 0) return;
    const rect = this.root.getBoundingClientRect();
    this.drag = { pointerId: event.pointerId, grabX: event.clientX - rect.left, grabY: event.clientY - rect.top,
      x: rect.left, y: rect.top };
    this.root.setPointerCapture(event.pointerId);
    this.root.classList.add('is-dragging');
    event.preventDefault();
    event.stopPropagation();
  }

  finishDrag() {
    if (!this.drag) return;
    if (this.frame !== null) { this.win.cancelAnimationFrame(this.frame); this.frame = null; }
    this.layout();
    const { pointerId } = this.drag;
    this.drag = null;
    this.root.classList.remove('is-dragging');
    if (this.root.hasPointerCapture(pointerId)) this.root.releasePointerCapture(pointerId);
    saveKeystrokeHudSettings(this.storage, { x: this.settings.x, y: this.settings.y });
  }

  destroy() {
    this.finishDrag();
    if (this.frame !== null) this.win.cancelAnimationFrame(this.frame);
    this.frame = null;
    this.resizeObserver?.disconnect();
    this.pageObserver?.disconnect();
    for (const [type, handler] of Object.entries(this.handlers)) this.win.removeEventListener(type, handler, true);
    this.document.removeEventListener('visibilitychange', this.onVisibility);
    this.root?.remove();
    this.styleNode?.remove();
    this.root = null;
    this.canvas = null;
    this.keys = [];
  }
}
