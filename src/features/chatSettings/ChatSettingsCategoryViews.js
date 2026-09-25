import { HOTKEY_TEXT_LIMIT } from '../../hotkeys/HotkeyStore.js';
import {
  ANIMATION_SPEED_LIMITS,
  CHAT_FONT_SIZE_LIMITS,
} from '../../settings/RuntimeSettings.js';
import { KEYSTROKE_SIZE_LIMITS } from '../../settings/KeystrokeHudSettings.js';
import {
  HUD_INFO_BOOSTER_COLOR_MODES,
  HUD_INFO_BOOSTER_DURATION_COLOR_MODES,
  HUD_INFO_DATA_MODES,
  HUD_INFO_FONT_LIMITS,
  HUD_INFO_LAYOUT_MODES,
  HUD_INFO_POSITION_MODES,
  HUD_INFO_STYLE_MODES,
} from '../../settings/HudInfoSettings.js';
import { BLUR_LIMITS, UI_FONT_SIZE_LIMITS } from '../../settings/InGameUiSettings.js';

export function createCategoryButton(document, label, category) {
  const button = document.createElement('button');
  button.type = 'button';
  button.classList.add('blobio-chat-settings-category-button');
  button.dataset.category = category;
  button.setAttribute('aria-expanded', 'false');

  const text = document.createElement('span');
  text.textContent = label;
  button.appendChild(text);
  return button;
}

export function createChatCategory(document) {
  const category = document.createElement('div');
  category.classList.add('blobio-chat-settings-category', 'blobio-chat-appearance-category');
  category.dataset.category = 'chat';

  category.append(
    createFontSetting(document, 'chat', 'Font-Size', CHAT_FONT_SIZE_LIMITS),
    createColorSetting(document, 'chat-background', 'Chat-BG-Color', true),
    createColorSetting(document, 'chat-slider', 'Slider Color'),
    createColorSetting(document, 'chat-outline', 'Chat-outline-Color', true),
    createColorSetting(document, 'chat-glow', 'Custom Glow', true),
    createBlurSetting(document, 'chat-blur'),
    createBooleanSetting(document, 'smooth-chat', 'Smooth-Chat'),
  );
  return category;
}

export function createCaptchaCategory(document) {
  const category = document.createElement('div');
  category.classList.add('blobio-chat-settings-category', 'blobio-captcha-category');
  category.dataset.category = 'captcha';
  category.appendChild(createBooleanSetting(document, 'captcha-logo', 'Hide Captcha-Logo'));
  return category;
}

export function createLeaderboardCategory(document) {
  const category = document.createElement('div');
  category.classList.add('blobio-chat-settings-category', 'blobio-leaderboard-category');
  category.dataset.category = 'leaderboard';
  category.append(
    createFontSetting(document, 'leaderboard', 'Font-Size', UI_FONT_SIZE_LIMITS),
    createColorSetting(document, 'leaderboard-background', 'Leaderboard-BG-Color', true),
    createColorSetting(document, 'leaderboard-outline', 'Leaderboard-outline-Color', true),
    createColorSetting(document, 'leaderboard-glow', 'Custom Glow', true),
    createBlurSetting(document, 'leaderboard-blur'),
  );
  return category;
}

export function createKeyShortcutsCategory(document) {
  const category = document.createElement('div');
  category.classList.add('blobio-chat-settings-category', 'blobio-key-shortcuts-category');
  category.dataset.category = 'key-shortcuts';
  category.appendChild(createBooleanSetting(document, 'key-shortcuts', 'Disable the Key-Shortcut text on screen.'));
  return category;
}

export function createBlurSetting(document, name) {
  const group = createFontSetting(document, name, 'Blur', BLUR_LIMITS);
  group.querySelector('input[type="range"]').setAttribute('aria-label', `${name} intensity`);
  return group;
}

