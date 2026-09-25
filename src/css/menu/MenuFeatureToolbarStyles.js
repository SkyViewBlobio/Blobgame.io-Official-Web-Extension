import { TASK_COMPLETED_CSS } from '../TaskCompletedStyles.js';

export function buildMenuToolbarCss({ className, hiddenClass, toolbarClass }) {
  return `
.${toolbarClass} {
  position: relative;
  display: inline-block;
  margin-left: 0;
  vertical-align: top;
}

.${toolbarClass}.is-floating {
  position: fixed;
  left: 18px;
  bottom: 82px;
  margin-left: 0;
}

.blobio-menu-buttons {
  display: inline-block;
  position: relative;
  top: 0;
  white-space: nowrap;
}

.blobio-menu-button {
  width: 52px !important;
  height: 52px !important;
  margin-right: 13px !important;
  background-size: 100% auto !important;
  background-position: center center !important;
  background-repeat: no-repeat !important;
}

.blobio-menu-button[data-panel="socials"] {
  background-size: 105% auto !important;
}

.blobio-menu-label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.blobio-menu-panel {
  position: absolute;
  z-index: 2147482500;
  top: calc(100% + 8px);
  left: 0;
  width: min(380px, calc(100vw - 32px));
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-8px) scaleY(0.96);
  transform-origin: top;
  transition: height 520ms cubic-bezier(.4,0,.2,1), max-height 520ms cubic-bezier(.4,0,.2,1), opacity 350ms ease, transform 520ms cubic-bezier(.4,0,.2,1);
  border: 1px solid rgba(35, 192, 107, .55);
  border-radius: 10px;
  background: radial-gradient(ellipse at 50% 0, rgba(8, 78, 52, .88), transparent 68%), linear-gradient(145deg, rgba(0, 60, 40, .98), rgba(0, 32, 24, .98));
  box-shadow: 0 14px 34px rgba(0, 0, 0, .48), 0 0 22px rgba(34, 200, 101, .23), inset 0 0 20px rgba(65, 225, 133, .08);
  color: #eaffee;
  backdrop-filter: blur(5px);
}

.${toolbarClass} > .blobio-menu-panel {
  background: radial-gradient(ellipse at 50% 0, rgba(8, 78, 52, .15), transparent 68%), linear-gradient(145deg, rgba(0, 60, 40, .68), rgba(0, 32, 24, .68));
}

.blobio-menu-panel.is-open {
  max-height: min(var(--blobio-panel-height, 430px), calc(100vh - 110px));
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0) scaleY(1);
}

.blobio-menu-panel.is-open:not(.is-settled) {
  scrollbar-width: none;
}

.blobio-menu-panel.is-open:not(.is-settled)::-webkit-scrollbar {
  display: none;
}

.blobio-menu-panel,
.blobio-update-list {
  scrollbar-width: thin;
  scrollbar-color: rgba(100, 232, 133, 0.88) rgba(0, 18, 10, 0.72);
}

.blobio-menu-panel::-webkit-scrollbar,
.blobio-update-list::-webkit-scrollbar {
  width: 8px;
  background: rgba(0, 18, 10, 0.72);
}

.blobio-menu-panel::-webkit-scrollbar-track,
.blobio-update-list::-webkit-scrollbar-track {
  border-radius: 8px;
  background: rgba(0, 18, 10, 0.72);
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.55);
}

.blobio-menu-panel::-webkit-scrollbar-thumb,
.blobio-update-list::-webkit-scrollbar-thumb {
  border: 1px solid rgba(200, 255, 214, 0.52);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(111, 244, 145, 0.94), rgba(42, 150, 78, 0.94));
  box-shadow: 0 0 7px rgba(79, 255, 130, 0.38);
}

.blobio-menu-panel::-webkit-scrollbar-thumb:hover,
.blobio-update-list::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(151, 255, 177, 0.98), rgba(57, 182, 94, 0.98));
}

@media (prefers-reduced-motion: reduce) {
  .blobio-menu-panel {
    transition: none;
  }
}

#blobio-panel-daily-tasks {
  box-sizing: border-box;
  width: min(420px, calc(100vw - 32px));
}

#blobio-panel-daily-tasks.is-open {
  height: min(var(--blobio-panel-height, 430px), calc(100vh - 110px));
}

.blobio-task-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.blobio-task-mode-button {
  position: relative;
  display: flex;
  align-items: center;
  width: 112px;
  height: 30px;
  padding: 3px 4px;
  border: 1px solid rgba(147, 255, 177, .58);
  border-radius: 999px;
  background: rgba(0, 18, 10, .82);
  color: #c8f5d4;
  font: inherit;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: inset 0 0 9px rgba(79, 255, 130, .12), 0 0 9px rgba(79, 255, 130, .2);
}

.blobio-task-mode-button::before {
  position: absolute;
  top: 3px;
  left: 4px;
  width: 50px;
  height: 22px;
  border-radius: 999px;
  background: linear-gradient(145deg, #baffca, #35c968);
  box-shadow: 0 0 9px rgba(79, 255, 130, .45);
  transition: transform 180ms ease;
  content: '';
}

.blobio-task-mode-button.is-simple::before {
  transform: translateX(52px);
}

.blobio-task-mode-button span {
  z-index: 1;
  width: 50%;
  text-align: center;
}

.blobio-task-mode-button:not(.is-simple) span:first-child,
.blobio-task-mode-button.is-simple span:last-child {
  color: #06331d;
}

#blobio-panel-daily-tasks.is-open {
  overflow-y: hidden;
}

#blobio-panel-daily-tasks.is-open.is-settled {
  overflow-y: auto;
}

@media (prefers-reduced-motion: reduce) {
  #blobio-panel-daily-tasks.is-open {
    overflow-y: auto;
  }
}

.blobio-tasks-reset {
  margin: 0 0 3px;
  color: #c9e9d3;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: .04em;
  text-align: center;
  text-shadow: 0 0 8px rgba(72, 255, 149, .14);
}

#blobio-panel-daily-tasks .blobio-panel-title {
  text-shadow: 0 0 8px rgba(118, 255, 154, .22);
}

.blobio-task {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 10px 11px;
  border: 1px solid rgba(164, 232, 184, .2);
  border-radius: 8px;
  background: linear-gradient(120deg, rgba(179, 255, 207, .11), rgba(226, 255, 237, .045) 65%, rgba(3, 24, 16, .22)), rgba(20, 53, 43, .62);
  box-shadow: 0 6px 16px rgba(0, 0, 0, .18), inset 0 1px rgba(255, 255, 255, .04);
}

.blobio-task.is-complete {
  border-color: rgba(130, 233, 164, .35);
  background: linear-gradient(120deg, rgba(127, 238, 163, .16), rgba(165, 248, 192, .06) 65%, rgba(3, 35, 23, .22)), rgba(20, 62, 45, .62);
}

.blobio-task-top {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.blobio-task-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.blobio-task-copy {
  display: grid;
  gap: 5px;
}

.blobio-task-check {
  flex: none;
  width: 36px;
  height: 36px;
  object-fit: contain;
}

${TASK_COMPLETED_CSS}

@media (prefers-reduced-motion: reduce) {
  .blobio-task-mode-button::before {
    transition: none;
  }
}

.blobio-task-objective {
  color: #dcefe2;
  font-size: 14px;
  line-height: 1.3;
}

.blobio-task-reward {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: none;
  color: #ffe38a;
  font-weight: 700;
}

.blobio-task-reward img {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.blobio-task-progress {
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(4, 32, 22, .65);
  box-shadow: inset 0 0 0 1px rgba(154, 223, 177, .18);
}

.blobio-task-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #55e88b, #9bffd0 55%, #5bffa3);
  box-shadow: 0 0 8px 2px rgba(91, 255, 163, .75), 0 0 16px rgba(72, 255, 136, .55);
}

.blobio-task-count {
  color: #bddbc7;
  font-size: 12px;
  text-align: right;
}

.blobio-tasks-empty {
  padding: 18px 8px;
  color: #c4ffdc;
  text-align: center;
}

.blobio-panel-inner {
  padding: 12px;
  border-radius: 9px;
}

.blobio-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.blobio-panel-title {
  margin: 0;
  font-size: 18px;
  line-height: 1.1;
  color: #dfffe6;
  text-shadow: 0 0 8px rgba(118, 255, 154, 0.68);
}

.blobio-panel-close {
  width: 27px;
  height: 27px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid rgba(255, 105, 105, .9);
  border-radius: 6px;
  background: rgba(102, 10, 16, 0.92);
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  text-shadow: 0 0 6px rgba(60, 0, 0, 0.95), 0 0 10px rgba(255, 42, 42, 0.55);
  box-shadow: 0 0 12px rgba(255, 49, 49, .56), inset 0 0 8px rgba(255, 89, 89, .25);
  cursor: pointer;
}

.blobio-panel-body {
  display: grid;
  gap: 10px;
}

.blobio-panel-section {
  padding: 10px;
  border: 1px solid rgba(40, 192, 105, .6);
  border-radius: 9px;
  background: linear-gradient(135deg, rgba(4, 75, 49, .88), rgba(0, 53, 37, .9) 58%, rgba(0, 38, 29, .94));
  box-shadow: 0 0 12px rgba(24, 190, 91, .14), inset 0 0 14px rgba(74, 220, 136, .06);
}

.blobio-panel-section-title {
  margin: 0 0 9px;
  color: #dfffe6;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.1;
  text-align: center;
  text-shadow: 0 0 7px rgba(118, 255, 154, 0.66);
}

.blobio-video-link {
  display: block;
  padding: 8px;
  border: 1px solid rgba(40, 192, 105, .6);
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(4, 75, 49, .88), rgba(0, 38, 29, .94));
  box-shadow: 0 0 12px rgba(24, 190, 91, .14);
  color: #eaffee;
  text-decoration: none;
}

.blobio-video-thumb {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border: 1px solid rgba(142, 255, 174, 0.38);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.35);
}

.blobio-video-title {
  margin: 7px 0 0;
  font-size: 13px;
  line-height: 1.25;
}

.blobio-update-list {
  max-height: 318px;
  overflow: hidden;
  display: grid;
  gap: 7px;
}

#blobio-panel-updates.is-settled .blobio-update-list {
  overflow: auto;
}

@media (prefers-reduced-motion: reduce) {
  #blobio-panel-updates.is-open .blobio-update-list {
    overflow: auto;
  }
}

.blobio-update-entry {
  display: grid;
  grid-template-columns: 58px 1fr;
  gap: 8px;
  padding: 8px;
  border: 1px solid rgba(40, 192, 105, .5);
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(4, 75, 49, .75), rgba(0, 38, 29, .88));
  box-shadow: 0 0 9px rgba(24, 190, 91, .11);
}

.blobio-update-date {
  color: #96ffad;
  font-size: 12px;
  font-weight: 700;
}

.blobio-update-items {
  margin: 0;
  padding-left: 15px;
  font-size: 12px;
  line-height: 1.3;
}

.blobio-social-title {
  margin: 0;
  text-align: left;
  font-size: 18px;
  font-weight: 700;
  color: #dfffdf;
  text-shadow: 0 0 8px rgba(95, 255, 132, 0.8), 0 0 20px rgba(95, 255, 132, 0.34);
  animation: blobio-social-glow 1700ms ease-in-out infinite alternate;
  animation-play-state: paused;
}

.blobio-menu-panel.is-open .blobio-social-title {
  animation-play-state: running;
}

.blobio-social-row {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.blobio-social-link {
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(40, 192, 105, .6);
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(4, 75, 49, .88), rgba(0, 38, 29, .94));
  box-shadow: 0 0 9px rgba(24, 190, 91, .13), inset 0 0 8px rgba(91, 225, 132, .12);
}

.blobio-social-link:hover {
  box-shadow: 0 0 16px rgba(92, 255, 132, 0.38), inset 0 0 8px rgba(91, 255, 132, 0.18);
}

.blobio-social-link img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.blobio-footer-dock {
  position: fixed;
  left: 50%;
  bottom: 10px;
  transform: translateX(-50%);
  z-index: 20;
  visibility: visible !important;
  pointer-events: auto !important;
}

.blobio-dock-buttons {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.blobio-dock-button {
  padding: 5px 11px;
  border: 1px solid rgba(142, 255, 174, 0.68);
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(4, 75, 49, .88), rgba(0, 38, 29, .94));
  color: #dfffe6;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.1;
  text-shadow: 0 0 6px rgba(118, 255, 154, 0.7);
  box-shadow: 0 0 12px rgba(79, 255, 130, 0.22), inset 0 0 8px rgba(79, 255, 130, 0.13);
  cursor: pointer;
  transition: background 150ms ease, box-shadow 150ms ease;
}

.blobio-dock-button:hover,
.blobio-dock-button.is-active {
  background: rgba(10, 69, 35, 0.64);
  box-shadow: 0 0 16px rgba(99, 255, 142, 0.34), inset 0 0 10px rgba(99, 255, 142, 0.18);
}

.blobio-footer-modal-host {
  position: fixed;
  inset: 0;
  z-index: 2147482500;
  visibility: visible !important;
  pointer-events: none;
}

.blobio-footer-modal-host .blobio-menu-panel {
  position: fixed;
  top: 50%;
  right: auto;
  bottom: auto;
  left: 50%;
  width: min(520px, calc(100vw - 32px));
  max-height: 0;
  overflow: hidden;
  transform: translate(-50%, -48%) scale(0.96);
  transform-origin: center;
}

.blobio-footer-modal-host .blobio-menu-panel.is-open {
  max-height: min(var(--blobio-panel-height, 520px), 520px, calc(100vh - 72px));
  overflow: hidden;
  transform: translate(-50%, -50%) scale(1);
}

.blobio-footer-modal-host .blobio-menu-panel.is-open.is-settled {
  overflow: auto;
}

@media (prefers-reduced-motion: reduce) {
  .blobio-footer-modal-host .blobio-menu-panel.is-open {
    overflow: auto;
  }
}

.blobio-policy-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.blobio-policy-link {
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border: 1px solid rgba(40, 192, 105, .58);
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(4, 75, 49, .88), rgba(0, 38, 29, .94));
  color: #eaffee;
  text-decoration: none;
  font-size: 12px;
  line-height: 1.2;
  text-shadow: 0 0 6px rgba(118, 255, 154, 0.52);
  box-shadow: 0 0 9px rgba(24, 190, 91, .12), inset 0 0 8px rgba(91, 225, 132, .1);
}

.blobio-policy-link:hover {
  color: #a8ffba;
}

.blobio-game-links {
  display: flex;
  justify-content: center;
  gap: 24px;
}

.blobio-game-card {
  display: grid;
  justify-items: center;
  gap: 7px;
}

.blobio-game-label {
  color: #dfffe6;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  text-shadow: 0 0 7px rgba(118, 255, 154, 0.72), 0 0 14px rgba(79, 255, 130, 0.32);
}

.blobio-game-link {
  width: 44px;
  height: 44px;
  border: 1px solid rgba(142, 255, 174, 0.5);
  border-radius: 9px;
  background-color: rgba(3, 30, 17, 0.72);
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  box-shadow: inset 0 0 8px rgba(91, 255, 132, 0.16);
  cursor: pointer;
}

.blobio-game-link:hover {
  box-shadow: 0 0 16px rgba(92, 255, 132, 0.38), inset 0 0 8px rgba(91, 255, 132, 0.18);
}

`;
}
