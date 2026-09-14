import {
  CELL_RING_MODES,
  CELL_RING_NAME_STYLES,
  readCellRingSettings,
  saveCellRingSettings,
  normalizeCellRingSettings,
} from './CellRingSettings.js';

const DESCRIPTION = 'FPS-Impact: Low[1-10]\nAdds a configurable self glow and optional transparent own-cell rendering in-game.\nEstimated loss: 1-10 FPS. Actual impact varies with GPU, zoom, and visible own-cell count.';
const MODE_DESCRIPTION = 'SYNC follows your in-game cell color. SOLID uses the chosen glow color.';
const TRANSPARENT_DESCRIPTION = 'Controls own-cell alpha, including skinned own cells. Virus textures are protected.';
const REMOVE_BORDER_DESCRIPTION = 'Removes normal built-in cell borders from every player. Your own glow remains active.';
const DRAG_SAVE_DELAY_MS = 160;
const MODE_LABELS = {
  sync: 'SYNC',
  solid: 'SOLID',
};
const NAME_STYLE_LABELS = {
  normal: 'Normal',
  vip: 'VIP',
  yt: 'YT',
};
const SYNC_PREVIEW_COLORS = ['#c7d900', '#19d7ff', '#ff4da6', '#72f04c', '#ffb21f'];

export class CellRingSettingsUi {
  constructor({
    document,
    storage,
    logger = console,
    showTooltip = null,
    moveTooltip = null,
    hideTooltip = null,
    onOpen = null,
  } = {}) {
    this.document = document;
    this.storage = storage;
    this.logger = logger;
    this.showTooltip = showTooltip;
    this.moveTooltip = moveTooltip;
    this.hideTooltip = hideTooltip;
    this.onOpen = onOpen;
    this.settings = readCellRingSettings(storage, document);
    this.listeners = [];
    this.elements = null;
    this.pendingSave = null;
    this.pendingSaveTimer = 0;
    this.syncPreviewColor = SYNC_PREVIEW_COLORS[Math.floor(Math.random() * SYNC_PREVIEW_COLORS.length)] || SYNC_PREVIEW_COLORS[0];
  }

  create() {
    this.settings = readCellRingSettings(this.storage, this.document);

    const group = this.document.createElement('div');
    group.classList.add('blobio-cell-ring-setting-group');
    group.setAttribute('_ngcontent-c3', '');

    const row = this.createHeaderRow();
    const menu = this.createDropdownMenu();
    group.append(row, menu);

    this.elements = {
      group,
      row,
      menu,
      enabled: row.querySelector('#config-switch-cell-ring'),
      arrowButton: row.querySelector('.blobio-cell-ring-dropdown-button'),
      disclosure: row.querySelector('.blobio-cell-ring-dropdown-symbol'),
      previewCircle: menu.querySelector('.blobio-cell-ring-preview-circle'),
      previewName: menu.querySelector('.blobio-cell-ring-preview-name'),
      nameStyle: menu.querySelector('.blobio-cell-ring-name-style-select'),
      modeButton: menu.querySelector('.blobio-cell-ring-mode-button'),
      solidPanel: menu.querySelector('.blobio-cell-ring-solid-panel'),
      colorInput: menu.querySelector('.blobio-cell-ring-color-input'),
      colorSwatch: menu.querySelector('.blobio-cell-ring-color-swatch'),
      alphaInput: menu.querySelector('.blobio-cell-ring-alpha-input'),
      alphaValue: menu.querySelector('.blobio-cell-ring-alpha-value'),
      glowSizeInput: menu.querySelector('.blobio-cell-ring-size-input'),
      glowSizeValue: menu.querySelector('.blobio-cell-ring-size-value'),
      borderWidthInput: menu.querySelector('.blobio-cell-ring-border-width-input'),
      borderWidthValue: menu.querySelector('.blobio-cell-ring-border-width-value'),
      transparentCell: menu.querySelector('#config-switch-cell-ring-transparent'),
      cellAlphaInput: menu.querySelector('.blobio-cell-ring-cell-alpha-input'),
      cellAlphaValue: menu.querySelector('.blobio-cell-ring-cell-alpha-value'),
      removeAllCellBorders: menu.querySelector('#config-switch-cell-ring-remove-borders'),
    };

    this.sync();
    return group;
  }

