export function pageUnicodeNamesBootstrap(pageWindow = globalThis, flagsFontUrl = '') {
  const win = pageWindow;
  const doc = win.document;
  if (!doc || !['custom.client.blobgame.io', 'blobgame.io'].includes(win.location?.hostname)) return false;
  if (win.__BlobioUnicodeNames) return true;

  const cache = new Map();
  const maxBytes = 16 * 1024 * 1024;
  const font = '700 64px "Blobio Flags", Ubuntu, "Segoe UI", Arial, "Segoe UI Emoji", sans-serif';
  const segmenter = typeof win.Intl?.Segmenter === 'function'
    ? new win.Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  const state = { draws: 0, ownDraws: 0, rasterizations: 0, bytes: 0, errors: 0, lastError: '', lastName: '', invalidated: false, flagsFont: 'unavailable' };
  const tint = { d: 1, c: 1, b: 1, a: 1 };
  let retryAt = 0;
  let frameTime = Date.now();
  let nextSweep = frameTime + 5000;

  win.__BlobioUnicodeNames = state;
  win.__BlobioUnicodeNameDraw = drawName;
  win.__BlobioUnicodeNameBeginFrame = (batch, flush) => {
    frameTime = Date.now();
    if (frameTime < nextSweep) return;
    nextSweep = frameTime + 5000;
    let flushed = false;
    for (const [key, entry] of cache) {
      if (frameTime - entry.lastSeen < 30000) continue;
      if (!flushed) { flush(batch); flushed = true; }
      entry.dispose(entry.texture.v);
      state.bytes -= entry.bytes;
      cache.delete(key);
    }
  };
  win.BlobioUnicodeNamesDebug = () => ({ ...state, cachedNames: cache.size });
  doc.fonts?.addEventListener?.('loadingdone', () => { state.invalidated = true; });
  doc.addEventListener?.('webglcontextlost', () => clearCache(false), true);
  doc.addEventListener?.('webglcontextrestored', () => { state.invalidated = true; }, true);
  win.addEventListener?.('pagehide', () => clearCache(true));
  if (flagsFontUrl && win.FontFace && doc.fonts) {
    try {
      // Binary font data avoids both page-fetch interception and font-src URL restrictions.
      const binary = win.atob(flagsFontUrl.slice(flagsFontUrl.indexOf(',') + 1));
      const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
      const face = new win.FontFace('Blobio Flags', bytes.buffer, { weight: '700' });
      state.flagsFont = 'loading';
      face.load().then(() => {
        doc.fonts.add(face);
        state.flagsFont = 'loaded';
        state.invalidated = true;
      }).catch(reportFontError);
    } catch (error) {
      reportFontError(error);
    }
  }
  return true;

  function reportFontError(error) {
    state.flagsFont = 'failed';
    win.console?.warn?.('[Blobio] Flag font could not be loaded; using available system fonts.', error);
  }

  function clearCache(dispose) {
    for (const entry of cache.values()) {
      if (dispose) entry.dispose(entry.texture.v);
    }
    cache.clear();
    state.bytes = 0;
    state.invalidated = false;
  }

  function rasterize(text, color) {
    const canvas = doc.createElement('canvas');
    let context = canvas.getContext('2d');
    if (!context) return null;
    // Shape the complete run so joining scripts, combining marks and emoji stay intact.
    const firstLetter = text.match(/\p{L}/u)?.[0] || '';
    const direction = /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}]/u.test(firstLetter) ? 'rtl' : 'ltr';
    context.font = font;
    context.direction = direction;
    context.textAlign = 'left';
    const metrics = context.measureText(text);
    const left = Math.max(0, metrics.actualBoundingBoxLeft || 0);
    const right = Math.max(metrics.width, metrics.actualBoundingBoxRight || 0);
    const ascent = Math.max(1, metrics.actualBoundingBoxAscent || 50);
    const descent = Math.max(0, metrics.actualBoundingBoxDescent || 0);
    const padding = 4;
    const width = Math.max(1, left + right);
    const height = ascent + descent;
    const rasterScale = Math.min(2, 2048 / (width + padding * 2), 512 / (height + padding * 2));
    canvas.width = Math.ceil((width + padding * 2) * rasterScale);
    canvas.height = Math.ceil((height + padding * 2) * rasterScale);
    context = canvas.getContext('2d');
    context.scale(rasterScale, rasterScale);
    context.font = font;
    context.direction = direction;
    context.textAlign = 'left';
    context.textBaseline = 'alphabetic';
    context.lineJoin = 'round';
    context.lineWidth = 2;
    context.strokeStyle = '#1d1d1d';
    context.fillStyle = color;
    context.strokeText(text, padding + left, padding + ascent);
    context.fillText(text, padding + left, padding + ascent);
    let characters = 0;
    for (const unused of segmenter ? segmenter.segment(text) : text) characters += 1;
    return { canvas, width, height, padding, characters };
  }

  function drawName(cell, bitmapFont, batch, layout, createTexture, drawTexture, setColor, flush, dispose) {
    const text = cell?.B;
    if (typeof text !== 'string' || !/[^\x20-\x7e]/.test(text) || cell.c?.M !== 1) return false;
    if (!(cell.M > 0) || typeof createTexture !== 'function') return false;
    const color = bitmapFont.a.a;
    const fill = `rgb(${Math.round(color.d * 255)},${Math.round(color.c * 255)},${Math.round(color.b * 255)})`;
    const key = fill + '\n' + text;
    let entry = cache.get(key);
    const previousColor = batch.f;
    try {
      if (state.invalidated) {
        flush(batch);
        clearCache(true);
        entry = null;
      }
      if (!entry) {
        if (Date.now() < retryAt) return false;
        const image = rasterize(text, fill);
        if (!image) return false;
        // Texture uploads and eviction must not change bindings underneath a queued draw.
        flush(batch);
        const bytes = image.canvas.width * image.canvas.height * 4;
        while (cache.size && (cache.size >= 128 || state.bytes + bytes > maxBytes)) {
          const oldest = cache.keys().next().value;
          const removed = cache.get(oldest);
          removed.dispose(removed.texture.v);
          state.bytes -= removed.bytes;
          cache.delete(oldest);
        }
        const texture = createTexture(image.canvas);
        entry = { ...image, canvas: null, texture, dispose, bytes, lastSeen: frameTime };
        cache.set(key, entry);
        state.bytes += bytes;
        state.rasterizations += 1;
      }
      entry.lastSeen = frameTime;
      const height = cell.M * 1.95 / Math.max(3, entry.characters);
      const scale = Math.min(height / entry.height, cell.N * 0.9 / entry.width);
      const width = entry.width * scale;
      const drawnHeight = entry.height * scale;
      const x = cell.R - width / 2;
      const y = cell.S - drawnHeight / 2 + ((cell.u || cell.r) ? (cell.N / 4 | 0) : 0);
      tint.a = color.a;
      setColor(batch, tint);
      drawTexture(batch, entry.texture, x - entry.padding * scale, y - entry.padding * scale,
        (entry.width + entry.padding * 2) * scale, (entry.height + entry.padding * 2) * scale);
      layout.d = width;
      layout.b = drawnHeight;
      const bounds = bitmapFont.a.__blobioUnicodeBounds || {};
      bounds.top = y - scale;
      bounds.bottom = y + drawnHeight + scale;
      bitmapFont.a.__blobioUnicodeBounds = bounds;
      state.draws += 1;
      if (cell.p) state.ownDraws += 1;
      state.lastName = text;
      return true;
    } catch (error) {
      retryAt = Date.now() + 5000;
      state.errors += 1;
      const message = error?.message || String(error);
      if (state.lastError !== message) win.console?.warn?.('[Blobio] Unicode name rendering failed.', error);
      state.lastError = message;
      return false;
    } finally {
      batch.f = previousColor;
    }
  }
}
