export const FRIEND_MINIMAP_KEYS = {
  enabled: 'blobio.settings.friendMinimapName',
  color: 'blobio.settings.friendMinimapName.color',
  mode: 'blobio.settings.friendMinimapName.mode',
  nameMode: 'blobio.settings.friendMinimapName.nameMode',
  inGameColor: 'blobio.settings.friendMinimapName.inGameColor',
};
export const FRIEND_MINIMAP_DEFAULT_COLOR = '#ffffff';

export function readFriendMinimapSettings(storage) {
  const enabled = storage?.getItem?.(FRIEND_MINIMAP_KEYS.enabled);
  const color = storage?.getItem?.(FRIEND_MINIMAP_KEYS.color);
  const inGameColor = storage?.getItem?.(FRIEND_MINIMAP_KEYS.inGameColor);
  return {
    enabled: enabled == null ? true : enabled === '1',
    color: /^#[0-9a-f]{6}$/i.test(color || '') ? color.toLowerCase() : FRIEND_MINIMAP_DEFAULT_COLOR,
    mode: storage?.getItem?.(FRIEND_MINIMAP_KEYS.mode) === 'bracket' ? 'bracket' : 'normal',
    nameMode: storage?.getItem?.(FRIEND_MINIMAP_KEYS.nameMode) === 'onlyProfile' ? 'onlyProfile' : 'both',
    inGameColor: /^#[0-9a-f]{6}$/i.test(inGameColor || '') ? inGameColor.toLowerCase() : FRIEND_MINIMAP_DEFAULT_COLOR,
  };
}

export function saveFriendMinimapSettings(storage, nextSettings) {
  const settings = readFriendMinimapSettings(storage);
  if (nextSettings && 'enabled' in nextSettings) {
    settings.enabled = Boolean(nextSettings.enabled);
    storage?.setItem?.(FRIEND_MINIMAP_KEYS.enabled, settings.enabled ? '1' : '0');
  }
  if (nextSettings && 'color' in nextSettings) {
    settings.color = /^#[0-9a-f]{6}$/i.test(nextSettings.color || '')
      ? nextSettings.color.toLowerCase()
      : FRIEND_MINIMAP_DEFAULT_COLOR;
    storage?.setItem?.(FRIEND_MINIMAP_KEYS.color, settings.color);
  }
  if (nextSettings && 'mode' in nextSettings) {
    settings.mode = nextSettings.mode === 'bracket' ? 'bracket' : 'normal';
    storage?.setItem?.(FRIEND_MINIMAP_KEYS.mode, settings.mode);
  }
  if (nextSettings && 'nameMode' in nextSettings) {
    settings.nameMode = nextSettings.nameMode === 'onlyProfile' ? 'onlyProfile' : 'both';
    storage?.setItem?.(FRIEND_MINIMAP_KEYS.nameMode, settings.nameMode);
  }
  if (nextSettings && 'inGameColor' in nextSettings) {
    settings.inGameColor = /^#[0-9a-f]{6}$/i.test(nextSettings.inGameColor || '')
      ? nextSettings.inGameColor.toLowerCase()
      : FRIEND_MINIMAP_DEFAULT_COLOR;
    storage?.setItem?.(FRIEND_MINIMAP_KEYS.inGameColor, settings.inGameColor);
  }
  return settings;
}