  destroy() {
    for (const [node, type, listener, options] of this.listeners) {
      node.removeEventListener?.(type, listener, options);
    }
    this.flushPendingSave();
    this.listeners = [];
    this.elements?.group?.remove?.();
    this.elements = null;
  }

  createHeaderRow() {
    const row = this.document.createElement('div');
    row.classList.add('grid-item', 'blobio-extension-setting-row', 'blobio-cell-ring-setting-row');
    row.dataset.blobioTooltip = DESCRIPTION;
    row.setAttribute('_ngcontent-c3', '');

    const switchLabel = this.document.createElement('label');
    switchLabel.classList.add('switch');
    switchLabel.setAttribute('_ngcontent-c3', '');

    const checkbox = this.document.createElement('input');
    checkbox.id = 'config-switch-cell-ring';
    checkbox.type = 'checkbox';
    checkbox.classList.add('ng-untouched', 'ng-pristine', 'ng-valid');
    checkbox.setAttribute('_ngcontent-c3', '');

    const slider = this.document.createElement('span');
    slider.classList.add('slider');
    slider.setAttribute('_ngcontent-c3', '');
    switchLabel.append(checkbox, slider);

    const textLabel = this.document.createElement('label');
    textLabel.setAttribute('for', checkbox.id);
    textLabel.setAttribute('_ngcontent-c3', '');
    textLabel.textContent = 'Glow | transparent Cell';

    const arrowButton = this.document.createElement('button');
    arrowButton.type = 'button';
    arrowButton.classList.add('blobio-cell-ring-dropdown-button');
    arrowButton.setAttribute('aria-label', 'Open Glow transparent Cell settings');
    arrowButton.setAttribute('aria-expanded', 'false');
    arrowButton.setAttribute('_ngcontent-c3', '');

    const disclosure = this.document.createElement('span');
    disclosure.classList.add('blobio-cell-ring-dropdown-symbol');
    disclosure.setAttribute('aria-hidden', 'true');
    disclosure.textContent = '+';
    arrowButton.appendChild(disclosure);

    row.append(switchLabel, textLabel, arrowButton);
    this.installTooltip(row, DESCRIPTION);

    this.listen(checkbox, 'change', () => {
      this.settings = this.save({ enabled: Boolean(checkbox.checked) });
      this.sync();
    });

    this.listen(arrowButton, 'click', (event) => {
      event.preventDefault?.();
      event.stopPropagation?.();
      const open = this.elements?.menu?.hidden !== false;
      if (open) {
        this.onOpen?.(this);
      }
      this.setOpen(open);
    });

    return row;
  }

