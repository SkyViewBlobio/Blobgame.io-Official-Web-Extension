import { createBlobioStorage } from '../storage/BlobioStorage.js';
import { getTampermonkeyPageWindow } from '../runtimePageWindow.js';
import { readInGameUiSettings } from '../settings/InGameUiSettings.js';
import { applyHudOutline, backgroundFill, hexToRgba } from '../ui/ColorStyles.js';
import { MINIMAP_HUD_CSS, MINIMAP_HUD_STYLE_ID } from '../css/MinimapHudStyles.js';

export class MinimapAppearanceFeature {
  constructor({ document = globalThis.document, storage = createBlobioStorage(document) } = {}) {
    this.document = document;
    this.storage = storage;
    this.win = getTampermonkeyPageWindow(document.defaultView);
    this.settings = readInGameUiSettings(storage);
    this.root = null;
    this.canvas = null;
    this.geometry = null;
    this.friends = new Map();
    this.frame = 0;
    this.minimap = null;
    this.resize = () => { this.geometry = null; };
    this.visibility = minimap => {
      this.minimap = minimap;
      const active = Boolean(minimap?.i && !minimap.s.u.b
        && (this.settings.minimapBackground.enabled || this.settings.minimapBlur.enabled));
      this.win.__blobioMinimapHudActive = active;
      if (this.root.hidden === active) this.root.hidden = !active;
    };
    this.capture = (minimap, gameState, x, y, playing, showFriends) => this.draw(minimap, gameState, x, y, playing, showFriends);
  }

  start() {
    if (this.root) return true;
    this.styleNode = this.document.createElement('style');
    this.styleNode.id = MINIMAP_HUD_STYLE_ID;
    this.styleNode.textContent = MINIMAP_HUD_CSS;
    this.document.head.appendChild(this.styleNode);
    this.root = this.document.createElement('div');
    this.root.className = 'blobio-minimap-hud';
    this.root.setAttribute('aria-label', 'Minimap');
    this.content = this.document.createElement('div');
    this.content.className = 'blobio-minimap-content';
    this.root.appendChild(this.content);
    const sectors = this.document.createElement('div');
    sectors.className = 'blobio-minimap-sectors';
    for (let row = 0; row < 5; row++) {
      for (let column = 1; column <= 5; column++) {
        const sector = this.document.createElement('span');
        sector.className = 'blobio-minimap-sector';
        sector.textContent = `${String.fromCharCode(65 + row)}${column}`;
        sectors.appendChild(sector);
      }
    }
    this.content.appendChild(sectors);
    this.self = this.createDot();
    this.document.body.appendChild(this.root);
    this.resizeObserver = new this.win.ResizeObserver(this.resize);
    this.win.addEventListener('resize', this.resize);
    this.win.addEventListener('scroll', this.resize, true);
    this.win.__blobioMinimapCapture = this.capture;
    this.win.__blobioMinimapVisibility = this.visibility;
    this.refresh();
    return true;
  }

  refresh(settings = readInGameUiSettings(this.storage)) {
    this.settings = settings;
    const background = settings.minimapBackground;
    if (!this.root) return;
    this.visibility(this.minimap);
    this.root.style.background = backgroundFill(background);
    this.root.style.backdropFilter = settings.minimapBlur.enabled ? `blur(${settings.minimapBlur.value}px)` : 'none';
    const grid = settings.minimapGrid;
    const font = settings.minimapFont;
    this.root.style.setProperty('--blobio-minimap-grid', grid.enabled ? hexToRgba(grid.color, grid.alpha) : 'rgba(255, 255, 255, 0.12)');
    this.root.style.setProperty('--blobio-minimap-font', font.enabled ? hexToRgba(font.color, font.alpha) : 'rgba(255, 255, 255, 0.38)');
    const outline = settings.minimapOutline;
    this.root.classList.toggle('blobio-minimap-outline-enabled', outline.enabled);
    applyHudOutline(this.root, outline, settings.minimapGlow);
    this.root.style.setProperty('--blobio-minimap-outline', outline.enabled
      ? hexToRgba(outline.color, outline.alpha) : 'rgba(255, 255, 255, 0.22)');
  }

  createDot() {
    const node = this.document.createElement('span');
    node.className = 'blobio-minimap-dot';
    this.content.appendChild(node);
    return { node, x: NaN, y: NaN, size: NaN, color: '', frame: 0 };
  }

  positionDot(dot, x, y, radius, color) {
    if (x !== dot.x) { dot.node.style.left = `${x}%`; dot.x = x; }
    if (y !== dot.y) { dot.node.style.top = `${y}%`; dot.y = y; }
    const size = radius * 2;
    if (size !== dot.size) {
      dot.node.style.width = `${size}%`;
      dot.node.style.height = `${size}%`;
      dot.size = size;
    }
    const fill = `rgba(${Math.round(color.d * 255)}, ${Math.round(color.c * 255)}, ${Math.round(color.b * 255)}, ${color.a})`;
    if (fill !== dot.color) { dot.node.style.background = fill; dot.color = fill; }
  }

  draw(minimap, gameState, x, y, playing, showFriends) {
    this.visibility(minimap);
    if (this.root.hidden) return;
    if (!this.canvas?.isConnected) {
      this.canvas = this.document.querySelector('canvas.blobio-background-game-canvas, canvas:not(.hidden)');
      this.resizeObserver.disconnect();
      if (this.canvas) this.resizeObserver.observe(this.canvas);
      this.geometry = null;
    }
    if (!this.canvas) return;
    const width = minimap.s.C;
    const height = minimap.s.r;
    const size = minimap.n;
    if (!this.geometry || this.geometry.width !== width || this.geometry.height !== height || this.geometry.size !== size) {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = rect.width / width;
      const scaleY = rect.height / height;
      this.root.style.left = `${rect.left + (width - size - 10) * scaleX}px`;
      this.root.style.top = `${rect.top + (height - size - 10) * scaleY}px`;
      this.root.style.width = `${size * scaleX}px`;
      this.root.style.height = `${size * scaleY}px`;
      this.root.style.setProperty('--blobio-minimap-sector-font', `${Math.max(8, size * scaleX * 0.045)}px`);
      this.geometry = { width, height, size };
    }
    const scale = minimap.k / size * 100;
    const minimum = gameState.t.c;
    const radius = minimap.f * scale;
    this.positionDot(this.self, (x - minimum) * scale, 100 - (y - minimum) * scale, radius, playing ? minimap.e : minimap.o);
    this.frame++;
    if (showFriends) {
      for (const native of minimap.r.a) {
        if (!native) continue;
        let dot = this.friends.get(native.a);
        if (!dot) { dot = this.createDot(); this.friends.set(native.a, dot); }
        this.positionDot(dot, (native.d - minimum) * scale, 100 - (-native.e - minimum) * scale, radius, minimap.d);
        dot.frame = this.frame;
      }
    }
    for (const [id, dot] of this.friends) {
      if (dot.frame !== this.frame) { dot.node.remove(); this.friends.delete(id); }
    }
  }

  destroy() {
    if (this.win.__blobioMinimapCapture === this.capture) {
      delete this.win.__blobioMinimapCapture;
      delete this.win.__blobioMinimapVisibility;
      delete this.win.__blobioMinimapHudActive;
    }
    this.win.removeEventListener('resize', this.resize);
    this.win.removeEventListener('scroll', this.resize, true);
    this.resizeObserver?.disconnect();
    applyHudOutline(this.root, { enabled: false });
    this.root?.remove();
    this.styleNode?.remove();
    this.root = null;
    this.canvas = null;
    this.friends.clear();
  }
}
