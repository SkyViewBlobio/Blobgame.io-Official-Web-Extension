export const WATERMARK_KEYS = {
  enabled: 'blobio.settings.watermark.ingame.enabled',
  mode: 'blobio.settings.watermark.ingame.mode',
  color: 'blobio.settings.watermark.ingame.color',
  profileName: 'blobio.settings.watermark.profileName',
};
export const WATERMARK_THEME_COLOR = '#5bff84';
export function readWatermarkSettings(storage) {
  const color = storage.getItem(WATERMARK_KEYS.color);
  return {
    enabled: storage.getItem(WATERMARK_KEYS.enabled) === '1',
    mode: storage.getItem(WATERMARK_KEYS.mode) === 'welcomer' ? 'welcomer' : 'normal',
    color: /^#[0-9a-f]{6}$/i.test(color || '') ? color : WATERMARK_THEME_COLOR,
  };
}
export function watermarkText(version, mode, profileName) {
  return mode === 'welcomer'
    ? `Welcome ${String(profileName || 'Player').trim() || 'Player'}, to BE-v${version}`
    : `BlobExtension v${version}`;
}