  createDropdownMenu() {
    const menu = this.document.createElement('div');
    menu.classList.add('blobio-cell-ring-button-menu');
    menu.hidden = true;
    menu.setAttribute('_ngcontent-c3', '');

    const previewSection = this.createSection('Preview');
    const previewLayout = this.document.createElement('div');
    previewLayout.classList.add('blobio-cell-ring-preview-layout');

    const previewCircle = this.document.createElement('div');
    previewCircle.classList.add('blobio-cell-ring-preview-circle');
    previewCircle.setAttribute('aria-label', 'Glow transparent Cell preview');
    const previewName = this.document.createElement('span');
    previewName.classList.add('blobio-cell-ring-preview-name');
    previewName.textContent = 'YourNameHere';
    previewCircle.appendChild(previewName);

    const styleLabel = this.document.createElement('label');
    styleLabel.classList.add('blobio-cell-ring-name-style-label');
    const styleText = this.document.createElement('span');
    styleText.textContent = 'Name style';
    const styleSelect = this.document.createElement('select');
    styleSelect.classList.add('blobio-cell-ring-name-style-select');
    for (const style of CELL_RING_NAME_STYLES) {
      const option = this.document.createElement('option');
      option.value = style;
      option.textContent = NAME_STYLE_LABELS[style] || style;
      styleSelect.appendChild(option);
    }
    styleLabel.append(styleText, styleSelect);

    previewLayout.append(previewCircle, styleLabel);
    previewSection.appendChild(previewLayout);
    const borderControl = this.createRangeRow('Border thickness', 'blobio-cell-ring-border-width-input', 'blobio-cell-ring-border-width-value');
    borderControl.input.max = '6';
    borderControl.input.step = '0.25';
    borderControl.input.setAttribute('aria-label', 'Border thickness');
    this.installTooltip(borderControl.row, 'Border width in the preview. Scales with your cell in-game. Set to 0 for glow only.');
    previewSection.appendChild(borderControl.row);
    menu.appendChild(previewSection);

    const glowSection = this.createSection('Glow');
    const modeRow = this.document.createElement('div');
    modeRow.classList.add('blobio-cell-ring-mode-row');
    const modeLabel = this.document.createElement('span');
    modeLabel.textContent = 'Mode';
    const modeButton = this.document.createElement('button');
    modeButton.type = 'button';
    modeButton.classList.add('blobio-cell-mass-preset-mode-button', 'blobio-cell-ring-mode-button', 'is-sync');
    modeButton.setAttribute('aria-label', 'Toggle Glow transparent Cell mode');
    modeButton.append(
      this.createModeText(MODE_LABELS.sync, 'sync'),
      this.createModeText(MODE_LABELS.solid, 'solid'),
    );
    modeRow.append(modeLabel, modeButton);
    this.installTooltip(modeRow, MODE_DESCRIPTION);
    glowSection.appendChild(modeRow);

    const solidPanel = this.document.createElement('div');
    solidPanel.classList.add('blobio-cell-ring-solid-panel');
    const colorControl = this.document.createElement('label');
    colorControl.classList.add('blobio-cell-ring-control', 'blobio-cell-ring-color-control');
    const colorTitle = this.document.createElement('span');
    colorTitle.textContent = 'Glow color';
    const colorWheel = this.document.createElement('span');
    colorWheel.classList.add('blobio-ui-color-wheel', 'blobio-cell-ring-color-wheel');
    const colorSwatch = this.document.createElement('span');
    colorSwatch.classList.add('blobio-ui-color-swatch', 'blobio-cell-ring-color-swatch');
    const colorInput = this.document.createElement('input');
    colorInput.type = 'color';
    colorInput.classList.add('blobio-ui-color-input', 'blobio-cell-ring-color-input');
    colorInput.setAttribute('aria-label', 'Glow transparent Cell solid color');
    colorWheel.append(colorSwatch, colorInput);
    colorControl.append(colorTitle, colorWheel);
    solidPanel.appendChild(colorControl);
    glowSection.appendChild(solidPanel);

    const alphaControl = this.createRangeRow('Glow alpha', 'blobio-cell-ring-alpha-input', 'blobio-cell-ring-alpha-value');
    glowSection.appendChild(alphaControl.row);
    const sizeControl = this.createRangeRow('Glow size', 'blobio-cell-ring-size-input', 'blobio-cell-ring-size-value');
    sizeControl.input.min = '0.25';
    sizeControl.input.max = '3';
    sizeControl.input.step = '0.05';
    sizeControl.input.setAttribute('aria-label', 'Glow size');
    glowSection.appendChild(sizeControl.row);
    menu.appendChild(glowSection);

    const transparentSection = this.createSection('Transparent');
    const transparentRow = this.createCheckboxRow(
      'config-switch-cell-ring-transparent',
      'Transparent cell',
      TRANSPARENT_DESCRIPTION,
    );
    transparentSection.appendChild(transparentRow);
    const cellAlphaControl = this.createRangeRow('Cell alpha', 'blobio-cell-ring-cell-alpha-input', 'blobio-cell-ring-cell-alpha-value');
    transparentSection.appendChild(cellAlphaControl.row);
    menu.appendChild(transparentSection);

    const miscSection = this.createSection('Misc');
    miscSection.appendChild(this.createCheckboxRow(
      'config-switch-cell-ring-remove-borders',
      'Remove all cell borders',
      REMOVE_BORDER_DESCRIPTION,
    ));
    menu.appendChild(miscSection);

    this.listen(styleSelect, 'change', () => {
      this.settings = this.save({ nameStyle: styleSelect.value });
      this.sync();
    });
    this.listen(modeButton, 'click', (event) => {
      event.preventDefault?.();
      event.stopPropagation?.();
      this.flushPendingSave();
      this.settings = this.save({ mode: this.nextMode() });
      this.sync();
    });
    this.listen(colorInput, 'input', () => {
      this.scheduleSave({ solidColor: colorInput.value });
      this.sync();
    });
    this.listen(colorInput, 'change', () => this.flushPendingSave());
    this.listen(alphaControl.input, 'input', () => {
      this.scheduleSave({ alpha: alphaControl.input.value });
      this.sync();
    });
    this.listen(alphaControl.input, 'change', () => this.flushPendingSave());
    this.listen(sizeControl.input, 'input', () => {
      this.scheduleSave({ glowSize: sizeControl.input.value });
      this.sync();
    });
    this.listen(sizeControl.input, 'change', () => this.flushPendingSave());
    this.listen(borderControl.input, 'input', () => {
      this.scheduleSave({ borderWidth: borderControl.input.value });
      this.sync();
    });
    this.listen(borderControl.input, 'change', () => this.flushPendingSave());
    this.listen(transparentRow.querySelector('input'), 'change', (event) => {
      this.settings = this.save({ transparentCell: Boolean(event.target?.checked) });
      this.sync();
    });
    this.listen(cellAlphaControl.input, 'input', () => {
      this.scheduleSave({ cellAlpha: cellAlphaControl.input.value });
      this.sync();
    });
    this.listen(cellAlphaControl.input, 'change', () => this.flushPendingSave());
    this.listen(miscSection.querySelector('input'), 'change', (event) => {
      this.settings = this.save({ removeAllCellBorders: Boolean(event.target?.checked) });
      this.sync();
    });

    return menu;
  }