export function createKeystrokeHudCategory(document) {
  const category = document.createElement('div');
  category.classList.add('blobio-chat-settings-category', 'blobio-keystroke-category');
  category.dataset.category = 'keystroke-hud';
  category.append(
    createBooleanSetting(document, 'keystroke-enabled', 'Keystroke-HUD'),
    createBooleanSetting(document, 'keystroke-position-editor', 'Position-Editor'),
    createHudModeSetting(document, 'keystroke-layout', 'Keystroke layout'),
    createHudSizeSetting(document, 'keystroke-size', 'Size (%)', KEYSTROKE_SIZE_LIMITS),
    createBlurSetting(document, 'keystroke-blur'),
  );
  for (const [name, label] of [['font', 'Font Color'], ['outline', 'Key Outline'], ['fill', 'Key Inner Color'], ['highlight', 'Pressed Highlight']]) {
    const group = createHudBoosterColorSetting(document, `keystroke-${name}`, label);
    group.querySelector('.blobio-ui-color-input').setAttribute('aria-label', `Keystroke ${label}`);
    group.querySelector('.blobio-ui-alpha-range').setAttribute('aria-label', `Keystroke ${label} opacity`);
    category.appendChild(group);
  }
  return category;
}

export function createMutedPlayersCategory(document) {
  const category = document.createElement('div');
  category.classList.add('blobio-chat-settings-category', 'blobio-muted-players-category');
  category.dataset.category = 'muted';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.classList.add('blobio-chat-font-toggle', 'blobio-muted-players-toggle');

  const label = document.createElement('div');
  label.classList.add('blobio-chat-font-label', 'blobio-muted-players-label');
  label.textContent = 'Ability to mute players with ID';

  const list = document.createElement('div');
  list.classList.add('blobio-muted-players-list');

  const empty = document.createElement('div');
  empty.classList.add('blobio-muted-players-empty');
  empty.textContent = 'No muted player UIDs.';
  list.appendChild(empty);

  const actions = document.createElement('div');
  actions.classList.add('blobio-muted-players-actions');

  const addName = document.createElement('button');
  addName.type = 'button';
  addName.classList.add('blobio-muted-player-action', 'blobio-muted-player-add-name');
  addName.textContent = 'Add name';

  const unmute = document.createElement('button');
  unmute.type = 'button';
  unmute.classList.add('blobio-muted-player-action', 'blobio-muted-player-unmute');
  unmute.textContent = 'Unmute';

  const noUidToggle = document.createElement('button');
  noUidToggle.type = 'button';
  noUidToggle.classList.add('blobio-chat-font-toggle', 'blobio-muted-no-uid-all-toggle');

  const noUidLabel = document.createElement('div');
  noUidLabel.classList.add('blobio-chat-font-label', 'blobio-muted-players-label');
  noUidLabel.textContent = 'Mute all chat users with no UID';

  const noUidInput = document.createElement('input');
  noUidInput.type = 'text';
  noUidInput.classList.add('blobio-muted-no-uid-name-input');
  noUidInput.maxLength = 40;
  noUidInput.placeholder = 'No-UID name';
  noUidInput.setAttribute('aria-label', 'No-UID chat name to auto mute');

  const addNoUidName = document.createElement('button');
  addNoUidName.type = 'button';
  addNoUidName.classList.add('blobio-muted-player-action', 'blobio-muted-no-uid-name-add');
  addNoUidName.textContent = 'Add no-UID name';

  const noUidList = document.createElement('div');
  noUidList.classList.add('blobio-muted-no-uid-name-list');

  actions.append(addName, unmute);
  category.append(toggle, label, list, actions, noUidToggle, noUidLabel, noUidInput, addNoUidName, noUidList);
  return category;
}

export function createNoUidMutedNameChip(document, nameText) {
  const chip = document.createElement('div');
  chip.classList.add('blobio-muted-player-chip', 'blobio-muted-no-uid-name-chip');

  const name = document.createElement('span');
  name.classList.add('blobio-muted-player-name');
  name.textContent = nameText;

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.classList.add('blobio-muted-no-uid-name-remove');
  remove.dataset.name = nameText;
  remove.textContent = 'Remove';

  chip.append(name, remove);
  return chip;
}

