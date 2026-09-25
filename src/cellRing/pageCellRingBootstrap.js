export function pageCellRingBootstrap(initialSettings = {}, pageWindow = globalThis) {
  const win = pageWindow || globalThis;
  const SCRIPT_VERSION = '0.4.1-cell-border-sync-v28';
  const PATCH_REVISION = 'cell-border-sync-v28';
  const host = String(win.location?.hostname || '').toLowerCase();
  if (host && host !== 'custom.client.blobgame.io' && host !== 'blobgame.io') {
    return false;
  }

  if (win.__blobioCellRingInstalled && !needsRuntimeUpgrade()) {
    win.__blobioCellRingRefresh?.(initialSettings);
    return true;
  }

  const previousState = win.__BlobioCellRingState;
  if (win.__blobioCellRingInstalled && previousState?.shader?.sourceCalls > 0) {
    // A downloaded bundle cannot replace hooks already compiled into the game.
    // Keep the running renderer until the matching early loader is reinstalled.
    win.__blobioCellRingRefresh?.(initialSettings);
    if (!previousState.reloadRequired) {
      previousState.reloadRequired = true;
      win.console?.warn?.('[Blobio Glow] Update loader/blobio-loader.user.js from the official public repository and reload: the early loader and bundle have different renderer revisions.');
    }
    return true;
  }

  const CACHE_SCRIPT_RE = /\/html\/[a-f0-9]{32}\.cache\.js(?:[?#].*)?$/i;
  const CELL_LOOP_RE = /if\(!a\.c\|\|!g\|\|!g\.K\|\|!g\.c\)\{continue\}[A-Za-z_$][\w$]*\(g\);/;
  const RENDER_FUNCTION_RE = /function\s+[A-Za-z_$][\w$]*\(a\)\{/;
  const BORDER_TEXTURE_INIT_RE = /([A-Za-z_$][\w$]*)=\(([A-Za-z_$][\w$]*)=new ([A-Za-z_$][\w$]*)\(2,\(([A-Za-z_$][\w$]*)\(\),2\)\),([A-Za-z_$][\w$]*)\(\2,([A-Za-z_$][\w$]*),\6,\6\),([A-Za-z_$][\w$]*)\(\2,1\),\5\(\2,1,1,1\),\7\(\2,0\),([A-Za-z_$][\w$]*)=new ([A-Za-z_$][\w$]*)\(\2,([A-Za-z_$][\w$]*),true\),([A-Za-z_$][\w$]*)\(\(([A-Za-z_$][\w$]*)\(\),([A-Za-z_$][\w$]*)\),([A-Za-z_$][\w$]*)\(\2\.n\)\),new ([A-Za-z_$][\w$]*)\(\8,0,0,\8\.a\.td\(\),\8\.a\.rd\(\)\)\);/;
  const SHADER_PATCH_MARKER = 'BLOBIO_CELL_RING_EXACT_ALPHA_MODES_V18';
  const OPAQUE_ALPHA_CODE = 254;
  const SHADER_ALPHA_CODES = Object.freeze({
    EMPTY_CELL: 190,
    RAINBOW: 204,
    NO_CROP: 216,
    RED_AREA: 228,
    HAS_BORDER: 242,
  });
  const RESERVED_SHADER_ALPHA_CODES = new Set(Object.values(SHADER_ALPHA_CODES));
  const OVERLAY_GLOW_SCALE = 2.2;
  const MAX_GLOW_DRAWS_PER_FRAME = 128;
  const SKIN_SAMPLE_SIZE = 24;
  const MAX_PENDING_SKIN_SAMPLES = 64;
  const MAX_SKIN_SAMPLES_PER_TASK = 2;
  const OVERLAY_RENDER_SCALE = 0.78;
  const OVERLAY_CLASS = 'blobio-cell-ring-overlay';
  const GAME_CANVAS_CLASSES_TO_IGNORE = new Set([
    OVERLAY_CLASS,
    'blobio-cell-clan-tag-overlay',
    'blobio-emote-skin-overlay',
    'hidden',
  ]);

  let settings = normalizeSettings(initialSettings);
  let retryTimer = 0;
  let settingsRevision = 1;
  let glowColorCache = null;
  let glowColorCacheRevision = 0;
  let cellAlphaEncodingCache = null;
  let skinSampleCanvas = null;
  let skinSampleContext = null;
  let skinSampleTimer = 0;
  const skinColorEntries = new WeakMap();
  const cellSkinEntries = new WeakMap();
  const pendingSkinSamples = [];
  const skinColorWeights = new Uint32Array(4096);
  const skinColorRed = new Uint32Array(4096);
  const skinColorGreen = new Uint32Array(4096);
  const skinColorBlue = new Uint32Array(4096);
  // Native setColor packs these channels immediately and never retains the object.
  const drawColor = { d: 1, c: 1, b: 1, a: 1 };
  const overlay = {
    targetCanvas: null,
    cssWidth: 0,
    cssHeight: 0,
    dpr: 1,
    frameDraws: 0,
    lastCanvasScan: 0,
    lastAlignedFrame: -1,
  };
  const state = {
    installed: true,
    version: SCRIPT_VERSION,
    featureName: 'Glow | transparent Cell',
    renderPath: 'native-glow-before-names',
    host,
    settings,
    bundle: {
      callbackWrapped: false,
      callbackCalls: 0,
      seenCacheScripts: 0,
      patchedChunks: 0,
      frameHookPatched: false,
      trackHookPatched: false,
      colorHookPatched: false,
      fragmentShaderHookPatched: false,
      overdrawHookPatched: false,
      borderTextureInitPatched: false,
      borderTextureDrawsPatched: 0,
      playerTextureDrawsPatched: 0,
      lastPatchResult: null,
    },
    shader: {
      glowVertexPatched: false,
      glowFragmentPatched: false,
      sourceCalls: 0,
      patchedCalls: 0,
      lastVariant: 'not-seen',
      lastComparisonsPatched: 0,
      maxComparisonsPatched: 0,
      lastOpacityMultipliersPatched: 0,
      maxOpacityMultipliersPatched: 0,
      lastSourceLength: 0,
      lastError: '',
    },
    markers: {
      colorCalls: 0,
      ownColorCalls: 0,
      otherColorCalls: 0,
      missingColorSkips: 0,
      skinColorMarks: 0,
      normalColorMarks: 0,
      fillCalls: 0,
      customAlphaCalls: 0,
      reservedAlphaCollisions: 0,
      borderSuppressions: 0,
      ownBorderSuppressions: 0,
      foreignBorderSuppressions: 0,
      skinNeutralizations: 0,
      defaultTextureSubstitutions: 0,
      ownDefaultTextureSubstitutions: 0,
      foreignDefaultTextureSubstitutions: 0,
      missingBorderlessTexture: 0,
      legacySkinTexturePassThroughs: 0,
      legacySkinUvPassThroughs: 0,
      colorDecisionSamples: 0,
      lastColorDecision: null,
      skinSamplesQueued: 0,
      skinSamplesCompleted: 0,
      skinSamplesFailed: 0,
      skinSampleCacheHits: 0,
      skinSampleQueueDrops: 0,
      syncedBorderColors: 0,
    },
    overlay: {
      frames: 0,
      draws: 0,
      clearCalls: 0,
      skipped: 0,
      trackCalls: 0,
      trackFrameLimitSkips: 0,
      trackSetupSkips: 0,
      trackViewportSkips: 0,
      trackDrawSkips: 0,
      compileErrors: 0,
      lastError: '',
    },
    errors: [],
  };

  restoreLegacyWebGlWrappers();
  removeStaleOverlay();
  exposeRuntimeHooks();
  installSettingsRefreshBridge();
  installGameScriptPatch();
  return true;

  function exposeRuntimeHooks() {
    win.__blobioCellRingInstalled = true;
    win.__BlobioCellRingState = state;
    win.__blobioCellRingRefresh = refreshSettings;
    win.__BlobioCellRingColor = markCellColor;
    win.__BlobioCellRingFillColor = makeFillColor;
    win.__BlobioCellRingFragmentShader = patchFragmentShaderSource;
    win.__BlobioCellRingVertexShader = patchVertexShaderSource;
    win.__BlobioCellRingTexture = getPlayerDrawTexture;
    // Keep the v16 hooks inert so an in-place runtime upgrade cannot keep
    // cropping real skin artwork before the next full game reload.
    win.__BlobioCellRingSkinTexture = passThroughLegacySkinTexture;
    win.__BlobioCellRingSkinUv = passThroughLegacySkinUv;
    win.__BlobioCellRingUseBorderlessTexture = shouldUseBorderlessTexture();
    win.__BlobioCellRingUseOwnBorderlessTexture = Boolean(settings.enabled && settings.removeOwnCellBorder);
    win.__BlobioCellRingColorAllPlayers = shouldColorAllPlayers();
    win.__BlobioCellRingBeginFrame = beginFrame;
    win.__BlobioCellRingTrack = trackCell;
    win.__blobCellRingDebug = debugReport;
    win.BlobioCellRingDebug = debugReport;
    delete win.BlobioColorResizeTrace;
    delete win.__BlobioColorResizeTrace;
    state.patchBundle = patchBundle;

    if (win.__BLOBIO_CELL_RING_TEST__) {
      win.__BlobioCellRingTestApi = {
        normalizeSettings,
        patchBundle,
        patchFragmentShaderSource,
        patchVertexShaderSource,
        markCellColor,
        makeFillColor,
        trackCell,
        getCellGlowColor,
        hasSkinTexture,
        isOwnCell,
        encodeCellAlpha,
        getPackedAlphaByte,
        getPlayerDrawTexture,
        processSkinColorQueue,
        sampleSkinColor,
        getDecodedSkinImage,
      };
    }
  }

  function refreshSettings(nextSettings = {}) {
    settings = normalizeSettings({
      ...settings,
      ...(nextSettings || {}),
    });
    state.settings = settings;
    settingsRevision += 1;
    glowColorCache = null;
    cellAlphaEncodingCache = null;
    win.__BlobioCellRingUseBorderlessTexture = shouldUseBorderlessTexture();
    win.__BlobioCellRingUseOwnBorderlessTexture = Boolean(settings.enabled && settings.removeOwnCellBorder);
    win.__BlobioCellRingColorAllPlayers = shouldColorAllPlayers();
    return settings;
  }

  function needsRuntimeUpgrade() {
    return win.__BlobioCellRingState?.version !== SCRIPT_VERSION
      || typeof win.__BlobioCellRingColor !== 'function'
      || typeof win.__BlobioCellRingFillColor !== 'function'
      || typeof win.__BlobioCellRingFragmentShader !== 'function'
      || typeof win.__BlobioCellRingVertexShader !== 'function'
      || typeof win.__BlobioCellRingTexture !== 'function'
      || typeof win.__BlobioCellRingSkinTexture !== 'function'
      || typeof win.__BlobioCellRingSkinUv !== 'function'
      || typeof win.__BlobioCellRingTrack !== 'function';
  }

  function installSettingsRefreshBridge() {
    const doc = win.document;
    if (!doc?.addEventListener || doc.__blobioCellRingSettingsBridgeVersion === SCRIPT_VERSION) {
      return;
    }
    doc.__blobioCellRingSettingsBridgeVersion = SCRIPT_VERSION;
    doc.addEventListener('blobio:cell-ring-settings-refresh', (event) => {
      if (event?.detail && typeof event.detail === 'object') {
        refreshSettings(event.detail);
      }
    });
  }

  function normalizeSettings(value = {}) {
    const color = normalizeHexColor(value.solidColor ?? value.sideGlowColor, '#19e6ff');
    const size = Number(value.glowSize);
    const borderWidth = Number(value.borderWidth);
    const mode = String(value.mode ?? value.sideGlowMode ?? 'sync').toLowerCase() === 'solid' ? 'solid' : 'sync';
    const outlineColor = mode === 'solid' && value.outlineColor ? normalizeHexColor(value.outlineColor, null) : null;
    return {
      enabled: value.enabled === undefined ? false : Boolean(value.enabled),
      mode,
      solidColor: color,
      alpha: normalizeAlpha(value.alpha ?? value.sideGlowAlpha, 0.72),
      glowSize: value.glowSize === null || value.glowSize === undefined || value.glowSize === '' || !Number.isFinite(size)
        ? 1 : Math.max(0.25, Math.min(3, Math.round(size * 100) / 100)),
      borderWidth: value.borderWidth === null || value.borderWidth === undefined || value.borderWidth === '' || !Number.isFinite(borderWidth)
        ? 1 : Math.max(0, Math.min(6, Math.round(borderWidth * 4) / 4)),
      outlineColor,
      outlineAlpha: value.outlineAlpha === null || value.outlineAlpha === undefined || value.outlineAlpha === ''
        ? null : normalizeAlpha(value.outlineAlpha, null),
      outlineRed: outlineColor ? parseInt(outlineColor.slice(1, 3), 16) : 0,
      outlineGreen: outlineColor ? parseInt(outlineColor.slice(3, 5), 16) : 0,
      outlineBlue: outlineColor ? parseInt(outlineColor.slice(5, 7), 16) : 0,
      transparentCell: Boolean(value.transparentCell),
      cellAlpha: normalizeAlpha(value.cellAlpha, 0.75),
      nameStyle: normalizeNameStyle(value.nameStyle),
      removeOwnCellBorder: Boolean(value.removeOwnCellBorder),
      removeAllCellBorders: Boolean(value.removeAllCellBorders ?? value.disabledCellRings),
      cellBorderSync: Boolean(value.cellBorderSync),
      syncColor: mode === 'sync',
      red: parseInt(color.slice(1, 3), 16),
      green: parseInt(color.slice(3, 5), 16),
      blue: parseInt(color.slice(5, 7), 16),
      version: String(value.version || ''),
    };
  }

  function normalizeNameStyle(value) {
    const style = String(value || '').toLowerCase();
    return ['normal', 'vip', 'yt'].includes(style) ? style : 'normal';
  }

  function normalizeHexColor(value, fallback) {
    const color = String(value || '').trim().toLowerCase();
    return /^#[0-9a-f]{6}$/.test(color) ? color : fallback;
  }

  function normalizeAlpha(value, fallback) {
    const alpha = Number(value);
    if (!Number.isFinite(alpha)) {
      return fallback;
    }
    return Math.max(0, Math.min(1, Math.round(alpha * 100) / 100));
  }

  function isRuntimeActive() {
    return Boolean(settings.enabled && (
      shouldMarkOwnCells()
      || settings.removeOwnCellBorder
      || settings.removeAllCellBorders
    ));
  }

  function shouldMarkOwnCells() {
    return Boolean(settings.enabled && settings.transparentCell);
  }

  function markCellColor(cell, color, skinDraw) {
    state.markers.colorCalls += 1;

    if (!color) {
      state.markers.missingColorSkips += 1;
      return color;
    }
    const cellType = Number(cell?.c?.M);
    if (cellType !== 1) {
      return color;
    }

    const ownCell = Boolean(cell?.p);
    if (ownCell) {
      state.markers.ownColorCalls += 1;
    } else {
      state.markers.otherColorCalls += 1;
    }

    const featureEnabled = settings.enabled;
    const applyTransparency = ownCell && featureEnabled && settings.transparentCell;
    const removeBorders = featureEnabled && (settings.removeAllCellBorders || (ownCell && settings.removeOwnCellBorder));
    const nativeAlphaByte = getPackedAlphaByte(color.a);
    const skin = skinDraw === undefined
      ? Boolean(!cell?.t && cell?.P)
      : skinDraw === true;
    const syncedColor = settings.cellBorderSync
      && skin
      && !applyTransparency
      && !removeBorders
      && nativeAlphaByte === SHADER_ALPHA_CODES.HAS_BORDER
      ? getResolvedSkinColor(cell)
      : null;
    if (!applyTransparency && !removeBorders && !syncedColor) {
      return color;
    }

    const suppressBorder = removeBorders
      && (nativeAlphaByte === SHADER_ALPHA_CODES.EMPTY_CELL
        || nativeAlphaByte === SHADER_ALPHA_CODES.RAINBOW
        || nativeAlphaByte === SHADER_ALPHA_CODES.HAS_BORDER);
    if (!applyTransparency && !suppressBorder && !syncedColor) {
      return color;
    }

    if (skin) {
      state.markers.skinColorMarks += 1;
      if (!syncedColor) {
        state.markers.skinNeutralizations += 1;
      }
    } else {
      state.markers.normalColorMarks += 1;
    }

    const alpha = applyTransparency ? getCurrentCellAlphaEncoding() : null;

    if (applyTransparency) {
      state.markers.customAlphaCalls += 1;
      if (alpha?.reservedCollision) {
        state.markers.reservedAlphaCollisions += 1;
      }
    }
    if (suppressBorder) {
      state.markers.borderSuppressions += 1;
      if (ownCell) {
        state.markers.ownBorderSuppressions += 1;
      } else {
        state.markers.foreignBorderSuppressions += 1;
      }
    }

    if (state.markers.colorCalls === 1 || (state.markers.colorCalls & 4095) === 0) {
      state.markers.colorDecisionSamples += 1;
      state.markers.lastColorDecision = {
        cellId: String(cell?.b ?? cell?.a ?? cell?.id ?? ''),
        ownCell,
        skinDraw: skin,
        borderColorSynced: Boolean(syncedColor),
        transparencyApplied: applyTransparency,
        borderSuppressed: suppressBorder,
        requestedAlpha: roundDebugNumber(alpha?.requested ?? 1),
        encodedAlpha: roundDebugNumber(alpha?.value ?? 1),
        packedAlphaByte: alpha?.packedByte ?? 254,
        packedShaderAlpha: roundDebugNumber(alpha?.packedShaderAlpha ?? OPAQUE_ALPHA_CODE / 255),
        shaderAlpha: roundDebugNumber(getEffectiveShaderAlpha(alpha?.packedByte ?? OPAQUE_ALPHA_CODE)),
        reservedCollision: Boolean(alpha?.reservedCollision),
        nativeAlphaByte,
        nativeShaderMode: getShaderModeForPackedAlpha(nativeAlphaByte),
      };
    }

    drawColor.d = syncedColor?.r ?? (skin ? 1 : color.d);
    drawColor.c = syncedColor?.g ?? (skin ? 1 : color.c);
    drawColor.b = syncedColor?.b ?? (skin ? 1 : color.b);
    drawColor.a = alpha?.value ?? (suppressBorder ? 1 : color.a);
    if (syncedColor) {
      state.markers.syncedBorderColors += 1;
    }
    return drawColor;
  }

  function getPackedAlphaByte(value) {
    const alpha = Number(value) || 0;
    if (alpha >= 1) return 254;
    if (alpha <= 0) return 0;
    return (alpha * 255) & 0xfe;
  }

  function encodeCellAlpha(value) {
    const requested = Math.max(0, Math.min(1, Number(value) || 0));
    const nativeByte = getPackedAlphaByte(requested);
    let packedByte = nativeByte;
    const reservedCollision = RESERVED_SHADER_ALPHA_CODES.has(nativeByte);

    if (reservedCollision) {
      const candidates = [nativeByte - 2, nativeByte + 2]
        .filter((item) => item >= 0 && item <= 254 && !RESERVED_SHADER_ALPHA_CODES.has(item));
      packedByte = candidates.reduce((best, item) => (
        Math.abs(item / 255 - requested) < Math.abs(best / 255 - requested) ? item : best
      ), candidates[0]);
    }

    return {
      requested,
      value: reservedCollision ? (packedByte + 0.25) / 255 : requested,
      packedByte,
      packedShaderAlpha: packedByte / 255,
      reservedCollision,
      nativePackedByte: nativeByte,
    };
  }

  function getCurrentCellAlphaEncoding() {
    if (!cellAlphaEncodingCache || cellAlphaEncodingCache.requested !== settings.cellAlpha) {
      cellAlphaEncodingCache = encodeCellAlpha(settings.cellAlpha);
    }
    return cellAlphaEncodingCache;
  }

  function getShaderModeForPackedAlpha(packedByte) {
    for (const [mode, code] of Object.entries(SHADER_ALPHA_CODES)) {
      if (code === packedByte) {
        return mode;
      }
    }
    return 'NORMAL_TEXTURE';
  }

  function makeFillColor(cell, color) {
    state.markers.fillCalls += 1;
    return null;
  }

  function isOwnCell(cell) {
    return Boolean(cell?.p && getCellType(cell) === 1);
  }

  function hasSkinTexture(cell) {
    return Boolean(getCellType(cell) === 1 && !cell?.t && cell?.P);
  }

  function getCellType(cell) {
    const type = Number(cell?.c?.M);
    return Number.isFinite(type) ? type : null;
  }

  function shouldUseBorderlessTexture() {
    return Boolean(settings.enabled && settings.removeAllCellBorders);
  }

  function shouldColorAllPlayers() {
    return shouldUseBorderlessTexture() || settings.cellBorderSync;
  }

  function getPlayerDrawTexture(cell, textureRegion, defaultTexture = false) {
    if (!defaultTexture && settings.cellBorderSync && isSkinBorderSyncEligible(cell)) {
      rememberSkinTexture(cell, textureRegion);
    }
    if (!defaultTexture || getCellType(cell) !== 1 || !settings.enabled
        || (!settings.removeAllCellBorders && !(settings.removeOwnCellBorder && cell.p))) {
      return textureRegion;
    }

    const borderlessTexture = win.__BlobioCellRingBorderlessTexture;
    if (!borderlessTexture) {
      state.markers.missingBorderlessTexture += 1;
      return textureRegion;
    }

    state.markers.defaultTextureSubstitutions += 1;
    if (isOwnCell(cell)) {
      state.markers.ownDefaultTextureSubstitutions += 1;
    } else {
      state.markers.foreignDefaultTextureSubstitutions += 1;
    }
    return borderlessTexture;
  }

  function rememberSkinTexture(cell, textureRegion) {
    if (!cell || !textureRegion || !isSkinBorderSyncEligible(cell)) {
      return;
    }

    let entry = skinColorEntries.get(textureRegion);
    if (entry) {
      state.markers.skinSampleCacheHits += 1;
      cellSkinEntries.set(cell, entry);
      if (entry.status === 'deferred' && isImageReady(entry.image)) {
        queueSkinColorSample(entry);
      }
      return;
    }

    entry = {
      textureRegion,
      image: getDecodedSkinImage(textureRegion),
      color: null,
      status: 'loading',
    };
    skinColorEntries.set(textureRegion, entry);
    cellSkinEntries.set(cell, entry);

    if (!entry.image) {
      failSkinColorSample(entry);
      return;
    }
    if (isImageReady(entry.image)) {
      queueSkinColorSample(entry);
      return;
    }
    if (typeof entry.image.addEventListener !== 'function') {
      failSkinColorSample(entry);
      return;
    }

    entry.image.addEventListener('load', () => queueSkinColorSample(entry), { once: true });
    entry.image.addEventListener('error', () => failSkinColorSample(entry), { once: true });
  }

  function getDecodedSkinImage(textureRegion) {
    const textureData = textureRegion?.v?.a;
    const directImage = textureData?.a;
    if (isDecodedImage(directImage)) {
      return directImage;
    }

    const fileHandle = textureData?.a;
    const path = fileHandle?.a;
    const preloadedImages = fileHandle?.b?.e;
    const keys = preloadedImages?.o;
    const values = preloadedImages?.B;
    if (typeof path !== 'string' || typeof keys?.length !== 'number' || typeof values?.length !== 'number') {
      return null;
    }

    for (let index = 0; index < keys.length; index += 1) {
      if (keys[index] === path && isDecodedImage(values[index])) {
        return values[index];
      }
    }
    return null;
  }

  function isDecodedImage(value) {
    return Boolean(value && typeof value === 'object' && (
      'complete' in value
      || typeof value.decode === 'function'
      || typeof value.addEventListener === 'function' && ('naturalWidth' in value || 'width' in value)
    ));
  }

  function isImageReady(image) {
    return image?.complete !== false
      && Number(image?.naturalWidth || image?.width) > 0
      && Number(image?.naturalHeight || image?.height) > 0;
  }

  function queueSkinColorSample(entry) {
    if (!entry || entry.status === 'queued' || entry.status === 'resolved' || entry.status === 'failed') {
      return;
    }
    if (pendingSkinSamples.length >= MAX_PENDING_SKIN_SAMPLES) {
      state.markers.skinSampleQueueDrops += 1;
      entry.status = 'deferred';
      return;
    }

    entry.status = 'queued';
    pendingSkinSamples.push(entry);
    state.markers.skinSamplesQueued += 1;
    scheduleSkinColorSamples();
  }

  function scheduleSkinColorSamples() {
    if (skinSampleTimer || pendingSkinSamples.length === 0) {
      return;
    }

    if (typeof win.requestIdleCallback === 'function') {
      skinSampleTimer = win.requestIdleCallback(processSkinColorQueue, { timeout: 250 });
    } else {
      const schedule = win.setTimeout || globalThis.setTimeout;
      skinSampleTimer = schedule(() => processSkinColorQueue(), 0);
    }
  }

  function processSkinColorQueue(deadline, drain = false) {
    skinSampleTimer = 0;
    let processed = 0;
    while (pendingSkinSamples.length > 0
        && (drain || processed < MAX_SKIN_SAMPLES_PER_TASK)
        && (drain
          || (deadline?.didTimeout && processed === 0)
          || !deadline?.timeRemaining
          || deadline.timeRemaining() > 1)) {
      const entry = pendingSkinSamples.shift();
      try {
        entry.color = sampleSkinColor(entry.image, entry.textureRegion);
        if (!entry.color) {
          failSkinColorSample(entry);
        } else {
          entry.status = 'resolved';
          state.markers.skinSamplesCompleted += 1;
        }
      } catch {
        failSkinColorSample(entry);
      }
      processed += 1;
    }

    if (pendingSkinSamples.length > 0) {
      scheduleSkinColorSamples();
    }
    return processed;
  }

  function failSkinColorSample(entry) {
    if (!entry || entry.status === 'failed') {
      return;
    }
    entry.status = 'failed';
    entry.color = null;
    state.markers.skinSamplesFailed += 1;
  }

  function getResolvedSkinColor(cell) {
    const entry = cellSkinEntries.get(cell);
    if (!entry || entry.textureRegion !== cell?.P || entry.status !== 'resolved') {
      return null;
    }
    return entry.color;
  }

  function isSkinBorderSyncEligible(cell) {
    return getCellType(cell) === 1
      && getPackedAlphaByte(cell?.K?.a) === SHADER_ALPHA_CODES.HAS_BORDER;
  }

  function sampleSkinColor(image, textureRegion) {
    const context = getSkinSampleContext();
    if (!context) {
      return null;
    }

    const imageWidth = Number(image?.naturalWidth || image?.width);
    const imageHeight = Number(image?.naturalHeight || image?.height);
    const left = normalizeTextureCoordinate(textureRegion?.w, 0);
    const right = normalizeTextureCoordinate(textureRegion?.A, 1);
    const top = normalizeTextureCoordinate(textureRegion?.C, 0);
    const bottom = normalizeTextureCoordinate(textureRegion?.B, 1);
    const sourceX = Math.min(left, right) * imageWidth;
    const sourceY = Math.min(top, bottom) * imageHeight;
    const sourceWidth = Math.max(1, Math.abs(right - left) * imageWidth);
    const sourceHeight = Math.max(1, Math.abs(bottom - top) * imageHeight);

    context.clearRect(0, 0, SKIN_SAMPLE_SIZE, SKIN_SAMPLE_SIZE);
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      SKIN_SAMPLE_SIZE,
      SKIN_SAMPLE_SIZE,
    );
    const pixels = context.getImageData(0, 0, SKIN_SAMPLE_SIZE, SKIN_SAMPLE_SIZE).data;
    skinColorWeights.fill(0);
    skinColorRed.fill(0);
    skinColorGreen.fill(0);
    skinColorBlue.fill(0);

    let opaqueWeight = 0;
    let chromaticWeight = 0;
    const center = SKIN_SAMPLE_SIZE / 2;
    const radiusSquared = (SKIN_SAMPLE_SIZE * 0.488) ** 2;
    for (let y = 0; y < SKIN_SAMPLE_SIZE; y += 1) {
      const dy = y + 0.5 - center;
      for (let x = 0; x < SKIN_SAMPLE_SIZE; x += 1) {
        const dx = x + 0.5 - center;
        if (dx * dx + dy * dy > radiusSquared) {
          continue;
        }

        const offset = (y * SKIN_SAMPLE_SIZE + x) * 4;
        const alpha = pixels[offset + 3];
        if (alpha < 32) {
          continue;
        }
        const red = pixels[offset];
        const green = pixels[offset + 1];
        const blue = pixels[offset + 2];
        const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
        const bucket = (red >> 4) << 8 | (green >> 4) << 4 | (blue >> 4);
        skinColorWeights[bucket] += alpha;
        skinColorRed[bucket] += red * alpha;
        skinColorGreen[bucket] += green * alpha;
        skinColorBlue[bucket] += blue * alpha;
        opaqueWeight += alpha;
        if (saturation >= 36 && Math.max(red, green, blue) >= 48) {
          chromaticWeight += alpha;
        }
      }
    }

    if (opaqueWeight === 0) {
      return null;
    }

    const preferChromatic = chromaticWeight >= opaqueWeight * 0.08;
    let bestBucket = -1;
    let bestScore = -1;
    for (let bucket = 0; bucket < skinColorWeights.length; bucket += 1) {
      const weight = skinColorWeights[bucket];
      if (weight === 0) {
        continue;
      }
      const red = skinColorRed[bucket] / weight;
      const green = skinColorGreen[bucket] / weight;
      const blue = skinColorBlue[bucket] / weight;
      const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
      const chromatic = saturation >= 36 && Math.max(red, green, blue) >= 48;
      if (preferChromatic !== chromatic) {
        continue;
      }
      const score = weight * (256 + (preferChromatic ? saturation : 0));
      if (score > bestScore) {
        bestScore = score;
        bestBucket = bucket;
      }
    }

    if (bestBucket < 0) {
      return null;
    }
    const weight = skinColorWeights[bestBucket];
    let red = Math.round(skinColorRed[bestBucket] / weight);
    const green = Math.round(skinColorGreen[bestBucket] / weight);
    const blue = Math.round(skinColorBlue[bestBucket] / weight);
    if (red > 249 && green < 26 && blue < 26) {
      red = 249;
    }
    return {
      r: red / 255,
      g: green / 255,
      b: blue / 255,
      red,
      green,
      blue,
    };
  }

  function normalizeTextureCoordinate(value, fallback) {
    const coordinate = Number(value);
    return Number.isFinite(coordinate) ? Math.max(0, Math.min(1, coordinate)) : fallback;
  }

  function getSkinSampleContext() {
    if (skinSampleContext) {
      return skinSampleContext;
    }
    skinSampleCanvas = typeof win.OffscreenCanvas === 'function'
      ? new win.OffscreenCanvas(SKIN_SAMPLE_SIZE, SKIN_SAMPLE_SIZE)
      : win.document?.createElement?.('canvas');
    if (!skinSampleCanvas) {
      return null;
    }
    skinSampleCanvas.width = SKIN_SAMPLE_SIZE;
    skinSampleCanvas.height = SKIN_SAMPLE_SIZE;
    skinSampleContext = skinSampleCanvas.getContext?.('2d', { willReadFrequently: true }) || null;
    return skinSampleContext;
  }

  function passThroughLegacySkinTexture(_cell, textureRegion) {
    state.markers.legacySkinTexturePassThroughs += 1;
    return textureRegion;
  }

  function passThroughLegacySkinUv(_cell, value) {
    state.markers.legacySkinUvPassThroughs += 1;
    return value;
  }

  function patchVertexShaderSource(source) {
    source = String(source || '');
    if (source.includes('v_blobioGlowRadius')) {
      state.shader.glowVertexPatched = true;
      return source;
    }
    const assignment = 'v_texCoords = a_texCoord0;';
    if (!source.includes(assignment) || !source.includes('void main')) {
      rememberError('Glow vertex shader coordinates were not found.');
      return source;
    }
    // Out-of-range UVs identify our procedural ring without reserving a cell alpha.
    const patched = source.replace('void main', 'varying mediump float v_blobioGlowRadius;\nvarying mediump float v_blobioBorderWidth;\nvoid main')
      .replace(assignment, assignment + '\n' + [
        '    v_blobioGlowRadius = 0.0;',
        '    v_blobioBorderWidth = 0.0;',
        '    if (a_texCoord0.y >= -3.6 && a_texCoord0.y <= -2.0',
        '        && ((a_texCoord0.x > -3.0 && a_texCoord0.x < -2.0)',
        '            || (a_texCoord0.x > 3.0 && a_texCoord0.x < 4.0))) {',
        '        v_blobioGlowRadius = a_texCoord0.x < 0.0 ? -a_texCoord0.x - 2.0 : a_texCoord0.x - 3.0;',
        '        v_blobioBorderWidth = -a_texCoord0.y - (a_texCoord0.y > -3.0 ? 2.0 : 3.0);',
        '        v_texCoords = vec2(a_texCoord0.x < 0.0 ? 0.0 : 1.0, a_texCoord0.y > -3.0 ? 0.0 : 1.0);',
        '    }',
      ].join('\n'));
    state.shader.glowVertexPatched = true;
    return patched;
  }

  function patchGlowFragmentShader(source) {
    if (!state.shader.glowVertexPatched || source.includes('v_blobioGlowRadius')) {
      return source;
    }
    return source.replace(/void main\s*\(\s*\)\s*\{/, [
      'varying mediump float v_blobioGlowRadius;',
      'varying mediump float v_blobioBorderWidth;',
      'void main() {',
      '    if (v_blobioGlowRadius > 0.0) {',
      '        float d = length(v_texCoords * 2.0 - 1.0);',
      '        float r = v_blobioGlowRadius;',
      '        float glowMode = floor(v_blobioBorderWidth * 4.0);',
      '        float width = r * (v_blobioBorderWidth - glowMode * 0.25);',
      '        if (d >= 1.0 || d <= r - width) { discard; }',
      '        float core = width > 0.0 ? smoothstep(r - width, r - width + min(r * 0.005, width * 0.33), d)',
      '            * (1.0 - smoothstep(r * 0.998, r * 1.003, d)) : 0.0;',
      // Approximate the preview's 12/30/58px box shadows around its 132px circle.
      // The quad includes the faint tail; its boundary is not the halo's falloff curve.
      '        float outside = max(0.0, d - r) / (1.0 - r);',
      '        vec3 distance = outside / vec3(0.07576, 0.18939, 0.36616);',
      '        vec3 shadows = vec3(0.375, 0.26, 0.17)',
      '            * exp2(-1.151 * distance - 0.505 * distance * distance);',
      '        float halo = (1.0 - (1.0 - shadows.x) * (1.0 - shadows.y) * (1.0 - shadows.z))',
      '            * (width > 0.0 ? smoothstep(r - width * 0.67, r, d) : 1.0)',
      '            * (1.0 - smoothstep(0.85, 1.0, outside));',
      '        float coverage = core + (1.0 - core) * halo;',
      '        if (glowMode > 1.5) { coverage = core; }',
      '        else if (glowMode > 0.5) { coverage = (1.0 - core) * halo; }',
      '        float alpha = coverage * min(1.0, v_color.a * (255.0 / 254.0));',
      '        gl_FragColor = vec4(v_color.rgb, alpha);',
      '        return;',
      '    }',
    ].join('\n'));
  }

  function patchFragmentShaderSource(source) {
    const original = patchGlowFragmentShader(String(source || ''));
    state.shader.glowFragmentPatched = original.includes('v_blobioGlowRadius');
    state.shader.sourceCalls += 1;
    state.shader.lastSourceLength = original.length;
    state.shader.lastVariant = original.includes('drawEmptyCell')
      ? 'border'
      : original.includes('border drawing code was deleted from here')
        ? 'no-border'
        : 'unknown';

    const alreadyPatched = original.includes(SHADER_PATCH_MARKER);
    if (!original || alreadyPatched) {
      state.shader.lastComparisonsPatched = alreadyPatched ? -1 : 0;
      state.shader.lastOpacityMultipliersPatched = alreadyPatched ? -1 : 0;
      return original;
    }

    let comparisonsPatched = 0;
    let patched = original;
    for (const [mode, packedByte] of Object.entries(SHADER_ALPHA_CODES)) {
      const comparison = new RegExp(
        `abs\\(\\s*v_color\\.a\\s*-\\s*${mode}\\s*\\)\\s*<\\s*eps`,
        'g',
      );
      patched = patched.replace(comparison, () => {
        comparisonsPatched += 1;
        return `blobioAlphaCode(${packedByte}.0)`;
      });
    }

    if (comparisonsPatched === 0) {
      state.shader.lastComparisonsPatched = 0;
      state.shader.lastOpacityMultipliersPatched = 0;
      state.shader.lastError = 'Cell alpha-mode comparisons were not found in the fragment shader.';
      return original;
    }

    let opacityMultipliersPatched = 0;
    patched = patched.replace(/(\*\s*texColor\s*\*)\s*v_color(\s*;)/g, (match, prefix, suffix) => {
      opacityMultipliersPatched += 1;
      return `${prefix} blobioRenderColor()${suffix}`;
    });

    const mainIndex = patched.indexOf('void main');
    if (mainIndex < 0) {
      state.shader.lastComparisonsPatched = 0;
      state.shader.lastOpacityMultipliersPatched = 0;
      state.shader.lastError = 'Fragment shader main() was not found.';
      return original;
    }

    const helper = [
      `// ${SHADER_PATCH_MARKER}`,
      'bool blobioAlphaCode(float packedByte) {',
      '    return abs(floor(v_color.a * 255.0 + 0.5) - packedByte) < 0.5;',
      '}',
      'vec4 blobioRenderColor() {',
      `    return blobioAlphaCode(${OPAQUE_ALPHA_CODE}.0) ? vec4(v_color.rgb, 1.0) : v_color;`,
      '}',
      '',
    ].join('\n');
    patched = patched.slice(0, mainIndex) + helper + patched.slice(mainIndex);
    state.shader.patchedCalls += 1;
    state.shader.lastComparisonsPatched = comparisonsPatched;
    state.shader.lastOpacityMultipliersPatched = opacityMultipliersPatched;
    state.shader.maxComparisonsPatched = Math.max(
      state.shader.maxComparisonsPatched,
      comparisonsPatched,
    );
    state.shader.maxOpacityMultipliersPatched = Math.max(
      state.shader.maxOpacityMultipliersPatched,
      opacityMultipliersPatched,
    );
    state.shader.lastError = '';
    return patched;
  }

  function beginFrame() {
    state.overlay.frames += 1;
    overlay.frameDraws = 0;
    return isRuntimeActive();
  }

  function trackCell(cell, projectionMatrix, batch, texture, setColor, drawTexture) {
    if (!settings.enabled || (settings.alpha <= 0 && (settings.borderWidth <= 0 || (settings.outlineAlpha ?? settings.alpha) <= 0)) || !isOwnCell(cell)) {
      return false;
    }
    state.overlay.trackCalls += 1;
    if (overlay.frameDraws >= MAX_GLOW_DRAWS_PER_FRAME) {
      state.overlay.skipped += 1;
      state.overlay.trackFrameLimitSkips += 1;
      return false;
    }
    if (!batch || !texture || typeof setColor !== 'function' || typeof drawTexture !== 'function'
        || !state.shader.glowVertexPatched || !state.shader.glowFragmentPatched || !updateViewport()) {
      state.overlay.skipped += 1;
      state.overlay.trackSetupSkips += 1;
      return false;
    }
    const info = getCellDrawInfo(cell, projectionMatrix);
    if (!info) {
      state.overlay.skipped += 1;
      state.overlay.trackViewportSkips += 1;
      return false;
    }
    const radius = getCellRadius(cell);
    if (radius <= 0) {
      return false;
    }
    const pixelRadius = Math.max(2, info.radius * overlay.dpr);
    const glowRadius = pixelRadius + Math.max(7, pixelRadius * (OVERLAY_GLOW_SCALE - 1)) * settings.glowSize;
    const liquidJellyEnabled = win.__blobioLiquidJellyEnabled && win.__BlobioLiquidJellyMotion;
    if (!isNearViewport(info.x, info.y, glowRadius / overlay.dpr * (liquidJellyEnabled ? 1.16 : 1))) {
      state.overlay.skipped += 1;
      state.overlay.trackViewportSkips += 1;
      return false;
    }
    const innerRadius = Math.max(0.01, Math.min(0.98, pixelRadius / glowRadius));
    const borderWidth = settings.borderWidth / 66;
    let worldRadius = radius * glowRadius / (info.radius * overlay.dpr);
    let x = cell.R;
    let y = cell.S;
    let leftUv = -2 - innerRadius;
    let rightUv = 3 + innerRadius;
    let topUv = -2 - borderWidth;
    let bottomUv = -3 - borderWidth;
    if (liquidJellyEnabled) {
      const motion = win.__BlobioLiquidJellyMotion(cell);
      // Integer fields carry deformation; fractions retain the native ring widths.
      const descriptor = 8 + (Math.round(motion.contactX * 4096) + 64) * 128
        + Math.round(motion.x * 1024) + 64 + innerRadius;
      leftUv = -descriptor;
      rightUv = descriptor;
      topUv = -8 - (Math.round(motion.contactY * 4096) + 64) * 128
        - Math.round(motion.y * 1024) - 64 - borderWidth;
      bottomUv = topUv - 16384;
      x += motion.offsetX;
      y += motion.offsetY;
      worldRadius *= 1.1;
    }
    const color = getCellGlowColor(cell);
    const outlineAlpha = settings.outlineAlpha ?? settings.alpha;
    const customOutline = settings.outlineColor !== null || settings.outlineAlpha !== null;
    const glowUvOffset = customOutline ? 0.25 : 0;
    const previousColor = batch.f;
    try {
      if (settings.alpha > 0) {
        setColor(batch, { d: color.r, c: color.g, b: color.b, a: color.a });
        drawTexture(batch, texture, x - worldRadius, y - worldRadius,
          worldRadius * 2, worldRadius * 2, leftUv, topUv - glowUvOffset,
          rightUv, bottomUv - glowUvOffset);
      }
      if (customOutline && settings.borderWidth > 0 && outlineAlpha > 0) {
        setColor(batch, {
          d: settings.outlineColor ? settings.outlineRed / 255 : color.r,
          c: settings.outlineColor ? settings.outlineGreen / 255 : color.g,
          b: settings.outlineColor ? settings.outlineBlue / 255 : color.b,
          a: outlineAlpha,
        });
        drawTexture(batch, texture, x - worldRadius, y - worldRadius,
          worldRadius * 2, worldRadius * 2, leftUv, topUv - 0.5, rightUv, bottomUv - 0.5);
      }
    } finally {
      batch.f = previousColor;
    }
    overlay.frameDraws += 1;
    state.overlay.draws += 1;
    return true;
  }

  function getCellDrawInfo(cell, projectionMatrix) {
    const x = Number(cell?.R);
    const y = Number(cell?.S);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }

    const radius = getCellRadius(cell);
    const center = projectWorldPoint(x, y, projectionMatrix);
    if (!center) {
      return null;
    }

    const right = radius > 0 ? projectWorldPoint(x + radius, y, projectionMatrix) : null;
    const top = radius > 0 ? projectWorldPoint(x, y + radius, projectionMatrix) : null;
    const screenRadius = Math.max(
      right ? Math.abs(right.x - center.x) : 0,
      top ? Math.abs(top.y - center.y) : 0,
      1,
    );

    return {
      x: center.x,
      y: center.y,
      radius: screenRadius,
    };
  }

  function getCellRadius(cell) {
    const radius = Math.max(0, Number(cell?.M) || 0);
    const textureRadius = Math.max(0, (Number(cell?.N) || 0) / 2);
    return Math.max(radius, textureRadius);
  }

  function projectWorldPoint(x, y, projectionMatrix) {
    const matrix = projectionMatrix?.a || projectionMatrix;
    if (!matrix || typeof matrix.length !== 'number' || matrix.length < 16 || overlay.cssWidth <= 0 || overlay.cssHeight <= 0) {
      return null;
    }

    const clipX = matrix[0] * x + matrix[4] * y + matrix[12];
    const clipY = matrix[1] * x + matrix[5] * y + matrix[13];
    const clipW = matrix[3] * x + matrix[7] * y + matrix[15];
    const w = Number.isFinite(clipW) && Math.abs(clipW) > 0.00001 ? clipW : 1;
    const ndcX = clipX / w;
    const ndcY = clipY / w;
    if (!Number.isFinite(ndcX) || !Number.isFinite(ndcY)) {
      return null;
    }

    return {
      x: (ndcX + 1) * 0.5 * overlay.cssWidth,
      y: (1 - ndcY) * 0.5 * overlay.cssHeight,
    };
  }

  function isNearViewport(x, y, radius) {
    const margin = Math.max(80, Number(radius) || 80);
    return x + margin >= 0
      && y + margin >= 0
      && x - margin <= overlay.cssWidth
      && y - margin <= overlay.cssHeight;
  }

  function updateViewport() {
    const canvas = findGameCanvas();
    if (!canvas) {
      return false;
    }
    const targetChanged = overlay.targetCanvas !== canvas;
    overlay.targetCanvas = canvas;
    if (targetChanged || overlay.lastAlignedFrame !== state.overlay.frames) {
      const rect = canvas.getBoundingClientRect?.() || {};
      overlay.cssWidth = Math.max(1, Number(rect.width) || Number(canvas.width) || 1);
      overlay.cssHeight = Math.max(1, Number(rect.height) || Number(canvas.height) || 1);
      overlay.dpr = Math.max(1, Math.min(2, Number(win.devicePixelRatio) || 1)) * OVERLAY_RENDER_SCALE;
      overlay.lastAlignedFrame = state.overlay.frames;
    }
    return true;
  }

  function findGameCanvas() {
    const now = Date.now();
    if (overlay.targetCanvas && overlay.targetCanvas.isConnected && now - overlay.lastCanvasScan < 500) {
      return overlay.targetCanvas;
    }

    const doc = win.document || globalThis.document;
    const canvases = doc?.getElementsByTagName?.('canvas') || [];
    let best = null;
    let bestArea = 0;
    for (const canvas of canvases) {
      if (hasIgnoredCanvasClass(canvas)) {
        continue;
      }
      const rect = canvas.getBoundingClientRect?.() || {};
      const width = Number(rect.width) || Number(canvas.clientWidth) || Number(canvas.width) || 0;
      const height = Number(rect.height) || Number(canvas.clientHeight) || Number(canvas.height) || 0;
      const area = width * height;
      if (area > bestArea) {
        best = canvas;
        bestArea = area;
      }
    }
    overlay.lastCanvasScan = now;
    return best;
  }

  function hasIgnoredCanvasClass(canvas) {
    const className = String(canvas?.className || '');
    for (const item of GAME_CANVAS_CLASSES_TO_IGNORE) {
      if (className.includes(item) || canvas?.classList?.contains?.(item)) {
        return true;
      }
    }
    return className.includes('pie-chart') || className.includes('blob-self-glow');
  }

  function getCellGlowColor(cell) {
    const fallback = getStaticGlowColor();
    if (settings.mode !== 'sync') {
      return fallback;
    }

    const skinColor = settings.cellBorderSync && isSkinBorderSyncEligible(cell)
      ? getResolvedSkinColor(cell)
      : null;
    if (skinColor) {
      return {
        r: skinColor.r,
        g: skinColor.g,
        b: skinColor.b,
        a: fallback.a,
      };
    }

    const color = readGameColor(cell?.K);
    if (!color) {
      return fallback;
    }

    return {
      r: color.r,
      g: color.g,
      b: color.b,
      a: fallback.a,
    };
  }

  function readGameColor(color) {
    if (!color) {
      return null;
    }
    const r = normalizeColorFloat(color.d !== undefined ? color.d : color.r);
    const g = normalizeColorFloat(color.c !== undefined ? color.c : color.g);
    const b = normalizeColorFloat(color.b);
    if (r === null || g === null || b === null) {
      return null;
    }
    return { r, g, b };
  }

  function normalizeColorFloat(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return null;
    }
    if (number > 1) {
      return Math.max(0, Math.min(1, number / 255));
    }
    return Math.max(0, Math.min(1, number));
  }

  function getStaticGlowColor() {
    if (glowColorCache && glowColorCacheRevision === settingsRevision) {
      return glowColorCache;
    }
    glowColorCache = {
      r: settings.red / 255,
      g: settings.green / 255,
      b: settings.blue / 255,
      a: settings.alpha,
    };
    glowColorCacheRevision = settingsRevision;
    return glowColorCache;
  }

  function restoreLegacyWebGlWrappers() {
    for (const ContextCtor of [win.WebGLRenderingContext, win.WebGL2RenderingContext]) {
      const proto = ContextCtor?.prototype;
      if (!proto) {
        continue;
      }

      for (const name of [
        'shaderSource',
        'useProgram',
        'drawArrays',
        'drawElements',
        'drawArraysInstanced',
        'drawElementsInstanced',
        'activeTexture',
        'bindTexture',
        'texImage2D',
        'texSubImage2D',
      ]) {
        const nativeMethod = proto[name]?.__blobioGlowTransparentNative;
        if (typeof nativeMethod === 'function') {
          proto[name] = nativeMethod;
        }
      }

      delete proto.__blobioGlowTransparentShaderPatched;
      delete proto.__blobioGlowTransparentUniformPatched;
      delete proto.__blobioGlowTexturePatched;
    }
  }

  function installGameScriptPatch() {
    const wrapped = installGwtCallbackPatch();
    patchExistingCacheScripts();

    const NodeCtor = win.Node;
    if (!NodeCtor?.prototype) {
      if (!wrapped) {
        scheduleGwtCallbackRetry();
      }
      return false;
    }
    if (NodeCtor.prototype.__blobioGlowTransparentScriptPatched === SCRIPT_VERSION) {
      if (!wrapped) {
        scheduleGwtCallbackRetry();
      }
      return true;
    }

    const nativeAppendChild = NodeCtor.prototype.appendChild?.__blobioGlowTransparentNative || NodeCtor.prototype.appendChild;
    const nativeInsertBefore = NodeCtor.prototype.insertBefore?.__blobioGlowTransparentNative || NodeCtor.prototype.insertBefore;

    NodeCtor.prototype.appendChild = function blobioGlowTransparentAppendChild(node) {
      patchScriptNode(node);
      installGwtCallbackPatch();
      return nativeAppendChild.call(this, node);
    };
    NodeCtor.prototype.insertBefore = function blobioGlowTransparentInsertBefore(node, beforeNode) {
      patchScriptNode(node);
      installGwtCallbackPatch();
      return nativeInsertBefore.call(this, node, beforeNode);
    };
    NodeCtor.prototype.appendChild.__blobioGlowTransparentNative = nativeAppendChild;
    NodeCtor.prototype.insertBefore.__blobioGlowTransparentNative = nativeInsertBefore;

    NodeCtor.prototype.__blobioGlowTransparentScriptPatched = SCRIPT_VERSION;
    if (!wrapped) {
      scheduleGwtCallbackRetry();
    }
    return true;
  }

  function scheduleGwtCallbackRetry() {
    if (retryTimer || !win.setInterval) {
      return;
    }
    retryTimer = win.setInterval(() => {
      if (installGwtCallbackPatch()) {
        win.clearInterval?.(retryTimer);
        retryTimer = 0;
      }
    }, 10);
    win.setTimeout?.(() => {
      if (retryTimer) {
        win.clearInterval?.(retryTimer);
        retryTimer = 0;
      }
    }, 30000);
  }

  function patchExistingCacheScripts() {
    const doc = win.document || globalThis.document;
    const scripts = doc?.getElementsByTagName?.('script') || [];
    for (const script of scripts) {
      patchScriptNode(script);
    }
  }

  function patchScriptNode(node) {
    if (!node || String(node.tagName || '').toLowerCase() !== 'script') {
      return false;
    }
    if (node.__blobioGlowTransparentScriptPatchVersion === SCRIPT_VERSION) {
      return false;
    }

    const src = String(node.src || node.getAttribute?.('src') || '');
    if (src && !CACHE_SCRIPT_RE.test(src)) {
      return false;
    }

    node.__blobioGlowTransparentScriptPatchVersion = SCRIPT_VERSION;
    if (src) {
      state.bundle.seenCacheScripts += 1;
    }

    if (typeof node.textContent !== 'string' || !CELL_LOOP_RE.test(node.textContent)) {
      return false;
    }

    const patched = patchDownloadedChunk(node.textContent);
    if (patched === node.textContent) {
      return false;
    }
    node.textContent = patched;
    return true;
  }

  function installGwtCallbackPatch() {
    const html = win.html;
    if (!html || html.__blobioGlowTransparentWrapped === SCRIPT_VERSION || typeof html.onScriptDownloaded !== 'function') {
      return false;
    }

    const nativeOnScriptDownloaded = html.onScriptDownloaded.__blobioGlowTransparentNative || html.onScriptDownloaded;
    html.onScriptDownloaded = function blobioGlowTransparentOnScriptDownloaded(chunks) {
      state.bundle.callbackCalls += 1;
      let patchedChunks = chunks;
      try {
        patchedChunks = Array.isArray(chunks)
          ? chunks.map(patchDownloadedChunk)
          : patchDownloadedChunk(chunks);
      } catch (error) {
        rememberError(error);
      }
      return nativeOnScriptDownloaded.call(this, patchedChunks);
    };

    html.onScriptDownloaded.__blobioGlowTransparentNative = nativeOnScriptDownloaded;
    html.__blobioGlowTransparentWrapped = SCRIPT_VERSION;
    state.bundle.callbackWrapped = true;
    return true;
  }

  function patchDownloadedChunk(chunk) {
    if (typeof chunk !== 'string') {
      return chunk;
    }

    const result = patchBundle(chunk);
    state.bundle.lastPatchResult = {
      changed: result.changed,
      frameHookPatched: result.frameHookPatched,
      trackHookPatched: result.trackHookPatched,
      colorHookPatched: result.colorHookPatched,
      fragmentShaderHookPatched: result.fragmentShaderHookPatched,
      overdrawHookPatched: result.overdrawHookPatched,
      borderTextureInitPatched: result.borderTextureInitPatched,
      borderTextureDrawsPatched: result.borderTextureDrawsPatched,
      playerTextureDrawsPatched: result.playerTextureDrawsPatched,
    };
    state.bundle.frameHookPatched = state.bundle.frameHookPatched || result.frameHookPatched;
    state.bundle.trackHookPatched = state.bundle.trackHookPatched || result.trackHookPatched;
    state.bundle.colorHookPatched = state.bundle.colorHookPatched || result.colorHookPatched;
    state.bundle.fragmentShaderHookPatched = state.bundle.fragmentShaderHookPatched
      || result.fragmentShaderHookPatched;
    state.bundle.overdrawHookPatched = state.bundle.overdrawHookPatched || result.overdrawHookPatched;
    state.bundle.borderTextureInitPatched = state.bundle.borderTextureInitPatched || result.borderTextureInitPatched;
    state.bundle.borderTextureDrawsPatched = Math.max(
      state.bundle.borderTextureDrawsPatched,
      result.borderTextureDrawsPatched,
    );
    state.bundle.playerTextureDrawsPatched = Math.max(
      state.bundle.playerTextureDrawsPatched,
      result.playerTextureDrawsPatched,
    );
    if (result.changed) {
      state.bundle.patchedChunks += 1;
    }
    return win.__BlobioLiquidJellyPatchBundle
      ? win.__BlobioLiquidJellyPatchBundle(result.code)
      : result.code;
  }

  function patchBundle(source) {
    let code = source;
    let frameHookPatched = false;
    let trackHookPatched = false;
    let colorHookPatched = false;
    let fragmentShaderHookPatched = false;
    const overdrawHookPatched = false;
    let borderTextureInitPatched = false;
    let borderTextureDrawsPatched = 0;
    let playerTextureDrawsPatched = 0;

    const withFragmentShaderHook = patchFragmentShaderLoad(code);
    fragmentShaderHookPatched = withFragmentShaderHook !== code;
    code = withFragmentShaderHook;

    const withFrameHook = patchFrameStart(code);
    frameHookPatched = withFrameHook !== code;
    code = withFrameHook;

    const legacyTrack = 'g.p&&g.c.M==1&&$wnd.__BlobioCellRingTrack&&$wnd.__BlobioCellRingTrack(g,a.c&&a.c.g&&a.c.g.a);';
    if (!code.includes('__BlobioCellRingTrack') || code.includes(legacyTrack)) {
      const colorCall = code.match(/g\.K\.a=0\.75;([A-Za-z_$][\w$]*)\(a\.c,/);
      const uvDraw = code.match(/([A-Za-z_$][\w$]*)\(a\.c,h\.v,g\.R-g\.M,g\.S-g\.M,g\.N,g\.N,1-f,1-f,f,f\)/);
      const nameStart = 'Mm(a.i,g.u?a.b:g.r?a.a:a.B);';
      if (colorCall && uvDraw && code.includes(nameStart)) {
        code = code.replace(legacyTrack, '');
        code = code.replace(nameStart,
          'g.p&&g.c.M==1&&$wnd.__BlobioCellRingTrack&&$wnd.__BlobioCellRingTrack(g,a.c&&a.c.g&&a.c.g.a,a.c,Yxe.v,'
          + colorCall[1] + ',' + uvDraw[1] + ');' + nameStart);
        trackHookPatched = true;
      }
    }

    const withColorHook = patchColorCalls(code);
    colorHookPatched = withColorHook !== code;
    code = withColorHook;

    const withPlayerTextures = patchPlayerTextureDraws(code);
    playerTextureDrawsPatched = withPlayerTextures.drawsPatched;
    code = withPlayerTextures.code;

    const withBorderTexture = patchBorderlessCellTexture(code);
    borderTextureInitPatched = withBorderTexture.initPatched;
    borderTextureDrawsPatched = withBorderTexture.drawsPatched;
    code = withBorderTexture.code;

    return {
      code,
      changed: frameHookPatched
        || trackHookPatched
        || colorHookPatched
        || fragmentShaderHookPatched
        || overdrawHookPatched
        || borderTextureInitPatched
        || borderTextureDrawsPatched > 0
        || playerTextureDrawsPatched > 0,
      frameHookPatched,
      trackHookPatched,
      colorHookPatched,
      fragmentShaderHookPatched,
      overdrawHookPatched,
      borderTextureInitPatched,
      borderTextureDrawsPatched,
      playerTextureDrawsPatched,
    };
  }

  function patchFragmentShaderLoad(source) {
    let patched = source;
    if (!patched.includes('__BlobioCellRingVertexShader')) {
      patched = patched.replace(/([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)\(([A-Za-z_$][\w$]*)\(([A-Za-z_$][\w$]*),'shader\/vertex\.glsl'\)\);/, (statement, variable) => (
        statement + variable + '=$wnd.__BlobioCellRingVertexShader?$wnd.__BlobioCellRingVertexShader(' + variable + '):' + variable + ';'
      ));
    }
    if (patched.includes('__BlobioCellRingFragmentShader')) {
      return patched;
    }

    const fragmentLoad = /([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)\(([A-Za-z_$][\w$]*)\(([A-Za-z_$][\w$]*),'shader\/'\+\(\([^;]+?\)\?'border_shader\.glsl':'no_border_shader\.glsl'\)\)\);/;
    return patched.replace(fragmentLoad, (statement, fragmentVariable) => (
      `${statement}${fragmentVariable}=$wnd.__BlobioCellRingFragmentShader?`
      + `$wnd.__BlobioCellRingFragmentShader(${fragmentVariable}):${fragmentVariable};`
    ));
  }

  function patchFrameStart(source) {
    if (source.includes('__BlobioCellRingBeginFrame')) {
      return source;
    }

    const loopMatch = CELL_LOOP_RE.exec(source);
    if (!loopMatch) {
      return source;
    }

    const functionStart = source.lastIndexOf('function ', loopMatch.index);
    if (functionStart < 0) {
      return source;
    }

    const header = source.slice(functionStart, loopMatch.index);
    const headerMatch = header.match(RENDER_FUNCTION_RE);
    if (!headerMatch) {
      return source;
    }

    const insertAt = functionStart + headerMatch.index + headerMatch[0].length;
    return source.slice(0, insertAt)
      + '$wnd.__BlobioCellRingBeginFrame&&$wnd.__BlobioCellRingBeginFrame();'
      + source.slice(insertAt);
  }

  function patchColorCalls(source) {
    let patched = source;
    const loopMatch = CELL_LOOP_RE.exec(source);
    if (loopMatch && !source.includes('__BlobioCellRingColor(g,g.K,')) {
      const playerStart = source.indexOf('case 1:', loopMatch.index);
      const playerEnd = source.indexOf('break;case 4:case 3:', playerStart);
      if (playerStart >= 0 && playerEnd > playerStart) {
        const playerCode = source.slice(playerStart, playerEnd);
        const colorFunctionMatch = playerCode.match(/g\.K\.a=(?:1|0\.75);([A-Za-z_$][\w$]*)\(a\.c,g\.K\);/);
        if (colorFunctionMatch) {
          const colorFunction = colorFunctionMatch[1];
          const skinDraws = ['false', 'false', 'g.P&&g.P!=Yxe'];
          let colorCallIndex = 0;
          const colorCall = new RegExp(`${escapeRegExp(colorFunction)}\\(a\\.c,g\\.K\\);`, 'g');
          const patchedPlayerCode = playerCode.replace(colorCall, () => {
            const skinDraw = skinDraws[colorCallIndex++] || 'false';
            return `${colorFunction}(a.c,(g.p||$wnd.__BlobioCellRingColorAllPlayers)&&$wnd.__BlobioCellRingColor?`
              + `$wnd.__BlobioCellRingColor(g,g.K,${skinDraw}):g.K);`;
          });
          patched = source.slice(0, playerStart) + patchedPlayerCode + source.slice(playerEnd);
        }
      }
    }

    if (patched.includes('__BlobioCellRingColor(b,b.K,')) {
      return patched;
    }

    const fallbackDraw = /b\.K\.a=0\.75;([A-Za-z_$][\w$]*)\(a\.c,b\.K\);[A-Za-z_$][\w$]*\(a\.c,[A-Za-z_$][\w$]*,b\.R-b\.M,b\.S-b\.M,b\.N,b\.N\)/.exec(patched);
    if (!fallbackDraw) {
      return patched;
    }

    const functionStart = patched.lastIndexOf('function ', fallbackDraw.index);
    const functionEnd = findFunctionEnd(patched, functionStart);
    if (functionStart < 0 || functionEnd < 0) {
      return patched;
    }

    const fallbackCode = patched.slice(functionStart, functionEnd);
    const colorFunction = fallbackDraw[1];
    const skinDraws = ['b.P&&b.P!=Yxe', 'b.P&&b.P!=Yxe', 'false'];
    let colorCallIndex = 0;
    const colorCall = new RegExp(`${escapeRegExp(colorFunction)}\\(a\\.c,b\\.K\\);`, 'g');
    const patchedFallbackCode = fallbackCode.replace(colorCall, () => {
      const skinDraw = skinDraws[colorCallIndex++] || 'false';
      return `${colorFunction}(a.c,(b.p||$wnd.__BlobioCellRingColorAllPlayers&&b.c&&b.c.M==1)&&$wnd.__BlobioCellRingColor?`
        + `$wnd.__BlobioCellRingColor(b,b.K,${skinDraw}):b.K);`;
    });
    return patched.slice(0, functionStart) + patchedFallbackCode + patched.slice(functionEnd);
  }

  function findFunctionEnd(source, functionStart) {
    if (functionStart < 0) {
      return -1;
    }

    const bodyStart = source.indexOf('{', functionStart);
    let depth = 0;
    for (let index = bodyStart; index >= 0 && index < source.length; index += 1) {
      if (source[index] === '{') {
        depth += 1;
      } else if (source[index] === '}' && --depth === 0) {
        return index + 1;
      }
    }
    return -1;
  }

  function patchPlayerTextureDraws(source) {
    let code = source;
    let drawsPatched = 0;
    const loopMatch = CELL_LOOP_RE.exec(code);
    const playerStart = loopMatch ? code.indexOf('case 1:', loopMatch.index) : -1;
    const playerEnd = code.indexOf('break;case 4:case 3:', playerStart);
    if (playerStart >= 0 && playerEnd > playerStart) {
      let playerCode = code.slice(playerStart, playerEnd);
      if (!playerCode.includes('__BlobioCellRingTexture(g,h,false)')) {
        const croppedSkinDraw = /([A-Za-z_$][\w$]*)=g\.M\/g\.O;([A-Za-z_$][\w$]*)\(a\.c,h\.v,g\.R-g\.M,g\.S-g\.M,g\.N,g\.N,1-\1,1-\1,\1,\1\)/;
        const withCroppedTextureHook = playerCode.replace(croppedSkinDraw, (drawCall, crop, drawUv) => (
          `${crop}=g.M/g.O;$wnd.__BlobioCellRingTexture&&$wnd.__BlobioCellRingTexture(g,h,false);`
          + `${drawUv}(a.c,h.v,g.R-g.M,g.S-g.M,g.N,g.N,1-${crop},1-${crop},${crop},${crop})`
        ));
        if (withCroppedTextureHook !== playerCode) {
          playerCode = withCroppedTextureHook;
          drawsPatched += 1;
        }
      }
      if (!playerCode.includes('__BlobioCellRingTexture(g,h,h==Yxe)')) {
        const playerRegionDraw = /([A-Za-z_$][\w$]*)\(a\.c,h,g\.R-g\.M,g\.S-g\.M,g\.N,g\.N\)/;
        const withTextureHook = playerCode.replace(playerRegionDraw, (drawCall, drawRegion) => (
          `${drawRegion}(a.c,$wnd.__BlobioCellRingTexture?`
          + '$wnd.__BlobioCellRingTexture(g,h,h==Yxe):h,g.R-g.M,g.S-g.M,g.N,g.N)'
        ));
        if (withTextureHook !== playerCode) {
          playerCode = withTextureHook;
          drawsPatched += 1;
        }
      }
      code = code.slice(0, playerStart) + playerCode + code.slice(playerEnd);
    }

    const fallbackAnchor = /b\.K\.a=0\.75;[A-Za-z_$][\w$]*\(a\.c,[^;]+\);[A-Za-z_$][\w$]*\(a\.c,[A-Za-z_$][\w$]*,b\.R-b\.M,b\.S-b\.M,b\.N,b\.N\)/.exec(code);
    if (!fallbackAnchor) {
      return { code, drawsPatched };
    }

    const functionStart = code.lastIndexOf('function ', fallbackAnchor.index);
    const functionEnd = findFunctionEnd(code, functionStart);
    if (functionStart < 0 || functionEnd < 0) {
      return { code, drawsPatched };
    }

    let fallbackCode = code.slice(functionStart, functionEnd);
    if (!fallbackCode.includes('__BlobioCellRingTexture(b,c,c==Yxe)')) {
      const queuedRegionDraw = /([A-Za-z_$][\w$]*)\(a\.c,c,b\.R-b\.M,b\.S-b\.M,b\.N,b\.N\)/;
      const withTextureHook = fallbackCode.replace(queuedRegionDraw, (drawCall, drawRegion) => (
        `${drawRegion}(a.c,$wnd.__BlobioCellRingTexture?`
        + '$wnd.__BlobioCellRingTexture(b,c,c==Yxe):c,b.R-b.M,b.S-b.M,b.N,b.N)'
      ));
      if (withTextureHook !== fallbackCode) {
        fallbackCode = withTextureHook;
        drawsPatched += 1;
      }
    }
    if (!fallbackCode.includes('__BlobioCellRingTexture(b,b.P,')) {
      const directSkinDraw = /([A-Za-z_$][\w$]*)\(a\.c,b\.P,b\.R-b\.M,b\.S-b\.M,b\.N,b\.N\)/;
      const withDirectTextureHook = fallbackCode.replace(directSkinDraw, (drawCall, drawRegion) => {
        drawsPatched += 1;
        return `${drawRegion}(a.c,$wnd.__BlobioCellRingTexture?`
          + '$wnd.__BlobioCellRingTexture(b,b.P,b.P==Yxe):b.P,b.R-b.M,b.S-b.M,b.N,b.N)';
      });
      fallbackCode = withDirectTextureHook;
    }

    return {
      code: code.slice(0, functionStart) + fallbackCode + code.slice(functionEnd),
      drawsPatched,
    };
  }

  function patchBorderlessCellTexture(source) {
    if (source.includes('__BlobioCellRingBorderlessTexture')) {
      return { code: source, initPatched: false, drawsPatched: 0 };
    }

    const match = BORDER_TEXTURE_INIT_RE.exec(source);
    if (!match) {
      return { code: source, initPatched: false, drawsPatched: 0 };
    }

    const [
      original,
      nativeTexture,
      pixmap,
      PixmapCtor,
      initPixmap,
      setColor,
      borderShade,
      drawCircle,
      texture,
      TextureCtor,
      textureFormat,
      releasePixmap,
      textureManager,
      managerInstance,
      getPixmapHandle,
      TextureRegionCtor,
    ] = match;
    const borderlessTexture = '$wnd.__BlobioCellRingBorderlessTexture';
    const borderlessInit = `${borderlessTexture}=(${pixmap}=new ${PixmapCtor}(2,(${initPixmap}(),2)),`
      + `${setColor}(${pixmap},1,1,1),${drawCircle}(${pixmap},2),`
      + `${texture}=new ${TextureCtor}(${pixmap},${textureFormat},true),${releasePixmap}((${textureManager}(),${managerInstance}),${getPixmapHandle}(${pixmap}.n)),`
      + `new ${TextureRegionCtor}(${texture},0,0,${texture}.a.td(),${texture}.a.rd()));`;
    let code = source.replace(original, original + borderlessInit);
    const escapedTexture = escapeRegExp(nativeTexture);
    let drawsPatched = 0;
    const loopMatch = CELL_LOOP_RE.exec(code);
    const playerStart = loopMatch ? code.indexOf('case 1:', loopMatch.index) : -1;
    const playerEnd = code.indexOf('break;case 4:case 3:', playerStart);
    if (playerStart >= 0 && playerEnd > playerStart) {
      const playerCode = code.slice(playerStart, playerEnd);
      const playerDraw = new RegExp(`([A-Za-z_$][\\w$]*)\\(a\\.c,${escapedTexture},g\\.R-g\\.M,g\\.S-g\\.M,g\\.N,g\\.N\\)`);
      const patchedPlayerCode = playerCode.replace(playerDraw, (drawCall, drawRegion) => {
        drawsPatched += 1;
        const selectedTexture = `($wnd.__BlobioCellRingUseBorderlessTexture||g.p&&$wnd.__BlobioCellRingUseOwnBorderlessTexture)&&${borderlessTexture}?${borderlessTexture}:${nativeTexture}`;
        return `${drawRegion}(a.c,${selectedTexture},g.R-g.M,g.S-g.M,g.N,g.N)`;
      });
      code = code.slice(0, playerStart) + patchedPlayerCode + code.slice(playerEnd);
    }

    const fallbackDraw = new RegExp(`(else\\{b\\.K\\.a=0\\.75;[A-Za-z_$][\\w$]*\\(a\\.c,[^;]+\\);)([A-Za-z_$][\\w$]*)\\(a\\.c,${escapedTexture},b\\.R-b\\.M,b\\.S-b\\.M,b\\.N,b\\.N\\)`);
    code = code.replace(fallbackDraw, (drawCall, prefix, drawRegion) => {
      drawsPatched += 1;
      const selectedTexture = `($wnd.__BlobioCellRingUseBorderlessTexture||b.p&&$wnd.__BlobioCellRingUseOwnBorderlessTexture)&&b.c&&b.c.M==1&&${borderlessTexture}?${borderlessTexture}:${nativeTexture}`;
      return `${prefix}${drawRegion}(a.c,${selectedTexture},b.R-b.M,b.S-b.M,b.N,b.N)`;
    });

    return {
      code,
      initPatched: true,
      drawsPatched,
      borderShade,
    };
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function removeStaleOverlay() {
    const doc = win.document || globalThis.document;
    const stale = doc?.querySelectorAll?.(`canvas.${OVERLAY_CLASS}`) || [];
    for (const canvas of stale) {
      canvas.parentNode?.removeChild?.(canvas);
    }
  }

  function getEffectiveCellAlpha() {
    return settings.transparentCell ? settings.cellAlpha : 1;
  }

  function hasCompleteShaderPatch() {
    const expectedComparisons = state.shader.lastVariant === 'border'
      ? 5
      : state.shader.lastVariant === 'no-border'
        ? 4
        : Infinity;
    return state.shader.patchedCalls > 0
      && state.shader.maxComparisonsPatched >= expectedComparisons;
  }

  function hasOpaqueAlphaPatch() {
    return state.shader.patchedCalls > 0
      && state.shader.maxOpacityMultipliersPatched >= 1;
  }

  function getEffectiveShaderAlpha(packedByte) {
    return packedByte === OPAQUE_ALPHA_CODE && hasOpaqueAlphaPatch()
      ? 1
      : packedByte / 255;
  }

  function debugReport() {
    const alphaEncoding = encodeCellAlpha(settings.cellAlpha);
    const warnings = [];
    if (!state.shader.glowVertexPatched || !state.shader.glowFragmentPatched) {
      warnings.push('GLOW_SHADER_PAIR_NOT_OBSERVED');
    }
    if (!state.bundle.trackHookPatched) {
      warnings.push('GLOW_BEFORE_NAME_HOOK_NOT_PATCHED');
    }
    if (!state.bundle.fragmentShaderHookPatched) {
      warnings.push('FRAGMENT_SHADER_HOOK_NOT_PATCHED');
    }
    if (state.bundle.fragmentShaderHookPatched && state.shader.sourceCalls === 0) {
      warnings.push('FRAGMENT_SHADER_SOURCE_NOT_OBSERVED');
    }
    if (state.shader.sourceCalls > 0 && !hasCompleteShaderPatch()) {
      warnings.push('FRAGMENT_SHADER_ALPHA_MODES_NOT_PATCHED');
    }
    if (state.shader.sourceCalls > 0 && !hasOpaqueAlphaPatch()) {
      warnings.push('FRAGMENT_SHADER_OPAQUE_ALPHA_NOT_PATCHED');
    }

    const report = {
      installed: true,
      version: SCRIPT_VERSION,
      patchRevision: PATCH_REVISION,
      featureName: state.featureName,
      host,
      renderPath: state.renderPath,
      settings: cloneSettings(settings),
      reloadRequired: Boolean(state.reloadRequired),
      bundle: { ...state.bundle },
      shader: {
        prototypeWrappersInstalled: false,
        textureUploadTrackingInstalled: false,
        ...state.shader,
        hookPatched: state.bundle.fragmentShaderHookPatched,
        exactAlphaModesActive: hasCompleteShaderPatch(),
        alphaModeCodes: { ...SHADER_ALPHA_CODES },
        opaqueAlphaCode: OPAQUE_ALPHA_CODE,
      },
      alphaBehavior: {
        transparentCellOwnPlayerOnly: true,
        foreignColorHookConfigured: Boolean(win.__BlobioCellRingColorAllPlayers),
        colorHookPatched: state.bundle.colorHookPatched,
        ownSkinRgbNeutralWhenTransparent: true,
        foreignColorsChangedOnlyForBorderRemoval: !settings.cellBorderSync,
        customAlphaEncodingUsed: true,
        textureUploadTrackingUsed: false,
        cellFragmentShaderPatched: hasCompleteShaderPatch(),
        borderlessTextureActive: Boolean(settings.enabled && (settings.removeAllCellBorders || settings.removeOwnCellBorder)),
        skinIdentitySource: 'draw-texture-sentinel',
        borderRemovalMechanism: 'shader-mode-suppression-plus-opaque-borderless-texture',
        opaquePackedAlphaNormalized: hasOpaqueAlphaPatch(),
        borderlessTextureCircleRadius: 2,
        requestedCellAlpha: roundDebugNumber(alphaEncoding.requested),
        encodedCellAlpha: roundDebugNumber(alphaEncoding.value),
        packedAlphaByte: alphaEncoding.packedByte,
        packedShaderAlpha: roundDebugNumber(alphaEncoding.packedShaderAlpha),
        shaderAlpha: roundDebugNumber(getEffectiveShaderAlpha(alphaEncoding.packedByte)),
        reservedCodeCollisionAvoided: alphaEncoding.reservedCollision,
        predictedShaderMode: RESERVED_SHADER_ALPHA_CODES.has(alphaEncoding.packedByte)
          ? 'reserved'
          : 'normal-texture',
        effectiveCellAlpha: roundDebugNumber(getEffectiveCellAlpha()),
      },
      borderRemoval: {
        requested: shouldUseBorderlessTexture(),
        ownRequested: Boolean(settings.enabled && settings.removeOwnCellBorder),
        foreignColorHookConfigured: Boolean(win.__BlobioCellRingColorAllPlayers),
        colorHookPatched: state.bundle.colorHookPatched,
        borderSuppressions: state.markers.borderSuppressions,
        ownSuppressions: state.markers.ownBorderSuppressions,
        foreignSuppressions: state.markers.foreignBorderSuppressions,
        defaultTextureSubstitutions: state.markers.defaultTextureSubstitutions,
        missingBorderlessTexture: state.markers.missingBorderlessTexture,
        opaquePackedAlphaNormalized: hasOpaqueAlphaPatch(),
        borderlessTextureCircleRadius: 2,
      },
      markers: { ...state.markers },
      diagnostics: { warnings },
      canvas: getCanvasDebugInfo(),
      overlay: {
        frames: state.overlay.frames,
        draws: state.overlay.draws,
        clearCalls: state.overlay.clearCalls,
        skipped: state.overlay.skipped,
        trackCalls: state.overlay.trackCalls,
        trackFrameLimitSkips: state.overlay.trackFrameLimitSkips,
        trackSetupSkips: state.overlay.trackSetupSkips,
        trackViewportSkips: state.overlay.trackViewportSkips,
        trackDrawSkips: state.overlay.trackDrawSkips,
        compileErrors: state.overlay.compileErrors,
        lastError: state.overlay.lastError,
        hasCanvas: false,
        hasContext: false,
        layer: 'native-cell-before-name',
        frameDraws: overlay.frameDraws,
        glowScale: 1 + (OVERLAY_GLOW_SCALE - 1) * settings.glowSize,
        glowSize: settings.glowSize,
        renderScale: OVERLAY_RENDER_SCALE,
        maxDrawsPerFrame: MAX_GLOW_DRAWS_PER_FRAME,
        cssWidth: roundDebugNumber(overlay.cssWidth),
        cssHeight: roundDebugNumber(overlay.cssHeight),
        dpr: roundDebugNumber(overlay.dpr),
      },
      commands: [
        'BlobioCellRingDebug()',
        'window.__blobCellRingDebug()',
        'BlobioCellRingPerformanceDebug()',
        'await BlobioRenderPerformanceProfile(3000)',
      ],
      errors: [...state.errors],
    };
    win.console?.log?.('[Blobio Glow transparent Cell] debug', report);
    return report;
  }

  function cloneSettings(value) {
    return {
      enabled: value.enabled,
      mode: value.mode,
      solidColor: value.solidColor,
      alpha: value.alpha,
      glowSize: value.glowSize,
      borderWidth: value.borderWidth,
      transparentCell: value.transparentCell,
      cellAlpha: value.cellAlpha,
      nameStyle: value.nameStyle,
      removeOwnCellBorder: value.removeOwnCellBorder,
      removeAllCellBorders: value.removeAllCellBorders,
      cellBorderSync: value.cellBorderSync,
      effectiveCellAlpha: getEffectiveCellAlpha(),
    };
  }

  function getCanvasDebugInfo() {
    const doc = win.document || globalThis.document;
    if (!doc?.querySelectorAll) {
      return { count: 0, items: [] };
    }
    const allCanvases = doc.querySelectorAll('canvas');
    const canvases = Array.prototype.slice.call(allCanvases, 0, 6);
    return {
      count: allCanvases.length,
      items: canvases.map((canvas) => {
        const rect = canvas.getBoundingClientRect?.() || null;
        return {
          width: canvas.width || 0,
          height: canvas.height || 0,
          cssWidth: rect ? roundDebugNumber(rect.width) : null,
          cssHeight: rect ? roundDebugNumber(rect.height) : null,
          className: String(canvas.className || ''),
          id: String(canvas.id || ''),
        };
      }),
    };
  }

  function roundDebugNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number * 1000) / 1000 : null;
  }

  function rememberError(error) {
    const message = error?.message ? String(error.message) : String(error || 'Unknown error');
    state.errors.push(message);
    if (state.errors.length > 8) {
      state.errors.shift();
    }
    win.console?.warn?.('[Blobio Glow transparent Cell]', message);
  }
}