  createSection(titleText) {
    const section = this.document.createElement('div');
    section.classList.add('blobio-cell-ring-section');
    const title = this.document.createElement('div');
    title.classList.add('blobio-cell-ring-section-title');
    title.textContent = titleText;
    section.appendChild(title);
    return section;
  }

  createCheckboxRow(id, text, tooltip) {
    const row = this.document.createElement('label');
    row.classList.add('blobio-cell-ring-checkbox-row');
    const input = this.document.createElement('input');
    input.id = id;
    input.type = 'checkbox';
    const label = this.document.createElement('span');
    label.textContent = text;
    row.append(input, label);
    this.installTooltip(row, tooltip);
    return row;
  }

  createRangeRow(text, inputClass, valueClass) {
    const row = this.document.createElement('label');
    row.classList.add('blobio-cell-ring-control', 'blobio-cell-ring-range-row');
    const label = this.document.createElement('span');
    label.textContent = text;
    const input = this.document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '1';
    input.step = '0.01';
    input.classList.add('blobio-themed-range', inputClass);
    const value = this.document.createElement('span');
    value.classList.add('blobio-cell-ring-alpha-value', valueClass);
    row.append(label, input, value);
    return { row, input, value };
  }

  createModeText(text, mode) {
    const span = this.document.createElement('span');
    span.classList.add('blobio-cell-mass-preset-mode-text', 'blobio-cell-ring-mode-text', `is-${mode}`);
    span.textContent = text;
    return span;
  }