export function createHotkeyCategory(document) {
  const category = document.createElement('div');
  category.classList.add('blobio-chat-settings-category', 'blobio-hotkey-category');
  category.dataset.category = 'hotkey';

  const input = document.createElement('input');
  input.type = 'text';
  input.classList.add('blobio-hotkey-text-input');
  input.maxLength = HOTKEY_TEXT_LIMIT;
  input.placeholder = 'Write command here...';
  input.setAttribute('aria-label', 'Hotkey command or message');

  const list = document.createElement('div');
  list.classList.add('blobio-hotkey-list');

  const apply = document.createElement('button');
  apply.type = 'button';
  apply.classList.add('blobio-hotkey-action', 'blobio-hotkey-apply');
  apply.textContent = 'Apply HK text';

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.classList.add('blobio-hotkey-action', 'blobio-hotkey-remove');
  remove.textContent = 'Remove';

  category.append(input, list, apply, remove);
  return category;
}

export function createControlsCategory(document) {
  const category = document.createElement('div');
  category.classList.add('blobio-chat-settings-category', 'blobio-controls-category');
  category.dataset.category = 'controls';

  const group = document.createElement('div');
  group.classList.add('blobio-ui-setting-group', 'blobio-cell-pause-setting');
  group.dataset.setting = 'cell-pause';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.classList.add('blobio-chat-font-toggle', 'blobio-setting-toggle');

  const label = document.createElement('div');
  label.classList.add('blobio-chat-font-label');
  label.textContent = 'Cell-Pause';

  const key = document.createElement('button');
  key.type = 'button';
  key.classList.add('blobio-hotkey-bind', 'is-key', 'blobio-cell-pause-bind');
  key.setAttribute('aria-label', 'Change Cell-Pause key');

  group.append(toggle, label, key);
  category.appendChild(group);
  return category;
}

export function createAnimationSpeedCategory(document) {
  const category = document.createElement('div');
  category.classList.add('blobio-chat-settings-category', 'blobio-animation-speed-category');
  category.dataset.category = 'animation';

  const group = document.createElement('div');
  group.classList.add('blobio-ui-setting-group', 'blobio-animation-speed-setting');
  group.dataset.setting = 'animation-speed';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.classList.add('blobio-chat-font-toggle', 'blobio-setting-toggle');

  const label = document.createElement('div');
  label.classList.add('blobio-chat-font-label');
  label.textContent = 'Animation Speed';

  const controls = document.createElement('div');
  controls.classList.add('blobio-animation-speed-controls');

  const modeButton = document.createElement('button');
  modeButton.type = 'button';
  modeButton.classList.add('blobio-animation-speed-mode');
  modeButton.setAttribute('aria-label', 'Animation speed mode');

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.classList.add('blobio-animation-speed-range', 'blobio-themed-range');
  slider.min = String(ANIMATION_SPEED_LIMITS.min);
  slider.max = String(ANIMATION_SPEED_LIMITS.max);
  slider.step = '1';
  slider.setAttribute('aria-label', 'Animation speed');

  const value = document.createElement('span');
  value.classList.add('blobio-animation-speed-value');

  const rangeLabel = document.createElement('span');
  rangeLabel.classList.add('blobio-animation-speed-range-label');
  rangeLabel.textContent = '0.1x - 18.0x';

  const reset = document.createElement('button');
  reset.type = 'button';
  reset.classList.add('blobio-animation-speed-reset');
  reset.textContent = 'Reset to default';

  controls.append(modeButton, slider, value, rangeLabel, reset);
  group.append(toggle, label, controls);
  category.appendChild(group);
  return category;
}

