export const KEYSTROKE_HUD_STYLE_ID = 'blobio-keystroke-hud-style';
export const KEYSTROKE_HUD_CSS = `
.blobio-keystroke-hud {
  position: fixed;
  z-index: 70;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: calc(7px * var(--blobio-keystroke-scale, 1));
  width: 312px;
  height: 80px;
  padding: calc(6px * var(--blobio-keystroke-scale, 1));
  box-sizing: border-box;
  overflow: hidden;
  border-radius: calc(13px * var(--blobio-keystroke-scale, 1));
  color: var(--blobio-keystroke-font);
  font-family: Arial, sans-serif;
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
}
.blobio-keystroke-hud.is-vertical {
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: repeat(4, minmax(0, 1fr));
}
.blobio-keystroke-hud[hidden] { display: none !important; }
.blobio-keystroke-hud.is-editing {
  pointer-events: auto;
  cursor: grab;
  touch-action: none;
  outline: 1px dashed var(--blobio-keystroke-outline);
  outline-offset: -1px;
}
.blobio-keystroke-hud.is-dragging { cursor: grabbing; }
.blobio-keystroke-key {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(5px * var(--blobio-keystroke-scale, 1));
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--blobio-keystroke-outline);
  border-radius: calc(9px * var(--blobio-keystroke-scale, 1));
  background: var(--blobio-keystroke-fill);
  transition: background-color 380ms ease-out, border-color 380ms ease-out;
}
.blobio-keystroke-key.is-pressed {
  background: var(--blobio-keystroke-highlight);
  border-color: var(--blobio-keystroke-highlight);
  transition-duration: 30ms;
}
.blobio-keystroke-key kbd {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font: 700 calc(19px * var(--blobio-keystroke-scale, 1))/1.15 Arial, sans-serif;
}
.blobio-keystroke-key span {
  font-size: calc(10px * var(--blobio-keystroke-scale, 1));
  font-weight: 600;
  white-space: nowrap;
}
@media (prefers-reduced-motion: reduce) {
  .blobio-keystroke-key { transition: none; }
}
`;
