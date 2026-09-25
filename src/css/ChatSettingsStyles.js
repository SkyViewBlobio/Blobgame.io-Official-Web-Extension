import { TASK_COMPLETED_CSS } from './TaskCompletedStyles.js';

export const CHAT_SETTINGS_STYLE_ID = 'blobio-chat-settings-style';

export const CHAT_SETTINGS_CSS = `
#chat,
#chat li,
#chat li span,
#leader-board,
#leader-board li,
#leader-board li span {
  font-family: Ubuntu, "Blobio Flags", "Segoe UI", "Segoe UI Emoji", sans-serif;
}

#chat,
#leader-board {
  font-weight: 500;
}

.blobio-chat-settings-root {
  position: fixed;
  left: var(--blobio-chat-settings-left, 12px);
  top: var(--blobio-chat-settings-top, auto);
  bottom: var(--blobio-chat-settings-bottom, 12px);
  z-index: 80;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-family: Arial, sans-serif;
}

.blobio-chat-settings-toggle,
.blobio-chat-settings-category-button,
.blobio-chat-font-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border: 1px solid rgba(130, 255, 166, 0.72);
  background: rgba(0, 0, 0, 0.74);
  color: #ecfff1;
  text-align: center;
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.76), 0 0 12px rgba(77, 255, 126, 0.74);
  box-shadow: inset 0 0 9px rgba(79, 255, 130, 0.12), 0 0 12px rgba(79, 255, 130, 0.26);
  cursor: pointer;
}

.blobio-chat-settings-toggle {
  flex: 0 0 30px;
  width: 30px;
  height: 30px;
  padding: 0;
  border-radius: 5px;
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
}

.blobio-chat-settings-panel {
  display: none;
  width: 250px;
  max-height: var(--blobio-chat-settings-panel-max-height, min(520px, calc(100vh - 16px)));
  box-sizing: border-box;
  padding: 10px;
  border: 1px solid rgba(130, 255, 166, 0.62);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.78);
  box-shadow: inset 0 0 18px rgba(79, 255, 130, 0.11), 0 0 16px rgba(79, 255, 130, 0.24);
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(100, 232, 133, 0.9) rgba(0, 18, 10, 0.72);
}

.blobio-chat-settings-root.is-open .blobio-chat-settings-panel {
  display: block;
}

.blobio-chat-settings-category-button {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  width: 100%;
  min-height: 34px;
  padding: 7px 10px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 800;
  transition: border-color 300ms ease, box-shadow 300ms ease, color 300ms ease;
}

.blobio-chat-settings-category-button::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background: linear-gradient(135deg, rgba(18, 104, 47, 0.9), rgba(47, 226, 101, 0.28) 58%, rgba(7, 43, 22, 0.82));
  opacity: 0;
  transition: opacity 300ms ease;
  pointer-events: none;
}

.blobio-chat-settings-category-button > span {
  position: relative;
  z-index: 1;
}

.blobio-chat-settings-category-button.has-active-setting {
  border-color: rgba(151, 255, 181, 0.96);
  box-shadow: inset 0 0 12px rgba(65, 255, 122, 0.2), 0 0 15px rgba(65, 255, 122, 0.42);
}

.blobio-chat-settings-category-button.has-active-setting::before {
  opacity: 1;
}

.blobio-chat-settings-category-button::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(110deg, rgba(65, 235, 110, .52), rgba(69, 237, 116, .24) 60%, transparent);
  opacity: 0;
  transition: opacity 300ms ease;
}

.blobio-chat-settings-category-button:hover::after {
  opacity: 1;
}

.blobio-ui-setting-group,
.blobio-chat-font-label,
.blobio-hotkey-row {
  position: relative;
  isolation: isolate;
}

.blobio-ui-setting-group::after,
.blobio-chat-font-label::after,
.blobio-hotkey-row::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(110deg, rgba(26, 141, 62, .48), rgba(69, 237, 116, .16) 60%, transparent);
  opacity: 0;
  transition: opacity 300ms ease;
}

.blobio-ui-setting-group:hover::after,
.blobio-chat-font-label:hover::after,
.blobio-hotkey-row:hover::after {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .blobio-chat-settings-category-button::after,
  .blobio-ui-setting-group::after,
  .blobio-chat-font-label::after,
  .blobio-hotkey-row::after { transition: none; }
}

.blobio-chat-settings-category {
  position: absolute;
  left: calc(100% + 10px);
  top: var(--blobio-chat-settings-category-top, 0px);
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 10px;
  align-items: center;
  width: 330px;
  box-sizing: border-box;
  padding: 10px;
  border: 1px solid rgba(130, 255, 166, 0.62);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.82);
  box-shadow: inset 0 0 18px rgba(79, 255, 130, 0.11), 0 0 16px rgba(79, 255, 130, 0.24);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateX(-6px);
  transition: opacity 456ms ease, transform 456ms cubic-bezier(.22,.61,.36,1), visibility 0s linear 456ms;
}

.blobio-chat-settings-root.is-open .blobio-chat-settings-category.is-open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateX(0);
  transition-delay: 0s;
}

.blobio-chat-font-toggle {
  width: 52px;
  min-height: 28px;
  border-radius: 5px;
  color: #ffb0b0;
  font-size: 12px;
  font-weight: 900;
  text-shadow: 0 0 6px rgba(255, 48, 48, 0.54);
  transition: color 260ms ease, background-color 260ms ease, border-color 260ms ease, box-shadow 260ms ease, text-shadow 260ms ease;
}

.blobio-chat-font-toggle.is-enabled {
  color: #ecfff1;
  border-color: rgba(137, 255, 170, 0.9);
  background: linear-gradient(135deg, rgba(13, 95, 41, 0.92), rgba(30, 157, 68, 0.76));
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.84), 0 0 11px rgba(62, 255, 114, 0.9);
  box-shadow: inset 0 0 9px rgba(79, 255, 130, 0.2), 0 0 14px rgba(79, 255, 130, 0.42);
}

.blobio-chat-font-label {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  box-sizing: border-box;
  padding: 6px 8px;
  border: 1px solid rgba(130, 255, 166, 0.44);
  border-radius: 5px;
  background: rgba(3, 34, 18, 0.72);
  color: #ecfff1;
  font-size: 13px;
  font-weight: 800;
  text-align: center;
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.7), 0 0 11px rgba(77, 255, 126, 0.7);
}

.blobio-chat-font-controls {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr 58px;
  gap: 8px;
  align-items: center;
}

.blobio-chat-font-range {
  width: 100%;
  accent-color: rgb(74, 229, 111);
  transition: opacity 220ms ease;
}

.blobio-chat-font-number {
  width: 58px;
  min-height: 28px;
  box-sizing: border-box;
  border: 1px solid rgba(130, 255, 166, 0.54);
  border-radius: 5px;
  background: rgba(0, 0, 0, 0.76);
  color: #ecfff1;
  font-weight: 800;
  text-align: center;
  outline: none;
  box-shadow: inset 0 0 7px rgba(79, 255, 130, 0.12);
  transition: opacity 220ms ease, border-color 220ms ease;
}

.blobio-chat-font-range:disabled,
.blobio-chat-font-number:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

#chat.blobio-chat-font-size-enabled li,
#chat.blobio-chat-font-size-enabled li span {
  font-size: var(--blobio-chat-font-size, 16px) !important;
}

#cheatsheet.blobio-key-shortcuts-hidden {
  display: none !important;
}

.blobio-chat-settings-tooltip {
  position: fixed;
  z-index: 2147483000;
  max-width: 280px;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid rgba(177, 255, 198, 0.72);
  border-radius: 7px;
  background: rgba(0, 18, 10, 0.94);
  color: #f4fff6;
  font-family: Arial, sans-serif;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.35;
  text-align: center;
  text-shadow: 0 0 6px rgba(255, 255, 255, 0.78), 0 0 12px rgba(77, 255, 126, 0.78);
  box-shadow: inset 0 0 12px rgba(79, 255, 130, 0.14), 0 0 16px rgba(79, 255, 130, 0.42);
  opacity: 0;
  pointer-events: none;
  transform: translateY(3px);
  transition: opacity 120ms ease, transform 120ms ease;
}

.blobio-chat-settings-tooltip.is-visible {
  opacity: 1;
  transform: translateY(0);
}


.blobio-chat-settings-category-button + .blobio-chat-settings-category-button {
  margin-top: 8px;
}

.blobio-chat-settings-panel::-webkit-scrollbar {
  width: 8px;
}

.blobio-chat-settings-panel::-webkit-scrollbar-track {
  border-radius: 8px;
  background: rgba(0, 18, 10, 0.72);
}

.blobio-chat-settings-panel::-webkit-scrollbar-thumb {
  border: 1px solid rgba(200, 255, 214, 0.52);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(111, 244, 145, 0.95), rgba(42, 150, 78, 0.95));
  box-shadow: 0 0 7px rgba(79, 255, 130, 0.42);
}

.blobio-muted-players-category {
  grid-template-columns: 52px 1fr;
}

.blobio-muted-players-label {
  justify-content: flex-start;
  text-align: left;
}

.blobio-muted-players-list {
  grid-column: 1 / -1;
  display: grid;
  gap: 7px;
  max-height: 280px;
  overflow-y: auto;
  padding-right: 3px;
}

.blobio-muted-no-uid-name-list {
  grid-column: 1 / -1;
  display: grid;
  gap: 7px;
  max-height: 150px;
  overflow-y: auto;
  padding-right: 3px;
}

.blobio-muted-players-empty {
  padding: 10px;
  border: 1px dashed rgba(130, 255, 166, 0.36);
  border-radius: 6px;
  color: rgba(236, 255, 241, 0.72);
  font-size: 12px;
  text-align: center;
}

.blobio-muted-player-chip {
  display: grid;
  gap: 2px;
  width: 100%;
  box-sizing: border-box;
  padding: 7px 9px;
  border: 1px solid rgba(130, 255, 166, 0.46);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.7);
  color: #ecfff1;
  cursor: pointer;
  text-align: left;
  box-shadow: inset 0 0 8px rgba(79, 255, 130, 0.08);
  transition: border-color 180ms ease, background-color 180ms ease, box-shadow 180ms ease;
}

.blobio-muted-player-chip:hover {
  border-color: rgba(151, 255, 181, 0.8);
}

.blobio-muted-player-chip.is-selected {
  border-color: rgba(111, 199, 255, 0.96);
  background: rgba(18, 73, 105, 0.78);
  box-shadow: inset 0 0 10px rgba(83, 188, 255, 0.18), 0 0 10px rgba(83, 188, 255, 0.3);
}

.blobio-muted-player-name {
  overflow: hidden;
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.blobio-muted-player-uid {
  color: rgba(213, 255, 225, 0.82);
  font-size: 12px;
  font-weight: 700;
}

.blobio-muted-player-name-input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 5px 7px;
  border: 1px solid rgba(151, 255, 181, 0.88);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.82);
  color: #ffffff;
  font: inherit;
  outline: none;
}

.blobio-muted-no-uid-name-input {
  min-width: 0;
  box-sizing: border-box;
  padding: 6px 8px;
  border: 1px solid rgba(130, 255, 166, 0.54);
  border-radius: 5px;
  background: rgba(0, 0, 0, 0.78);
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
  outline: none;
}

.blobio-muted-no-uid-name-add {
  border-color: rgba(137, 255, 170, 0.9);
  background: linear-gradient(135deg, rgba(13, 95, 41, 0.95), rgba(30, 157, 68, 0.8));
  box-shadow: 0 0 10px rgba(79, 255, 130, 0.25);
}

.blobio-muted-no-uid-name-chip {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

.blobio-muted-no-uid-name-remove {
  min-height: 26px;
  padding: 0 8px;
  border: 1px solid rgba(255, 124, 124, 0.82);
  border-radius: 4px;
  background: rgba(112, 17, 17, 0.86);
  color: #ffffff;
  font-size: 11px;
  font-weight: 900;
  cursor: pointer;
}

.blobio-muted-players-actions {
  grid-column: 1 / -1;
  display: none;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.blobio-muted-players-actions.is-visible {
  display: grid;
}

.blobio-muted-player-action {
  min-height: 31px;
  border: 1px solid;
  border-radius: 5px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}

.blobio-muted-player-add-name {
  border-color: rgba(137, 255, 170, 0.9);
  background: linear-gradient(135deg, rgba(13, 95, 41, 0.95), rgba(30, 157, 68, 0.8));
  box-shadow: 0 0 10px rgba(79, 255, 130, 0.25);
}

.blobio-muted-player-add-name:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.blobio-muted-player-unmute {
  border-color: rgba(255, 124, 124, 0.9);
  background: linear-gradient(135deg, rgba(112, 17, 17, 0.95), rgba(180, 43, 43, 0.82));
  box-shadow: 0 0 10px rgba(255, 67, 67, 0.22);
}

.blobio-hotkey-category {
  grid-template-columns: minmax(0, 1fr);
  align-items: stretch;
}

.blobio-hotkey-text-input {
  width: 100%;
  min-height: 36px;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid rgba(123, 255, 162, 0.94);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.84);
  color: #ffffff;
  font: 700 13px Arial, sans-serif;
  outline: none;
  box-shadow: inset 0 0 10px rgba(67, 255, 122, 0.14), 0 0 13px rgba(67, 255, 122, 0.34);
  transition: border-color 180ms ease, box-shadow 180ms ease;
}

.blobio-hotkey-text-input::placeholder {
  color: rgba(221, 255, 231, 0.62);
}

.blobio-hotkey-text-input:focus {
  border-color: rgb(149, 255, 180);
  box-shadow: inset 0 0 12px rgba(67, 255, 122, 0.2), 0 0 17px rgba(67, 255, 122, 0.52);
}

.blobio-hotkey-list {
  display: grid;
  gap: 7px;
  max-height: 280px;
  overflow-x: hidden;
  overflow-y: auto;
  padding-right: 3px;
}

.blobio-hotkey-empty {
  padding: 10px;
  border: 1px dashed rgba(130, 255, 166, 0.36);
  border-radius: 6px;
  color: rgba(236, 255, 241, 0.72);
  font-size: 12px;
  text-align: center;
}

.blobio-hotkey-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px 42px;
  gap: 7px;
  align-items: stretch;
}

.blobio-hotkey-load,
.blobio-hotkey-bind,
.blobio-hotkey-action {
  box-sizing: border-box;
  border: 1px solid rgba(130, 255, 166, 0.5);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.74);
  color: #ecfff1;
  font-family: Arial, sans-serif;
  cursor: pointer;
}

.blobio-hotkey-load {
  min-width: 0;
  min-height: 38px;
  overflow: hidden;
  padding: 7px 9px;
  font-size: 12px;
  font-weight: 800;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  box-shadow: inset 0 0 8px rgba(79, 255, 130, 0.08);
  transition: border-color 180ms ease, background-color 180ms ease, box-shadow 180ms ease;
}

.blobio-hotkey-load:hover {
  border-color: rgba(151, 255, 181, 0.84);
}

.blobio-hotkey-load.is-selected {
  border-color: rgba(255, 112, 112, 0.96);
  background: rgba(88, 17, 17, 0.76);
  box-shadow: inset 0 0 10px rgba(255, 70, 70, 0.16), 0 0 10px rgba(255, 70, 70, 0.28);
}

.blobio-hotkey-bind {
  width: 42px;
  min-height: 38px;
  padding: 0;
  font-size: 12px;
  font-weight: 900;
  text-align: center;
  text-shadow: 0 0 6px rgba(255, 255, 255, 0.7), 0 0 10px rgba(67, 255, 122, 0.52);
  box-shadow: inset 0 0 8px rgba(79, 255, 130, 0.1);
  transition: border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
}

.blobio-hotkey-bind:focus {
  outline: none;
}

.blobio-hotkey-bind:focus-visible {
  border-color: rgba(151, 255, 181, 0.98);
  box-shadow: inset 0 0 10px rgba(79, 255, 130, 0.2), 0 0 13px rgba(79, 255, 130, 0.46);
}

.blobio-hotkey-bind:hover,
.blobio-hotkey-bind.is-listening {
  border-color: rgba(151, 255, 181, 0.98);
  background: rgba(9, 68, 31, 0.88);
  box-shadow: inset 0 0 10px rgba(79, 255, 130, 0.2), 0 0 13px rgba(79, 255, 130, 0.46);
}

.blobio-hotkey-bind.is-listening {
  animation: blobio-hotkey-listening 900ms ease-in-out infinite alternate;
}

.blobio-hotkey-action {
  display: none;
  width: 100%;
  min-height: 33px;
  padding: 7px 10px;
  font-size: 12px;
  font-weight: 900;
}

.blobio-hotkey-action.is-visible {
  display: block;
}

.blobio-hotkey-apply {
  border-color: rgba(137, 255, 170, 0.92);
  background: linear-gradient(135deg, rgba(13, 95, 41, 0.96), rgba(30, 157, 68, 0.82));
  box-shadow: 0 0 11px rgba(79, 255, 130, 0.28);
}

.blobio-hotkey-remove {
  border-color: rgba(255, 124, 124, 0.94);
  background: linear-gradient(135deg, rgba(112, 17, 17, 0.96), rgba(180, 43, 43, 0.84));
  box-shadow: 0 0 11px rgba(255, 67, 67, 0.26);
}

@keyframes blobio-hotkey-listening {
  from { filter: brightness(0.95); }
  to { filter: brightness(1.35); }
}

.blobio-chat-notification-host {
  position: fixed;
  z-index: 95;
  pointer-events: none;
  transform: translateY(-100%);
}

.blobio-chat-notification {
  box-sizing: border-box;
  width: 100%;
  padding: 9px 11px;
  border: 1px solid;
  border-radius: 7px;
  color: #ffffff;
  font: 700 12px/1.35 Arial, sans-serif;
  text-align: center;
  opacity: 1;
  transform: translateY(0);
  transition: opacity 420ms ease, transform 420ms ease;
}

.blobio-chat-notification.is-success {
  border-color: rgba(137, 255, 170, 0.94);
  background: rgba(10, 91, 38, 0.94);
  box-shadow: 0 0 14px rgba(79, 255, 130, 0.4);
}

.blobio-chat-notification.is-error {
  border-color: rgba(255, 124, 124, 0.98);
  background: rgba(121, 13, 13, 0.96);
  box-shadow: 0 0 14px rgba(255, 54, 54, 0.48);
  animation: blobio-chat-error-flash 520ms ease-in-out 2;
}

.blobio-chat-notification.is-leaving {
  opacity: 0;
  transform: translateY(-6px);
}


@keyframes blobio-chat-error-flash {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.75); }
}


.blobio-chat-settings-category {
  max-height: min(520px, calc(100vh - 16px));
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(100, 232, 133, 0.9) rgba(0, 18, 10, 0.72);
}

.blobio-chat-settings-category::-webkit-scrollbar {
  width: 8px;
}

.blobio-chat-settings-category::-webkit-scrollbar-track {
  border-radius: 8px;
  background: rgba(0, 18, 10, 0.72);
}

.blobio-chat-settings-category::-webkit-scrollbar-thumb {
  border: 1px solid rgba(200, 255, 214, 0.52);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(111, 244, 145, 0.95), rgba(42, 150, 78, 0.95));
  box-shadow: 0 0 7px rgba(79, 255, 130, 0.42);
}

.blobio-chat-appearance-category,
.blobio-leaderboard-category,
.blobio-minimap-category { display: block; }
.blobio-background-modes { grid-column: 1 / -1; display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.blobio-background-modes .blobio-hud-mode-button { width: 112px; flex: 0 0 112px; }
.blobio-background-modes .blobio-gradient-angle { width: 100%; min-width: 0; }
.blobio-background-modes .blobio-ui-color-wheel { flex-shrink: 0; }
.blobio-gradient-control[hidden] { display: none !important; }
.blobio-gradient-value { min-width: 32px; font-size: 11px; }
.blobio-keystroke-category {
  display: block;
}

.blobio-keystroke-category .blobio-hud-color-setting {
  grid-template-columns: minmax(0, 1fr);
}

.blobio-hud-info-category {
  display: block;
}

.blobio-hud-info-category {
  width: 390px;
  padding: 12px;
}

.blobio-hud-section {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 8px 10px;
  padding-top: 12px;
  margin-top: 12px;
  border-top: 1px solid rgba(130, 255, 166, 0.24);
}

.blobio-hud-section:first-child {
  padding-top: 0;
  margin-top: 0;
  border-top: 0;
}

.blobio-hud-section-title {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 22px;
  color: #f4fff6;
  font-size: 15px;
  font-weight: 900;
  text-align: center;
  text-shadow: 0 0 7px rgba(255, 255, 255, 0.78), 0 0 14px rgba(77, 255, 126, 0.72);
}

.blobio-hud-section-title::before,
.blobio-hud-section-title::after {
  content: '';
  flex: 1 1 auto;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(141, 255, 173, 0.68), transparent);
}

.blobio-hud-section .blobio-ui-setting-group + .blobio-ui-setting-group {
  margin-top: 0;
  padding-top: 0;
  border-top: 0;
}

.blobio-hud-info-category .blobio-hud-mode-setting {
  grid-template-columns: minmax(108px, 0.72fr) minmax(0, 1.28fr);
}

.blobio-hud-info-category .blobio-hud-mode-setting .blobio-chat-font-label {
  justify-content: center;
}

.blobio-hud-info-category .blobio-hud-mode-setting[data-setting="hud-position"] {
  grid-template-columns: minmax(0, 1fr);
  gap: 6px;
}

.blobio-hud-mode-choices {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 3px;
  min-width: 0;
  padding: 3px;
  border: 1px solid rgba(147, 255, 177, 0.56);
  border-radius: 999px;
  background: rgba(0, 18, 10, 0.82);
  box-shadow: inset 0 0 9px rgba(79, 255, 130, 0.12), 0 0 9px rgba(79, 255, 130, 0.2);
}

.blobio-hud-mode-choices[data-count="3"],
.blobio-hud-mode-choices[data-count="6"] {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.blobio-hud-mode-choices[data-count="6"] {
  border-radius: 12px;
}

.blobio-hud-mode-choices button {
  appearance: none;
  min-width: 0;
  min-height: 26px;
  padding: 4px 2px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #c8f5d4;
  font: inherit;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.15;
  white-space: nowrap;
  cursor: pointer;
}

.blobio-hud-mode-choices[data-count="6"] button {
  border-radius: 8px;
}

.blobio-hud-mode-choices button.is-selected {
  background: linear-gradient(145deg, #baffca, #35c968);
  color: #06331d;
  box-shadow: 0 0 8px rgba(79, 255, 130, 0.42);
}

.blobio-hud-mode-choices button:hover:not(.is-selected),
.blobio-hud-mode-choices button:focus-visible:not(.is-selected) {
  background: rgba(100, 232, 133, 0.17);
  outline: none;
}

.blobio-hud-info-category .blobio-hud-size-setting,
.blobio-hud-info-category .blobio-hud-color-setting {
  grid-template-columns: minmax(0, 1fr);
}

.blobio-ui-setting-group {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 8px 10px;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
}

.blobio-ui-setting-group.is-hidden {
  display: none;
}

.blobio-ui-setting-group + .blobio-ui-setting-group {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(130, 255, 166, 0.2);
}

.blobio-cell-pause-setting {
  grid-template-columns: 52px minmax(0, 1fr) 42px;
}

.blobio-ui-color-controls,
.blobio-ui-setting-group .blobio-chat-font-controls {
  grid-column: 1 / -1;
}

.blobio-ui-color-controls {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 48px;
  gap: 8px;
  align-items: center;
}

.blobio-ui-color-wheel {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  overflow: hidden;
  border: 1px solid rgba(170, 255, 192, 0.72);
  border-radius: 50%;
  background: conic-gradient(red, yellow, lime, cyan, blue, magenta, red);
  box-shadow: 0 0 10px rgba(79, 255, 130, 0.28);
  cursor: pointer;
}

.blobio-ui-color-swatch {
  width: 17px;
  height: 17px;
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-radius: 50%;
  pointer-events: none;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.72);
}

.blobio-ui-color-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.blobio-ui-alpha-value {
  min-width: 44px;
  color: #ecfff1;
  font-size: 12px;
  font-weight: 800;
  text-align: center;
  text-shadow: 0 0 8px rgba(77, 255, 126, 0.68);
}

.blobio-ui-color-setting.is-disabled .blobio-ui-color-controls {
  opacity: 0.5;
}

.blobio-animation-speed-category {
  display: block;
}

.blobio-animation-speed-controls {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 54px;
  gap: 8px;
  align-items: center;
}

.blobio-animation-speed-value {
  color: #ecfff1;
  font-size: 12px;
  font-weight: 800;
  text-align: right;
  text-shadow: 0 0 8px rgba(77, 255, 126, 0.68);
  font-variant-numeric: tabular-nums;
}

.blobio-animation-speed-mode {
  grid-column: 1 / -1;
  justify-self: stretch;
  min-height: 28px;
  border: 1px solid rgba(147, 255, 177, 0.58);
  border-radius: 6px;
  background: rgba(0, 22, 13, 0.84);
  color: #ecfff1;
  font: inherit;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
  outline: 1px solid rgba(176, 255, 198, 0.32);
  outline-offset: 2px;
  box-shadow: inset 0 0 8px rgba(79, 255, 130, 0.12), 0 0 11px rgba(79, 255, 130, 0.34);
}

.blobio-animation-speed-mode:hover,
.blobio-animation-speed-mode:focus-visible {
  border-color: rgba(196, 255, 211, 0.82);
  background: rgba(5, 48, 25, 0.92);
  outline-color: rgba(217, 255, 226, 0.72);
  box-shadow: inset 0 0 9px rgba(79, 255, 130, 0.18), 0 0 15px rgba(79, 255, 130, 0.52);
}

.blobio-animation-speed-mode[data-mode="unsafe"] {
  border-color: rgba(255, 190, 113, 0.76);
  background: rgba(48, 26, 5, 0.88);
  box-shadow: inset 0 0 8px rgba(255, 170, 67, 0.13), 0 0 9px rgba(255, 170, 67, 0.22);
}

.blobio-animation-speed-range-label {
  grid-column: 1 / -1;
  color: rgba(223, 255, 230, 0.82);
  font-size: 11px;
  font-weight: 800;
  text-align: left;
  font-variant-numeric: tabular-nums;
}

.blobio-animation-speed-reset {
  grid-column: 1 / -1;
  justify-self: stretch;
  min-height: 30px;
  border: 1px solid rgba(147, 255, 177, 0.52);
  border-radius: 6px;
  background: rgba(0, 18, 10, 0.78);
  color: #dfffe6;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: inset 0 0 8px rgba(79, 255, 130, 0.12), 0 0 8px rgba(79, 255, 130, 0.18);
}

.blobio-animation-speed-reset:hover,
.blobio-animation-speed-reset:focus-visible {
  border-color: rgba(196, 255, 211, 0.78);
  background: rgba(5, 48, 25, 0.9);
}

.blobio-animation-speed-setting.is-disabled .blobio-animation-speed-controls {
  opacity: 0.68;
}

.blobio-hud-mode-setting {
  grid-template-columns: minmax(0, 1fr);
}

.blobio-hud-mode-button {
  width: 100%;
  min-height: 28px;
  border: 1px solid rgba(147, 255, 177, 0.58);
  border-radius: 6px;
  background: rgba(0, 22, 13, 0.84);
  color: #ecfff1;
  font: inherit;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
  outline: 1px solid rgba(176, 255, 198, 0.32);
  outline-offset: 2px;
  box-shadow: inset 0 0 8px rgba(79, 255, 130, 0.12), 0 0 11px rgba(79, 255, 130, 0.34);
}

.blobio-hud-mode-button:hover,
.blobio-hud-mode-button:focus-visible {
  border-color: rgba(196, 255, 211, 0.82);
  background: rgba(5, 48, 25, 0.92);
  outline-color: rgba(217, 255, 226, 0.72);
  box-shadow: inset 0 0 9px rgba(79, 255, 130, 0.18), 0 0 15px rgba(79, 255, 130, 0.52);
}

.blobio-hud-size-setting,
.blobio-hud-color-setting {
  grid-template-columns: minmax(0, 1fr);
}

.blobio-hud-info-category.is-disabled .blobio-ui-setting-group:not([data-setting="hud-info-enabled"]) {
  opacity: 0.68;
}

.blobio-themed-range {
  width: 100%;
  height: 18px;
  margin: 0;
  padding: 0;
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  cursor: pointer;
}

.blobio-themed-range::-webkit-slider-runnable-track {
  height: 6px;
  border: 1px solid rgba(147, 255, 177, 0.58);
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(18, 94, 43, 0.92), rgba(78, 232, 116, 0.9));
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.58), 0 0 7px rgba(79, 255, 130, 0.24);
}

.blobio-themed-range::-webkit-slider-thumb {
  width: 16px;
  height: 16px;
  margin-top: -6px;
  border: 1px solid rgba(220, 255, 229, 0.95);
  border-radius: 50%;
  appearance: none;
  -webkit-appearance: none;
  background: linear-gradient(145deg, #baffca, #35c968);
  box-shadow: 0 0 9px rgba(79, 255, 130, 0.72), inset 0 0 5px rgba(255, 255, 255, 0.42);
}

.blobio-themed-range::-moz-range-track {
  height: 6px;
  border: 1px solid rgba(147, 255, 177, 0.58);
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(18, 94, 43, 0.92), rgba(78, 232, 116, 0.9));
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.58), 0 0 7px rgba(79, 255, 130, 0.24);
}

.blobio-themed-range::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border: 1px solid rgba(220, 255, 229, 0.95);
  border-radius: 50%;
  background: linear-gradient(145deg, #baffca, #35c968);
  box-shadow: 0 0 9px rgba(79, 255, 130, 0.72), inset 0 0 5px rgba(255, 255, 255, 0.42);
}

.blobio-themed-range:disabled {
  cursor: not-allowed;
}

#chat-wrapper.blobio-chat-background-wrapper {
  background: var(--blobio-chat-background) !important;
}

#chat-wrapper.blobio-chat-blur-enabled,
#chat.blobio-chat-blur-enabled {
  backdrop-filter: blur(var(--blobio-chat-blur, 8px));
}

#leader-board-wrapper.blobio-leaderboard-blur-enabled {
  backdrop-filter: blur(var(--blobio-leaderboard-blur, 8px));
}

#chat.blobio-chat-background-enabled {
  background: var(--blobio-chat-background) !important;
}

#chat-wrapper.blobio-chat-background-wrapper #chat {
  background: transparent !important;
}

#chat.blobio-chat-slider-enabled {
  scrollbar-color: var(--blobio-chat-slider) transparent !important;
}

#chat.blobio-chat-slider-enabled::-webkit-scrollbar-track {
  background: transparent !important;
}

#chat.blobio-chat-slider-enabled::-webkit-scrollbar-thumb {
  background: var(--blobio-chat-slider) !important;
  border-radius: 8px;
}

.blobio-outline-glow-controls,
.blobio-gradient-alpha-controls {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 42px;
  align-items: center;
  gap: 8px;
  color: #ecfff1;
  font-size: 12px;
  font-weight: 700;
}
.blobio-outline-glow-range,
.blobio-secondary-alpha { width: 100%; min-width: 0; }
.blobio-gradient-alpha-controls[hidden] { display: none; }

.blobio-minimap-hud.blobio-gradient-outline,
.blobio-gradient-outline {
  border-width: 0 !important;
  outline: none !important;
  box-shadow: 0 0 14px var(--blobio-outline-glow) !important;
}
.blobio-gradient-outline::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 4;
  padding: var(--blobio-outline-width, 1px);
  border-radius: inherit;
  background: var(--blobio-outline-gradient);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  pointer-events: none;
}
#chat-wrapper.blobio-chat-outline-enabled.blobio-gradient-outline,
#chat.blobio-chat-outline-enabled.blobio-gradient-outline,
#leader-board-wrapper.blobio-leaderboard-outline-enabled.blobio-gradient-outline {
  --blobio-outline-width: 2px;
  border-width: 0 !important;
  outline: none !important;
  box-shadow: 0 0 14px var(--blobio-outline-glow) !important;
}

#chat-wrapper.blobio-chat-outline-enabled,
#chat.blobio-chat-outline-enabled {
  border-color: var(--blobio-chat-outline) !important;
  outline: 1px solid var(--blobio-chat-outline) !important;
  box-shadow: 0 0 14px var(--blobio-outline-glow) !important;
}

#leader-board-wrapper.blobio-leaderboard-background-enabled {
  background: var(--blobio-leaderboard-background) !important;
}

#leader-board-wrapper.blobio-leaderboard-background-enabled #leader-board {
  background: transparent !important;
}

#leader-board-wrapper.blobio-leaderboard-outline-enabled {
  border-color: var(--blobio-leaderboard-outline) !important;
  outline: 1px solid var(--blobio-leaderboard-outline) !important;
  box-shadow: 0 0 14px var(--blobio-outline-glow) !important;
}

.blobio-minimap-hud.blobio-custom-glow,
#chat.blobio-custom-glow,
#chat.blobio-chat-outline-enabled.blobio-custom-glow,
#leader-board-wrapper.blobio-custom-glow,
#leader-board-wrapper.blobio-leaderboard-outline-enabled.blobio-custom-glow,
#leader-board-wrapper.blobio-custom-glow.blobio-leaderboard-custom-size {
  overflow: visible !important;
  isolation: isolate;
  box-shadow: none !important;
}
#chat-wrapper.blobio-custom-glow,
#chat-wrapper.blobio-chat-outline-enabled.blobio-custom-glow {
  overflow: hidden !important;
  isolation: isolate;
  box-shadow: 0 0 14px var(--blobio-custom-glow-shadow) !important;
}
html.blobio-fps-saver-overlay-contain #chat-wrapper.blobio-custom-glow,
html.blobio-fps-saver-overlay-contain #leader-board-wrapper.blobio-custom-glow {
  contain: layout style;
}
.blobio-outline-glow {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  filter: blur(7px);
  z-index: 0;
  pointer-events: none;
}
#chat-wrapper.blobio-custom-glow > .blobio-outline-glow,
#leader-board-wrapper.blobio-custom-glow > .blobio-outline-glow {
  filter: blur(14px);
}
.blobio-outline-glow::before {
  content: '';
  position: absolute;
  inset: -1px;
  padding: 4px;
  border-radius: inherit;
  background: var(--blobio-glow-fill);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
}

#leader-board-wrapper.blobio-leaderboard-font-size-enabled li {
  font-size: var(--blobio-leaderboard-font-size, 16px) !important;
}

#leader-board-wrapper.blobio-leaderboard-resizable {
  box-sizing: border-box !important;
}

#leader-board-wrapper.blobio-leaderboard-relative {
  position: relative !important;
}

#leader-board-wrapper.blobio-leaderboard-custom-size {
  overflow: hidden !important;
}

#leader-board-wrapper.blobio-leaderboard-custom-size #leader-board {
  width: 100% !important;
  max-width: none !important;
  height: 100% !important;
  overflow: auto !important;
  box-sizing: border-box !important;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

#leader-board-wrapper.blobio-leaderboard-custom-size #leader-board::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}

#leader-board-wrapper.blobio-leaderboard-custom-size #leader-board ul {
  width: 100% !important;
  max-width: none !important;
  box-sizing: border-box !important;
}

#leader-board-wrapper.blobio-leaderboard-custom-size #leader-board li {
  display: block !important;
  width: 100% !important;
  max-width: none !important;
  min-width: 0 !important;
  box-sizing: border-box !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.blobio-leaderboard-resize-handle {
  position: absolute;
  left: -1px;
  bottom: -1px;
  z-index: 5;
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 0;
  border-radius: 0 7px 0 7px;
  outline: none;
  background: transparent;
  box-shadow: none;
  cursor: nesw-resize;
  touch-action: none;
  user-select: none;
}

.blobio-leaderboard-resize-handle:hover,
.blobio-leaderboard-resize-handle:focus-visible,
#leader-board-wrapper.blobio-leaderboard-is-resizing .blobio-leaderboard-resize-handle {
  background: transparent;
  box-shadow: none;
}

.blobio-leaderboard-resize-grip {
  width: 9px;
  height: 9px;
  pointer-events: none;
  background:
    linear-gradient(135deg, transparent 42%, rgba(160, 160, 160, 0.85) 43% 52%, transparent 53%) 0 0 / 5px 5px;
  filter: none;
}

.rc-anchor-logo-img.blobio-captcha-logo-hidden,
.rc-anchor-logo-img-large.blobio-captcha-logo-hidden {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  background: none !important;
  background-image: none !important;
  background-color: transparent !important;
}

.rc-anchor-logo-portrait.blobio-captcha-logo-block-hidden,
.rc-anchor-logo-landscape.blobio-captcha-logo-block-hidden {
  display: none !important;
  visibility: hidden !important;
  background: none !important;
  background-color: transparent !important;
}

iframe.blobio-captcha-anchor-hidden,
.grecaptcha-badge.blobio-captcha-anchor-hidden,
.grecaptcha-logo.blobio-captcha-anchor-hidden {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  width: 0 !important;
  height: 0 !important;
  min-width: 0 !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  pointer-events: none !important;
  background: transparent !important;
  box-shadow: none !important;
}

#chat.blobio-smooth-chat li.blobio-chat-message-enter {
  animation: blobio-chat-message-enter 560ms cubic-bezier(0.2, 0.72, 0.22, 1);
  transform-origin: left bottom;
}

#chat.blobio-smooth-chat > ul.blobio-chat-list-shifting,
#chat.blobio-smooth-chat ul.blobio-chat-list-shifting {
  transform: translate3d(0, var(--blobio-chat-shift-offset, 0), 0);
  will-change: transform;
}

@keyframes blobio-chat-message-enter {
  from {
    opacity: 0;
    clip-path: inset(100% 0 0 0);
  }
  to {
    opacity: 1;
    clip-path: inset(0 0 0 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .blobio-chat-settings-category,
  .blobio-chat-settings-category-button,
  .blobio-chat-settings-category-button::before,
  .blobio-chat-font-toggle,
  .blobio-chat-font-range,
  .blobio-chat-font-number,
  .blobio-muted-player-chip,
  .blobio-hotkey-text-input,
  .blobio-hotkey-load,
  .blobio-hotkey-bind,
  .blobio-chat-notification,
  .blobio-leaderboard-resize-handle {
    transition: none;
    animation: none;
  }

}
.blobio-chat-settings-root .blobio-plus-mode-button {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 30px;
  margin-bottom: 10px;
  padding: 3px 4px;
  box-sizing: border-box;
  overflow: hidden;
  border: 1px solid rgba(147, 255, 177, 0.58);
  border-radius: 999px;
  background: rgba(0, 18, 10, 0.82);
  color: #c8f5d4;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: inset 0 0 9px rgba(79, 255, 130, 0.12), 0 0 9px rgba(79, 255, 130, 0.2);
}

.blobio-chat-settings-root .blobio-plus-mode-button::before {
  content: '';
  position: absolute;
  top: 3px;
  left: 4px;
  width: calc((100% - 8px) / 2);
  height: 22px;
  border-radius: 999px;
  background: linear-gradient(145deg, #baffca, #35c968);
  box-shadow: 0 0 9px rgba(79, 255, 130, 0.56);
  transition: transform 180ms ease;
}

.blobio-chat-settings-root .blobio-plus-mode-button.is-tasks::before {
  transform: translateX(100%);
}

.blobio-chat-settings-root .blobio-plus-mode-button > span {
  position: relative;
  z-index: 1;
  width: 50%;
  text-align: center;
}

.blobio-chat-settings-root .blobio-plus-mode-button:not(.is-tasks) > span:first-child,
.blobio-chat-settings-root .blobio-plus-mode-button.is-tasks > span:last-child {
  color: #06331d;
}

.blobio-chat-settings-panel.is-tasks .blobio-plus-settings-list,
.blobio-plus-tasks-view {
  display: none;
}

.blobio-chat-settings-panel.is-tasks .blobio-plus-tasks-view {
  display: grid;
  gap: 8px;
  color: #eaffee;
  font-size: 12px;
}

.blobio-chat-settings-panel:not(.is-tasks) .blobio-plus-settings-list,
.blobio-chat-settings-panel.is-tasks .blobio-plus-tasks-view {
  animation: blobio-plus-view-enter 220ms ease-out;
}

@keyframes blobio-plus-view-enter {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.blobio-plus-tasks-reset {
  color: #c4ffdc;
  font-size: 13px;
  font-weight: 800;
  text-align: center;
}

.blobio-plus-task {
  display: grid;
  gap: 7px;
  padding: 9px;
  border: 1px solid rgba(59, 194, 109, 0.62);
  border-radius: 7px;
  background: linear-gradient(135deg, rgba(5, 75, 48, 0.87), rgba(0, 42, 29, 0.93));
  box-shadow: inset 0 0 12px rgba(74, 220, 136, 0.07);
}

.blobio-plus-task.is-complete {
  border-color: rgba(102, 232, 145, 0.78);
  background: linear-gradient(135deg, rgba(11, 103, 62, 0.92), rgba(0, 59, 39, 0.94));
}

.blobio-plus-task-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
}

.blobio-plus-task-objective {
  min-width: 0;
  line-height: 1.25;
  font-weight: 700;
}

.blobio-plus-task-reward {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex: none;
  color: #ffe38a;
  font-size: 14px;
  font-weight: 800;
}

.blobio-plus-task-reward img {
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.blobio-plus-task-progress {
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(0, 20, 12, 0.8);
  box-shadow: inset 0 0 0 1px rgba(101, 245, 143, 0.22);
}

.blobio-plus-task-progress > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #55e88b, #9bffd0 55%, #5bffa3);
  box-shadow: 0 0 8px rgba(91, 255, 163, 0.55);
}

.blobio-plus-task-count {
  color: #c7f5d9;
  font-size: 11px;
  text-align: right;
}

${TASK_COMPLETED_CSS}

@media (prefers-reduced-motion: reduce) {
  .blobio-chat-settings-root .blobio-plus-mode-button::before { transition: none; }
  .blobio-chat-settings-panel:not(.is-tasks) .blobio-plus-settings-list,
  .blobio-chat-settings-panel.is-tasks .blobio-plus-tasks-view { animation: none; }
}

`;