export function createHudInfoCategory(document) {
  const category = document.createElement('div');
  category.classList.add('blobio-chat-settings-category', 'blobio-hud-info-category');
  category.dataset.category = 'hud-info';

  category.append(
    createHudSection(document, 'HUD Display', [
      createBooleanSetting(document, 'hud-info-enabled', 'HUD-text on screen'),
      createHudChoiceSetting(document, 'hud-position', 'Position', HUD_INFO_POSITION_MODES),
      createHudChoiceSetting(document, 'hud-layout', 'Layout', HUD_INFO_LAYOUT_MODES),
      createHudChoiceSetting(document, 'hud-style', 'Style', HUD_INFO_STYLE_MODES),
    ]),
    createHudSection(document, 'Data Text', [
      createBooleanSetting(document, 'hud-info-fps', 'FPS'),
      createBooleanSetting(document, 'hud-info-score', 'Score'),
      createBooleanSetting(document, 'hud-info-cells', 'Cells'),
      createBooleanSetting(document, 'hud-info-macro', 'Macro'),
      createBooleanSetting(document, 'hud-info-ping', 'Ping'),
      createHudChoiceSetting(document, 'hud-fps-mode', 'FPS mode', HUD_INFO_DATA_MODES),
      createHudChoiceSetting(document, 'hud-score-mode', 'Score mode', HUD_INFO_DATA_MODES),
      createHudChoiceSetting(document, 'hud-ping-mode', 'Ping mode', HUD_INFO_DATA_MODES),
    ]),
    createHudSection(document, 'Booster Info', [
      createBooleanSetting(document, 'hud-info-boosters', 'Booster-Info'),
      createHudChoiceSetting(document, 'hud-booster-name-mode', 'Booster type color', HUD_INFO_BOOSTER_COLOR_MODES),
      createHudBoosterColorSetting(document, 'hud-booster-merge-color', 'Merge'),
      createHudBoosterColorSetting(document, 'hud-booster-speed-color', 'Speed'),
      createHudBoosterColorSetting(document, 'hud-booster-virus-color', 'VIRUS'),
      createHudChoiceSetting(document, 'hud-booster-duration-mode', 'Booster duration color', HUD_INFO_BOOSTER_DURATION_COLOR_MODES),
      createBooleanSetting(document, 'hud-booster-last-sec-flash', 'Last-Sec-Flash'),
    ]),
    createHudSection(document, 'Style', [
      createHudSizeSetting(document),
      createHudColorSetting(document),
    ]),
  );
  return category;
}

function createHudSection(document, titleText, children) {
  const section = document.createElement('div');
  section.classList.add('blobio-hud-section');

  const title = document.createElement('div');
  title.classList.add('blobio-hud-section-title');
  title.textContent = titleText;

  section.append(title, ...children);
  return section;
}

export function createFontSetting(document, name, labelText, limits) {
  const group = document.createElement('div');
  group.classList.add('blobio-ui-setting-group', 'blobio-ui-font-setting');
  group.dataset.setting = name;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.classList.add('blobio-chat-font-toggle', 'blobio-setting-toggle');

  const label = document.createElement('div');
  label.classList.add('blobio-chat-font-label');
  label.textContent = labelText;

  const controls = document.createElement('div');
  controls.classList.add('blobio-chat-font-controls');

  const range = document.createElement('input');
  range.type = 'range';
  range.classList.add('blobio-chat-font-range', 'blobio-themed-range');
  range.min = String(limits.min);
  range.max = String(limits.max);
  range.step = '1';

  const number = document.createElement('input');
  number.type = 'number';
  number.classList.add('blobio-chat-font-number');
  number.min = String(limits.min);
  number.max = String(limits.max);
  number.step = '1';
  number.setAttribute('aria-label', `${labelText} ${name}`);

  controls.append(range, number);
  group.append(toggle, label, controls);
  return group;
}

export function createBooleanSetting(document, name, labelText) {
  const group = document.createElement('div');
  group.classList.add('blobio-ui-setting-group', 'blobio-ui-boolean-setting');
  group.dataset.setting = name;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.classList.add('blobio-chat-font-toggle', 'blobio-setting-toggle');

  const label = document.createElement('div');
  label.classList.add('blobio-chat-font-label');
  label.textContent = labelText;

  group.append(toggle, label);
  return group;
}