  installTooltip(node, text) {
    if (!node || !text) {
      return;
    }
    node.dataset.blobioTooltip = text;
    node.removeAttribute?.('title');
    if (typeof this.showTooltip !== 'function') {
      return;
    }

    this.listen(node, 'mouseenter', (event) => this.showTooltip(node, event));
    this.listen(node, 'mousemove', (event) => this.moveTooltip?.(event));
    this.listen(node, 'mouseleave', () => this.hideTooltip?.());
  }

  save(changes) {
    this.clearPendingSaveTimer();
    const clean = saveCellRingSettings(this.storage, {
      ...this.settings,
      ...changes,
    }, this.document);
    this.notifyRuntime(clean);
    return clean;
  }

  notifyRuntime(nextSettings = this.settings) {
    const clean = normalizeCellRingSettings(nextSettings);
    const win = this.document?.defaultView || globalThis;
    const targets = [win, win?.unsafeWindow, globalThis].filter(Boolean);
    for (const target of targets) {
      try {
        target.__blobioCellRingRefresh?.(clean);
      } catch {
        // Ignore cross-realm access errors; the DOM event below is the fallback.
      }
    }
    try {
      const EventCtor = win?.CustomEvent || globalThis.CustomEvent;
      this.document?.dispatchEvent?.(new EventCtor('blobio:cell-ring-settings-refresh', { detail: clean }));
    } catch {
      // Some script realms restrict CustomEvent detail. Direct refresh above is enough there.
    }
  }

  scheduleSave(changes) {
    this.pendingSave = {
      ...(this.pendingSave || {}),
      ...changes,
    };
    this.settings = {
      ...this.settings,
      ...changes,
    };
    this.notifyRuntime(this.settings);
    this.clearPendingSaveTimer();
    const setTimeoutRef = this.document.defaultView?.setTimeout || globalThis.setTimeout;
    this.pendingSaveTimer = setTimeoutRef?.(() => {
      this.flushPendingSave();
      this.sync();
    }, DRAG_SAVE_DELAY_MS) || 0;
  }

  flushPendingSave() {
    if (!this.pendingSave) {
      return;
    }
    const changes = this.pendingSave;
    this.pendingSave = null;
    this.clearPendingSaveTimer();
    this.settings = this.save(changes);
  }

  clearPendingSaveTimer() {
    if (!this.pendingSaveTimer) {
      return;
    }
    const clearTimeoutRef = this.document.defaultView?.clearTimeout || globalThis.clearTimeout;
    clearTimeoutRef?.(this.pendingSaveTimer);
    this.pendingSaveTimer = 0;
  }

  setOpen(open) {
    if (!this.elements) {
      return;
    }
    this.elements.menu.hidden = !open;
    this.elements.arrowButton.setAttribute('aria-expanded', String(open));
    this.elements.disclosure.textContent = open ? '-' : '+';
    this.elements.group.classList.toggle('is-open', open);
  }

