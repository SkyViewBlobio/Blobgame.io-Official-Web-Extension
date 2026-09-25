export const EXIT_RESULTS_STYLE_ID = 'blobio-exit-results-style';
export const EXIT_RESULTS_CSS = `
#exit-dialog.blobio-exit-results {
  box-sizing: border-box !important;
  width: min(460px, calc(100vw - 32px)) !important;
  height: auto !important;
  max-height: calc(100vh - 24px) !important;
  overflow-y: auto !important;
  scrollbar-width: thin;
  scrollbar-color: #4cae70 rgba(4, 27, 15, .45);
  padding: 26px !important;
  left: 50% !important;
  top: 50% !important;
  transform: translate(-50%, -50%) !important;
  border: 1px solid rgba(79, 191, 119, .65) !important;
  border-radius: 22px !important;
  background: linear-gradient(155deg, rgba(18, 58, 43, .66), rgba(9, 29, 22, .68) 75%) !important;
  backdrop-filter: blur(3px);
  box-shadow: 0 24px 70px rgba(0, 0, 0, .48), 0 0 22px rgba(37, 181, 94, .13) !important;
  color: #effff2 !important;
  font-family: Arial, sans-serif !important;
  z-index: 1000 !important;
}
#exit-dialog.blobio-exit-results::-webkit-scrollbar { width: 8px; }
#exit-dialog.blobio-exit-results::-webkit-scrollbar-track { background: rgba(4, 27, 15, .45); }
#exit-dialog.blobio-exit-results::-webkit-scrollbar-thumb {
  border-radius: 999px; background: #4cae70;
}
#exit-dialog.blobio-exit-results > .blobio-exit-original-score { display: none !important; }
#exit-dialog.blobio-exit-results .dialog-bg { margin: 0; }
#exit-dialog.blobio-exit-results #blobgame-io_multisize {
  position: relative !important; left: auto !important; bottom: auto !important;
  width: max-content; max-width: 100%; margin: 0 auto !important;
}
#exit-dialog.blobio-exit-results #blobgame-io_multisize:has(iframe) {
  margin-top: 22px !important;
}
#exit-dialog.blobio-exit-results .blobio-exit-content,
#exit-dialog.blobio-exit-results .blobio-exit-content * { box-sizing: border-box; }
#exit-dialog.blobio-exit-results .blobio-exit-content { position: relative; }
#exit-dialog.blobio-exit-results .blobio-exit-content div { margin-bottom: 0; }
#exit-dialog.blobio-exit-results .blobio-exit-title {
  width: auto; margin: 0 0 17px; color: #f3fff5;
  font-size: 27px; font-weight: 800; text-align: center;
  text-shadow: 0 0 12px rgba(169, 255, 190, .35);
}
#exit-dialog.blobio-exit-results .blobio-exit-title::after {
  content: ''; display: block; width: 76%; height: 2px;
  margin: 16px auto 0; border-radius: 999px;
  background: linear-gradient(90deg, transparent, #70d895, transparent);
  box-shadow: 0 0 9px rgba(91, 222, 138, .25);
}
#exit-dialog.blobio-exit-results .blobio-exit-stats {
  display: grid; overflow: hidden;
  border: 1px solid rgba(186, 238, 204, .10); border-radius: 12px;
  background: linear-gradient(120deg, rgba(179, 255, 207, .11), rgba(226, 255, 237, .045) 65%, rgba(3, 24, 16, .22));
  box-shadow: inset 0 1px rgba(255, 255, 255, .04);
}
#exit-dialog.blobio-exit-results .blobio-exit-row {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  width: auto; margin: 0; padding: 12px 16px;
  color: #cfe8d6; font-size: 16px; font-weight: 500; text-align: left;
  opacity: 0; transform: translateY(35px) rotate(-4deg);
}
#exit-dialog.blobio-exit-results .blobio-exit-row + .blobio-exit-row {
  border-top: 1px solid rgba(186, 238, 204, .10);
}
#exit-dialog.blobio-exit-results .blobio-exit-row.is-shown {
  animation: blobio-exit-rise 520ms cubic-bezier(.2, .85, .25, 1) both;
}
#exit-dialog.blobio-exit-results .blobio-exit-value {
  color: #a7fac4; display: inline-block; margin-left: auto; white-space: nowrap; font-weight: 600;
}
#exit-dialog.blobio-exit-results .blobio-exit-value.is-bumped { animation: blobio-exit-bump 440ms ease-out; }
#exit-dialog.blobio-exit-results .blobio-exit-row.is-record .blobio-exit-value {
  color: #ffe373; text-shadow: 0 0 10px rgba(255, 224, 82, .7);
}
#exit-dialog.blobio-exit-results .blobio-exit-level {
  position: absolute; z-index: 3; right: -11px; top: 50%;
  display: grid; place-items: center; width: 47px; height: 49px;
  transform: translateY(-50%); pointer-events: none;
}
#exit-dialog.blobio-exit-results .blobio-exit-level img {
  grid-area: 1 / 1; width: 100%; height: 100%; object-fit: contain;
}
#exit-dialog.blobio-exit-results .blobio-exit-level span {
  grid-area: 1 / 1; z-index: 1; padding-top: 2px;
  color: #624100; font: 900 12px Arial, sans-serif;
  text-shadow: 0 1px rgba(255, 255, 255, .55);
}
#exit-dialog.blobio-exit-results .blobio-exit-level.is-level-up {
  animation: blobio-exit-level-glow 3600ms ease-in-out both;
}
#exit-dialog.blobio-exit-results .blobio-exit-level.is-level-up img {
  animation: blobio-exit-level-spin 3600ms both;
}
#exit-dialog.blobio-exit-results .blobio-exit-level.is-level-up span {
  animation: blobio-exit-level-pulse 3600ms ease-in-out both;
}
#exit-dialog.blobio-exit-results .blobio-exit-progress {
  position: relative; width: calc(100% - 12px); height: 25px; overflow: visible;
  margin: 23px 0 0;
  border: 1px solid rgba(113, 229, 145, .48); border-radius: 999px;
  background: linear-gradient(90deg, #03130c, #071b13 65%);
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, .3);
}
#exit-dialog.blobio-exit-results .blobio-exit-progress-fill {
  height: 100%; width: 0; border-radius: inherit;
  background: linear-gradient(90deg, #09371f, #207d4d 32%, #70e9a0 100%);
  box-shadow: 0 0 11px rgba(89, 225, 137, .38);
}
#exit-dialog.blobio-exit-results .blobio-exit-progress-label {
  position: absolute; inset: 0; display: grid; place-items: center;
  color: #fff; font-size: 13px; font-weight: 700; text-shadow: 0 1px 3px #092216;
}
#exit-dialog.blobio-exit-results .blobio-exit-xp-chip {
  position: absolute; left: 50%; bottom: 13px; z-index: 2;
  color: white; font-size: 19px; font-weight: 800; white-space: nowrap;
  text-shadow: 0 0 12px #8df4a9; opacity: 0; pointer-events: none;
  transform: translate(-50%, -20px); transition: opacity 350ms ease, transform 350ms ease;
}
#exit-dialog.blobio-exit-results .blobio-exit-xp-chip.is-visible {
  opacity: 1; transform: translate(-50%, -30px);
}
#exit-dialog.blobio-exit-results .blobio-exit-xp-chip.is-moving {
  animation: blobio-exit-chip 850ms ease-in-out both;
}
#exit-dialog.blobio-exit-results .blobio-exit-actions {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  width: 100%; margin-top: 22px;
}
#exit-dialog.blobio-exit-results .blobio-exit-actions button {
  position: relative; overflow: hidden;
  display: block !important; flex: 1; min-width: 0; width: auto !important;
  height: 44px !important; margin: 0 !important; border: 0 !important;
  border-radius: 11px !important; color: white !important;
  font: 700 15px Arial, sans-serif !important; cursor: pointer;
  transition: transform 220ms ease, box-shadow 220ms ease, filter 220ms ease;
}
#exit-dialog.blobio-exit-results .blobio-exit-actions button::before {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(110deg, transparent 20%, rgba(255, 255, 255, .25) 50%, transparent 80%);
  transform: translateX(-120%); transition: transform 520ms ease;
}
#exit-dialog.blobio-exit-results .blobio-exit-actions button:hover,
#exit-dialog.blobio-exit-results .blobio-exit-actions button:focus-visible {
  transform: translateY(-2px); filter: brightness(1.12);
}
#exit-dialog.blobio-exit-results .blobio-exit-actions button:hover::before,
#exit-dialog.blobio-exit-results .blobio-exit-actions button:focus-visible::before {
  transform: translateX(120%);
}
#exit-dialog.blobio-exit-results .blobio-exit-actions button:focus-visible {
  outline: 2px solid #d7ffe3 !important; outline-offset: 2px;
}
#exit-dialog.blobio-exit-results .blobio-exit-actions button:first-child {
  border: 1px solid rgba(255, 143, 153, .8) !important;
  background: linear-gradient(135deg, #96343b, #d35a59) !important;
  box-shadow: 0 4px 15px rgba(191, 67, 73, .22), 0 0 13px rgba(255, 115, 128, .17);
}
#exit-dialog.blobio-exit-results .blobio-exit-actions #restart-game {
  border: 1px solid rgba(137, 255, 184, .8) !important;
  background: linear-gradient(135deg, #1b7443, #39a96a) !important;
  box-shadow: 0 4px 15px rgba(49, 177, 102, .22), 0 0 13px rgba(105, 255, 164, .17);
}
#exit-dialog.blobio-exit-results .blobio-exit-actions button:first-child:hover,
#exit-dialog.blobio-exit-results .blobio-exit-actions button:first-child:focus-visible {
  box-shadow: 0 7px 20px rgba(211, 78, 83, .37), 0 0 18px rgba(255, 115, 128, .24);
}
#exit-dialog.blobio-exit-results .blobio-exit-actions #restart-game:hover,
#exit-dialog.blobio-exit-results .blobio-exit-actions #restart-game:focus-visible {
  box-shadow: 0 7px 20px rgba(69, 213, 123, .38), 0 0 18px rgba(105, 255, 164, .24);
}
@keyframes blobio-exit-rise { to { opacity: 1; transform: translateY(0) rotate(0); } }
@keyframes blobio-exit-bump { 50% { transform: scale(1.15); } }
@keyframes blobio-exit-level-spin {
  0% { transform: rotate(0deg); animation-timing-function: ease-in; }
  45% { transform: rotate(720deg); animation-timing-function: linear; }
  65% { transform: rotate(1440deg); animation-timing-function: ease-out; }
  100% { transform: rotate(2160deg); }
}
@keyframes blobio-exit-level-glow {
  0%, 100% { filter: drop-shadow(0 0 0 rgba(255, 211, 40, 0)); }
  48%, 65% { filter: drop-shadow(0 0 15px rgba(255, 211, 40, .95)); }
}
@keyframes blobio-exit-level-pulse {
  0%, 34%, 66%, 90%, 100% { transform: scale(1); }
  18%, 52%, 78% { transform: scale(1.3); }
}
@keyframes blobio-exit-chip {
  0% { opacity: 1; transform: translate(-50%, -30px); }
  70% { opacity: 1; transform: translate(-50%, -14px); }
  100% { opacity: 0; transform: translate(-50%, 3px); }
}
@media (prefers-reduced-motion: reduce) {
  #exit-dialog.blobio-exit-results .blobio-exit-row.is-shown,
  #exit-dialog.blobio-exit-results .blobio-exit-value.is-bumped,
  #exit-dialog.blobio-exit-results .blobio-exit-level.is-level-up,
  #exit-dialog.blobio-exit-results .blobio-exit-level.is-level-up img,
  #exit-dialog.blobio-exit-results .blobio-exit-level.is-level-up span,
  #exit-dialog.blobio-exit-results .blobio-exit-xp-chip.is-moving { animation-duration: 1ms; }
  #exit-dialog.blobio-exit-results .blobio-exit-actions button,
  #exit-dialog.blobio-exit-results .blobio-exit-actions button::before,
  #exit-dialog.blobio-exit-results .blobio-exit-xp-chip { transition-duration: 1ms; }
}
`;