export function createColorSetting(document, name, labelText, gradient = false) {
  const group = document.createElement('div');
  group.classList.add('blobio-ui-setting-group', 'blobio-ui-color-setting');
  group.dataset.setting = name;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.classList.add('blobio-chat-font-toggle', 'blobio-setting-toggle');

  const label = document.createElement('div');
  label.classList.add('blobio-chat-font-label');
  label.textContent = labelText;

  const controls = document.createElement('div');
  controls.classList.add('blobio-ui-color-controls');

  const wheel = document.createElement('label');
  wheel.classList.add('blobio-ui-color-wheel');
  const swatch = document.createElement('span');
  swatch.classList.add('blobio-ui-color-swatch');
  const color = document.createElement('input');
  color.type = 'color';
  color.classList.add('blobio-ui-color-input');
  color.setAttribute('aria-label', labelText);
  wheel.append(swatch, color);

  const alpha = document.createElement('input');
  alpha.type = 'range';
  alpha.min = '0';
  alpha.max = '1';
  alpha.step = '0.01';
  alpha.classList.add('blobio-ui-alpha-range', 'blobio-themed-range');
  alpha.setAttribute('aria-label', `${labelText} alpha`);

  const alphaValue = document.createElement('span');
  alphaValue.classList.add('blobio-ui-alpha-value');

  controls.append(wheel, alpha, alphaValue);
  group.append(toggle, label, controls);
  if (gradient) {
    const modes = document.createElement('div');
    modes.className = 'blobio-background-modes';
    const mode = document.createElement('button');
    mode.type = 'button';
    mode.className = 'blobio-hud-mode-button blobio-background-mode';
    mode.setAttribute('aria-label', labelText + ' mode');
    const secondaryWheel = wheel.cloneNode(true);
    secondaryWheel.classList.add('blobio-gradient-control');
    const secondary = secondaryWheel.querySelector('input');
    secondary.className = 'blobio-ui-color-input blobio-secondary-color';
    secondary.setAttribute('aria-label', labelText + ' second color');
    const angle = document.createElement('input');
    angle.type = 'range';
    angle.min = '0';
    angle.max = '360';
    angle.step = '1';
    angle.className = 'blobio-themed-range blobio-gradient-angle blobio-gradient-control';
    angle.setAttribute('aria-label', labelText + ' gradient angle');
    const value = document.createElement('span');
    value.className = 'blobio-gradient-value blobio-gradient-control';
    modes.append(mode, secondaryWheel, angle, value);
    group.appendChild(modes);
    const alphaControls = document.createElement('label');
    alphaControls.className = 'blobio-gradient-alpha-controls blobio-gradient-control';
    const alphaLabel = document.createElement('span');
    alphaLabel.textContent = 'Second color opacity';
    const secondaryAlpha = alpha.cloneNode(true);
    secondaryAlpha.className = 'blobio-themed-range blobio-secondary-alpha';
    secondaryAlpha.setAttribute('aria-label', `${labelText} second color opacity`);
    const secondaryAlphaValue = document.createElement('span');
    secondaryAlphaValue.className = 'blobio-ui-alpha-value blobio-secondary-alpha-value';
    alphaControls.append(alphaLabel, secondaryAlpha, secondaryAlphaValue);
    group.appendChild(alphaControls);
  }
  if (name.endsWith('-outline')) {
    const glowControls = document.createElement('label');
    glowControls.className = 'blobio-outline-glow-controls';
    const glowLabel = document.createElement('span');
    glowLabel.textContent = 'Glow intensity';
    const glow = document.createElement('input');
    glow.type = 'range';
    glow.min = '0';
    glow.max = '1';
    glow.step = '0.01';
    glow.className = 'blobio-themed-range blobio-outline-glow-range';
    glow.setAttribute('aria-label', `${labelText} glow intensity`);
    const value = document.createElement('span');
    value.className = 'blobio-ui-alpha-value blobio-outline-glow-value';
    glowControls.append(glowLabel, glow, value);
    group.appendChild(glowControls);
  }
  return group;
}

export function createMinimapCategory(document) {
  const category = document.createElement('div');
  category.classList.add('blobio-chat-settings-category', 'blobio-minimap-category');
  category.dataset.category = 'minimap';
  category.append(
    createColorSetting(document, 'minimap-background', 'Minimap-BG-Color', true),
    createColorSetting(document, 'minimap-outline', 'Minimap Outline', true),
    createColorSetting(document, 'minimap-glow', 'Custom Glow', true),
    createColorSetting(document, 'minimap-grid', 'Sector Lines'),
    createColorSetting(document, 'minimap-font', 'Sector Labels'),
    createBlurSetting(document, 'minimap-blur'),
  );
  return category;
}

