export function encodeNicknameConfig(source) {
  if (typeof source !== 'string' || !source.startsWith('{"i":') || !/[^\x00-\x7f]/.test(source)) {
    return source;
  }

  let config;
  try {
    config = JSON.parse(source);
  } catch {
    return source;
  }
  if (typeof config.u !== 'string'
    || !['p', 's', 't', 'a', 'm', 'sw', 'kb', 'mb'].every(key => Object.prototype.hasOwnProperty.call(config, key))
    || !/[^\x00-\x7f]/.test(config.u)) {
    return source;
  }

  const bytes = new Uint8Array(config.u.length);
  for (let index = 0; index < config.u.length; index += 1) {
    const value = config.u.charCodeAt(index);
    if (value > 255) return source;
    bytes[index] = value;
  }

  try {
    // The front page encodes u as UTF-8 bytes, but flush.js saves it without decoding.
    config.u = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    return source;
  }

  // JSON escapes survive btoa/atob and become real Unicode when flush.js parses the config.
  return JSON.stringify(config).replace(/[\u0080-\uffff]/g,
    character => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

export function installNicknameEncoding(windowRef, logger = console) {
  const original = windowRef?.btoa;
  if (typeof original !== 'function') {
    logger.warn('[Blobio] Nickname encoding could not start: base64 encoding is unavailable.');
    return null;
  }

  function encodeGameConfig(source) {
    return original.call(this, encodeNicknameConfig(source));
  }
  windowRef.btoa = encodeGameConfig;
  return () => {
    if (windowRef.btoa === encodeGameConfig) windowRef.btoa = original;
  };
}