  sync() {
    if (!this.elements) {
      return;
    }

    const disabled = !this.settings.enabled;
    this.elements.enabled.checked = this.settings.enabled;
    this.elements.nameStyle.value = this.settings.nameStyle;
    this.elements.nameStyle.disabled = disabled;
    this.elements.modeButton.classList.toggle('is-sync', this.settings.mode === 'sync');
    this.elements.modeButton.classList.toggle('is-solid', this.settings.mode === 'solid');
    this.elements.modeButton.setAttribute('aria-pressed', String(this.settings.mode === 'solid'));
    this.elements.modeButton.disabled = disabled;
    this.elements.solidPanel.hidden = this.settings.mode !== 'solid';
    this.elements.colorInput.value = this.settings.solidColor;
    this.elements.colorInput.disabled = disabled || this.settings.mode !== 'solid';
    this.elements.colorSwatch.style.backgroundColor = this.settings.solidColor;
    this.elements.alphaInput.value = String(this.settings.alpha);
    this.elements.alphaInput.disabled = disabled;
    this.elements.alphaValue.textContent = `${Math.round(this.settings.alpha * 100)}%`;
    this.elements.glowSizeInput.value = String(this.settings.glowSize);
    this.elements.glowSizeInput.disabled = disabled;
    this.elements.glowSizeValue.textContent = `${Math.round(this.settings.glowSize * 100)}%`;
    this.elements.borderWidthInput.value = String(this.settings.borderWidth);
    this.elements.borderWidthInput.disabled = disabled;
    this.elements.borderWidthValue.textContent = `${this.settings.borderWidth}px`;
    this.elements.transparentCell.checked = this.settings.transparentCell;
    this.elements.transparentCell.disabled = disabled;
    this.elements.cellAlphaInput.value = String(this.settings.cellAlpha);
    this.elements.cellAlphaInput.disabled = disabled || !this.settings.transparentCell;
    this.elements.cellAlphaValue.textContent = `${Math.round(this.settings.cellAlpha * 100)}%`;
    this.elements.removeAllCellBorders.checked = this.settings.removeAllCellBorders;
    this.elements.removeAllCellBorders.disabled = disabled;
    this.syncPreview();
  }

  syncPreview() {
    const circle = this.elements?.previewCircle;
    const name = this.elements?.previewName;
    if (!circle || !name) {
      return;
    }

    const fill = this.hexToRgb(this.syncPreviewColor);
    const glowColor = this.settings.mode === 'sync' ? this.syncPreviewColor : this.settings.solidColor;
    const fillAlpha = this.settings.transparentCell ? this.settings.cellAlpha : 1;
    const ringAlpha = this.settings.enabled ? this.settings.alpha : 0.16;

    circle.style.backgroundColor = `rgba(${fill.r}, ${fill.g}, ${fill.b}, ${fillAlpha})`;
    circle.style.borderColor = this.toRgbaString(glowColor, Math.min(1, ringAlpha + 0.18));
    circle.style.borderWidth = `${this.settings.borderWidth}px`;
    circle.style.boxShadow = [
      `0 0 ${12 * this.settings.glowSize}px ${this.toRgbaString(glowColor, ringAlpha * 0.75)}`,
      `0 0 ${30 * this.settings.glowSize}px ${this.toRgbaString(glowColor, ringAlpha * 0.52)}`,
      `0 0 ${58 * this.settings.glowSize}px ${this.toRgbaString(glowColor, ringAlpha * 0.34)}`,
    ].join(', ');
    circle.classList.toggle('is-transparent', this.settings.transparentCell);

    for (const style of CELL_RING_NAME_STYLES) {
      name.classList.toggle(`is-${style}`, this.settings.nameStyle === style);
    }
  }

  nextMode() {
    const current = CELL_RING_MODES.indexOf(this.settings.mode);
    return CELL_RING_MODES[(current + 1) % CELL_RING_MODES.length] || 'sync';
  }

  hexToRgb(color) {
    const clean = /^#[0-9a-f]{6}$/i.test(String(color || '')) ? color : '#ffffff';
    return {
      r: parseInt(clean.slice(1, 3), 16),
      g: parseInt(clean.slice(3, 5), 16),
      b: parseInt(clean.slice(5, 7), 16),
    };
  }

  toRgbaString(color, alpha) {
    const rgb = this.hexToRgb(color);
    const safeAlpha = Math.max(0, Math.min(1, Number(alpha) || 0));
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${safeAlpha})`;
  }

  listen(node, type, listener, options) {
    node?.addEventListener?.(type, listener, options);
    this.listeners.push([node, type, listener, options]);
  }
}