export function createHudModeSetting(document, name, labelText) {
  const group = document.createElement('div');
  group.classList.add('blobio-ui-setting-group', 'blobio-hud-mode-setting');
  group.dataset.setting = name;

  const label = document.createElement('div');
  label.classList.add('blobio-chat-font-label');
  label.textContent = labelText;

  const button = document.createElement('button');
  button.type = 'button';
  button.classList.add('blobio-hud-mode-button');
  button.setAttribute('aria-label', labelText);

  group.append(label, button);
  return group;
}

function createHudChoiceSetting(document, name, labelText, options) {
  const group = document.createElement('div');
  group.classList.add('blobio-ui-setting-group', 'blobio-hud-mode-setting');
  group.dataset.setting = name;

  const label = document.createElement('div');
  label.classList.add('blobio-chat-font-label');
  label.textContent = labelText;

  const choices = document.createElement('div');
  choices.classList.add('blobio-hud-mode-choices');
  choices.dataset.count = String(options.length);
  choices.setAttribute('role', 'group');
  choices.setAttribute('aria-label', labelText);
  for (const [value, text] of options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.mode = value;
    button.textContent = text;
    choices.appendChild(button);
  }

  group.append(label, choices);
  return group;
}

export function createHudSizeSetting(document, name = 'hud-font-size', labelText = 'HUD Font-Size', limits = HUD_INFO_FONT_LIMITS) {
  const group = document.createElement('div');
  group.classList.add('blobio-ui-setting-group', 'blobio-hud-size-setting');
  group.dataset.setting = name;

  const label = document.createElement('div');
  label.classList.add('blobio-chat-font-label');
  label.textContent = labelText;

  const controls = document.createElement('div');
  controls.classList.add('blobio-chat-font-controls');

  const range = document.createElement('input');
  range.type = 'range';
  range.classList.add('blobio-chat-font-range', 'blobio-themed-range');
  range.min = String(limits.min);
  range.max = String(limits.max);
  range.step = '1';

  const number = document.createElement('input');
  number.type = 'number';
  number.classList.add('blobio-chat-font-number');
  number.min = String(limits.min);
  number.max = String(limits.max);
  number.step = '1';
  range.setAttribute('aria-label', name === 'hud-font-size' ? 'HUD font size' : 'Keystroke size');
  number.setAttribute('aria-label', name === 'hud-font-size' ? 'HUD font size' : 'Keystroke size');

  controls.append(range, number);
  group.append(label, controls);
  return group;
}

export function createHudColorSetting(document) {
  const group = document.createElement('div');
  group.classList.add('blobio-ui-setting-group', 'blobio-hud-color-setting');
  group.dataset.setting = 'hud-color';

  const label = document.createElement('div');
  label.classList.add('blobio-chat-font-label');
  label.textContent = 'HUD Text-Color';

  const controls = document.createElement('div');
  controls.classList.add('blobio-ui-color-controls');

  const wheel = document.createElement('label');
  wheel.classList.add('blobio-ui-color-wheel');
  const swatch = document.createElement('span');
  swatch.classList.add('blobio-ui-color-swatch');
  const color = document.createElement('input');
  color.type = 'color';
  color.classList.add('blobio-ui-color-input');
  color.setAttribute('aria-label', 'HUD text color');
  wheel.append(swatch, color);

  const alpha = document.createElement('input');
  alpha.type = 'range';
  alpha.min = '0';
  alpha.max = '1';
  alpha.step = '0.01';
  alpha.classList.add('blobio-ui-alpha-range', 'blobio-themed-range');
  alpha.setAttribute('aria-label', 'HUD text alpha');

  const alphaValue = document.createElement('span');
  alphaValue.classList.add('blobio-ui-alpha-value');

  controls.append(wheel, alpha, alphaValue);
  group.append(label, controls);
  return group;
}

export function createHudBoosterColorSetting(document, name, labelText) {
  const group = createHudColorSetting(document);
  group.classList.add('blobio-hud-booster-color-setting');
  group.dataset.setting = name;
  const label = group.querySelector?.('.blobio-chat-font-label');
  if (label) {
    label.textContent = labelText;
  }
  return group;
}
