export const MINIMAP_HUD_STYLE_ID = 'blobio-minimap-hud-style';
export const MINIMAP_HUD_CSS = `
.blobio-minimap-hud {
  position: fixed;
  z-index: 0;
  box-sizing: border-box;
  border: 1px solid var(--blobio-minimap-outline, rgba(255, 255, 255, 0.22));
  border-radius: 8px;
  pointer-events: none;
  overflow: hidden;
  contain: layout style;
}
.blobio-minimap-hud[hidden] { display: none !important; }
.blobio-minimap-content {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
}
.blobio-minimap-outline-enabled {
  --blobio-outline-width: 2px;
  border-width: 3px;
  outline: 1px solid var(--blobio-minimap-outline);
  box-shadow: 0 0 14px var(--blobio-outline-glow);
}
.blobio-minimap-sectors {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  grid-template-rows: repeat(5, minmax(0, 1fr));
}
.blobio-minimap-sector {
  display: grid;
  place-items: center;
  box-sizing: border-box;
  border-right: 1px solid var(--blobio-minimap-grid);
  border-bottom: 1px solid var(--blobio-minimap-grid);
  color: var(--blobio-minimap-font);
  font: 600 var(--blobio-minimap-sector-font, 11px)/1 Arial, sans-serif;
}
.blobio-minimap-sector:nth-child(5n) { border-right: 0; }
.blobio-minimap-sector:nth-child(n + 21) { border-bottom: 0; }
.blobio-minimap-dot {
  position: absolute;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}
`;
