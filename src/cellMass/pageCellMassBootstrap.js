export function pageCellMassBootstrap(initialSettings = {}, pageWindow = globalThis) {
  const win = pageWindow || globalThis;
  const SCRIPT_VERSION = '0.1.39';
  const host = String(win.location?.hostname || '').toLowerCase();
  if (host && host !== 'custom.client.blobgame.io' && host !== 'blobgame.io') {
    return false;
  }

  if (win.__blobioCellMassInstalled && !needsRuntimeUpgrade()) {
    win.__blobioCellMassRefresh?.(initialSettings);
    return true;
  }

  const CACHE_SCRIPT_RE = /\/html\/[a-f0-9]{32}\.cache\.js(?:[?#].*)?$/i;
  const DRAW_HOOK_NAME = 'BlobioCellMassDraw';
  const CLAN_DRAW_HOOK_NAME = 'BlobioCellClanTagDraw';
  const PATCH_MARKER = 'BlobioCellMassDraw';
  const CLAN_TAG_OVERLAY_CLASS = 'blobio-cell-clan-tag-overlay';
  const CLAN_TAG_OVERLAY_STYLE_ID = 'blobio-cell-clan-tag-overlay-style';
  const GAME_CANVAS_CLASS = 'blobio-background-game-canvas';
  const IGNORED_CANVAS_CLASSES = new Set([
    CLAN_TAG_OVERLAY_CLASS,
    'blobio-emote-skin-overlay',
    'hidden',
  ]);
  const CLAN_CACHE_KEY = 'blobio.roles.clanCache';
  const CLAN_TEXT_KEYS = {
    enabled: 'blobio.roles.clanText.enabled',
    showCellTags: 'blobio.roles.clanText.showCellTags',
  };
  const MIN_RENDER_SIZE = 13;
  const MAX_LABEL_WIDTH = 0.9;
  const MAX_LABEL_HEIGHT = 0.32;
  const PRIMARY_MAX_LABEL_HEIGHT = 0.42;
  const CLAN_TAG_MAX_WIDTH = 0.65;
  const CLAN_TAG_SCALE_FACTOR = 0.72;
  const CLAN_TAG_MAX_RADIUS_RATIO = 0.36;
  const CLAN_TAG_ABOVE_RADIUS_OFFSET = 0.46;
  const CLAN_TAG_BELOW_RADIUS_OFFSET = 0.75;
  const CLAN_TAG_SHORT_NAME_DOWNWARD_OFFSET = 0.1;
  const CLAN_TAG_CELL_EPSILON = 0.0001;
  const CLAN_TAG_COLOR = Object.freeze({ d: 0.498, c: 0.498, b: 0.498, a: 1 });
  const CLAN_PRIMARY_CELL_TTL_MS = 900;
  const CLAN_TAG_STALE_CLEAR_MS = 700;
  const CLAN_TAG_TARGET_REFRESH_MS = 500;
  const MASS_UPDATE_BATCH_WINDOW_MS = 80;
  const MASS_DEBUG_SAMPLE_INTERVAL = 64;
  const CLAN_DEBUG_SAMPLE_INTERVAL = 64;
  const PLAYER_UID_MAP_REFRESH_MS = 1000;
  const PLAYER_UID_MAP_MAX_ROWS = 80;
  const CONTEXT_MENU_UID_HOOK_RETRY_MS = 250;
  const CONTEXT_MENU_UID_HOOK_TIMEOUT_MS = 30000;
  const UID_LOOKUP_PACKET = 65;
  const UID_LOOKUP_COOLDOWN_MS = 30000;
  const UID_LOOKUP_RESPONSE_TIMEOUT_MS = 5000;
  const UID_LOOKUP_MIN_INTERVAL_MS = 120;
  const UID_LOOKUP_MAX_QUEUE = 64;
  const HUD_SOCKET_HOOK_RETRY_MS = 250;
  const HUD_SOCKET_HOOK_TIMEOUT_MS = 30000;

  let settings = normalizeSettings(initialSettings);
  let clanTagState = createEmptyClanTagState();
  let playerUidState = createEmptyPlayerUidState();
  let lastCacheSweep = 0;
  let lastClanCellSweep = 0;
  let activeGameSocket = null;
  let originalSocketSend = null;
  let socketBridge = null;
  let nextUidLookupAt = 0;
  let nextMassUpdateAt = 0;
  let massBatchOpenUntil = 0;
  const clanOverlay = {
    overlay: null,
    context: null,
    targetCanvas: null,
    targetCanvasCheckedAt: 0,
    pending: new Map(),
    frameId: 0,
    selectedCells: new Map(),
    flushScheduled: false,
    staleClearTimer: 0,
    staleClearDeadline: 0,
    hasVisibleContent: false,
  };

  const labelCache = new Map();
  const clanCellCache = new Map();
  const queuedUidLookups = new Map();
  const pendingUidLookups = new Map();
  const uidLookupCooldowns = new Map();
  const uidLookupQueue = [];
  const uidResponseOrigins = [];
  const seenClanPlayerIds = new Map();
  const messageHookedSockets = new WeakSet();
  const state = {
    installed: true,
    version: SCRIPT_VERSION,
    startedAt: Date.now(),
    settings,
    seenCacheScripts: 0,
    wrappedCallback: false,
    patchedChunks: 0,
    lastPatchResult: null,
    counters: {
      drawHookCalls: 0,
      labelsDrawn: 0,
      labelUpdates: 0,
      cacheHits: 0,
      hiddenBySetting: 0,
      hiddenByThreshold: 0,
      hiddenBySmartLimit: 0,
      primaryLabels: 0,
      clanHookCalls: 0,
      clanTagsDrawn: 0,
      clanHiddenBySetting: 0,
      clanHiddenByName: 0,
      clanHiddenByUid: 0,
      clanResolvedByDirectUid: 0,
      clanResolvedByPlayerId: 0,
      clanResolvedByName: 0,
      clanUidMapRefreshes: 0,
      clanContextMenuHookCalls: 0,
      clanHiddenByCellPriority: 0,
      clanUidLookupQueued: 0,
      clanUidLookupSent: 0,
      clanUidLookupResponses: 0,
      clanUidLookupSuppressedMenus: 0,
      clanUidLookupSkippedSocket: 0,
      clanUidLookupQueueDrops: 0,
      clanUidLookupSentBySocket: 0,
      clanUidLookupSentByBridge: 0,
      clanUidLookupResponseHooks: 0,
      clanUidLookupMessageResponses: 0,
      clanUidLookupManualRequests: 0,
      clanUidLookupManualResponses: 0,
      clanOverlayFrames: 0,
      clanOverlayDraws: 0,
      clanOverlayQueueCalls: 0,
      clanOverlayCandidatesReplaced: 0,
      clanOverlayFlushes: 0,
      clanOverlayMicrotasks: 0,
      clanOverlayTimeouts: 0,
      clanOverlayClearCalls: 0,
      clanOverlayStaleTimers: 0,
      clanOverlayStaleDeadlineUpdates: 0,
      clanOverlayFallbackClears: 0,
      clanOverlayStaleClears: 0,
      clanOverlaySkipped: 0,
      clanOverlayCleanups: 0,
      clanSeenDetailSamples: 0,
      clanSeenDetailSkips: 0,
      clanRecentCellDiagnosticCalls: 0,
      clanRecentCellSamples: 0,
      clanRecentCellSkips: 0,
      clanLastMatchDiagnosticCalls: 0,
      clanLastMatchSamples: 0,
      clanLastMatchSkips: 0,
    },
    clanTags: describeClanTagState(),
    playerUidMap: describePlayerUidState(),
    samples: [],
    recentClanCells: [],
    lastLabel: null,
    lastDrawCapture: null,
    lastClanTag: null,
    lastClanDrawCapture: null,
    lastClanOverlayDraw: null,
    errors: [],
  };

  win.__blobioCellMassInstalled = true;
  win.__blobioCellMassState = state;
  win[DRAW_HOOK_NAME] = drawCellMassLabel;
  win.__blobioCellMassMeasureName = measureMassName;
  win.__blobioCellMassPosition = positionDynamicMass;
  win[CLAN_DRAW_HOOK_NAME] = safeDrawCellClanTagLabel;
  win.__blobioCellMassRefresh = refreshSettings;
  win.__blobioCellClanTagRefresh = refreshClanTagState;
  win.__blobioCellClanTagBeginFrame = safeBeginClanTagOverlayFrame;
  win.__blobioCellClanTagRender = safeRenderCellClanTagOverlay;
  win.__blobioCellClanUidResponse = handleSocketUidResponse;
  win.__BlobioCellMassDebug = debugReport;
  win.BlobioCellMassDebug = debugReport;
  win.BlobioShowMassDebug = debugReport;
  win.blobioCellMassDebug = debugReport;
  win.__blobioClanDebug = clanDebugReport;
  win.BlobioClanDebug = clanDebugReport;
  win.BlobioClanLookupDebug = debugQueuePlayerUidLookup;
  win.__blobioCellMassCaptureDraw = captureSampledDrawState;
  win.__blobioCellClanTagCaptureDraw = captureClanTagDrawState;

  if (win.__BLOBIO_CELL_MASS_TEST__) {
    win.__BlobioCellMassTestApi = {
      captureDrawState,
      captureClanTagDrawState,
      drawCellClanTagLabel,
      drawCellMassLabel,
      measureMassName,
      positionDynamicMass,
      beginClanTagOverlayFrame,
      clanDebugReport,
      debugQueuePlayerUidLookup,
      flushClanTagOverlayDraws,
      formatMass,
      getFitScale,
      installContextMenuUidHook,
      normalizeSettings,
      patchGameBundle,
      handleSocketUidResponse,
      readUidLookupResponseMessage,
      refreshClanTagState,
      refreshPlayerUidMapIfNeeded,
      refreshSettings,
      renderCellClanTagOverlay,
    };
  }

  refreshClanTagState();
  cleanupStaleClanTagOverlayCanvases();
  installClanTagOverlayStyle();
  installContextMenuUidHook();
  adoptClanUidSocketBridge();
  installPlayerUidSocketProbe();
  installHudSocketCallbackProbeWithRetry();
  installGameScriptPatch();
  return true;

  function measureMassName(label, cache, nameDrawn) {
    label.nameTop = Infinity;
    label.nameBottom = -Infinity;
    if (!nameDrawn) return;
    // Bitmap glyph quads include outlines that GlyphLayout's height leaves out.
    for (let page = 0; page < cache.j.length; page += 1) {
      const vertices = cache.j[page];
      for (let index = 1; index < cache.e[page]; index += 5) {
        label.nameTop = Math.min(label.nameTop, vertices[index]);
        label.nameBottom = Math.max(label.nameBottom, vertices[index]);
      }
    }
  }

  function positionDynamicMass(label, cache, centerY, radius, loweredName) {
    let top = Infinity;
    let bottom = -Infinity;
    for (let page = 0; page < cache.j.length; page += 1) {
      const vertices = cache.j[page];
      for (let index = 1; index < cache.e[page]; index += 5) {
        top = Math.min(top, vertices[index]);
        bottom = Math.max(bottom, vertices[index]);
      }
    }
    if (!Number.isFinite(top) || !Number.isFinite(bottom)) return 0;
    const height = bottom - top;
    const gap = height * Math.max(0.1, label.lineGap);
    let targetTop = centerY - height / 2;
    if (Number.isFinite(label.nameTop) && Number.isFinite(label.nameBottom)) {
      // Keep the mass on the side opposite the clan tag. Never clamp it into the name.
      targetTop = loweredName
        ? Math.min(label.nameTop - gap - height, Math.max(centerY - radius, targetTop))
        : Math.max(label.nameBottom + gap, Math.min(centerY + radius - height, targetTop));
    }
    const offset = targetTop - top;
    for (let page = 0; page < cache.j.length; page += 1) {
      const vertices = cache.j[page];
      for (let index = 1; index < cache.e[page]; index += 5) {
        vertices[index] += offset;
      }
    }
    return offset;
  }

  function refreshSettings(nextSettings = {}) {
    const previous = settings;
    settings = normalizeSettings({
      ...settings,
      ...(nextSettings || {}),
    });
    state.settings = settings;

    if (
      previous.compact !== settings.compact
      || previous.updateDelayMs !== settings.updateDelayMs
    ) {
      labelCache.clear();
      nextMassUpdateAt = 0;
      massBatchOpenUntil = 0;
    }

    return settings;
  }

  function refreshClanTagState() {
    clanTagState = readClanTagState();
    state.clanTags = describeClanTagState();
    return state.clanTags;
  }

  function drawCellMassLabel(cellId, mass, rawSize, renderSize, cellSize, name, nameDrawn, nameScale, explicitFitScale, totalMass) {
    state.counters.drawHookCalls += 1;

    if (!settings.enabled) {
      state.counters.hiddenBySetting += 1;
      return null;
    }

    const safeMass = Math.max(0, Number(mass) || 0);
    const safeRawSize = Number(rawSize) || 0;
    const safeRenderSize = Number(renderSize) || safeRawSize;
    if (safeMass <= 0 || Math.max(safeRawSize, safeRenderSize) < MIN_RENDER_SIZE) {
      state.counters.hiddenByThreshold += 1;
      return null;
    }

    const autoMinMass = settings.smartRendering ? getAutoMinMass(totalMass) : 0;
    if (autoMinMass > 0 && safeMass <= autoMinMass) {
      state.counters.hiddenBySmartLimit += 1;
      return null;
    }

    let text;
    let cached = false;
    if (settings.updateDelayMs <= 0) {
      text = formatMass(safeMass);
      state.counters.labelUpdates += 1;
    } else {
      const now = Date.now();
      sweepLabelCache(now);
      const textEntry = readMassText(cellId, safeMass, now);
      text = textEntry.text;
      cached = textEntry.cached;
    }

    if (!text) {
      return null;
    }

    const explicitScale = Number(explicitFitScale);
    const fitScale = explicitScale > 0
      ? explicitScale
      : getFitScale(text, name, nameScale, safeRenderSize);
    const largestSize = Math.max(safeRawSize, safeRenderSize);
    const primary = isPrimaryLabel(safeMass, largestSize, totalMass);
    const requestedScale = fitScale * settings.textScale;
    let scale = Number.isFinite(requestedScale)
      ? Math.max(0.001, Math.min(1.4, requestedScale))
      : settings.textScale;
    const readableFloor = readableScaleFloor(largestSize);

    if (primary) {
      scale = Math.max(scale, readableFloor);
      state.counters.primaryLabels += 1;
    } else {
      scale = Math.max(scale, secondaryReadableScaleFloor(safeMass, largestSize, readableFloor));
    }

    const result = {
      text,
      scale,
      dynamic: settings.mode === 'dynamic',
      offset: settings.yOffset,
      lineGap: settings.nameGap,
      maxWidth: MAX_LABEL_WIDTH,
      maxHeight: primary ? PRIMARY_MAX_LABEL_HEIGHT : MAX_LABEL_HEIGHT,
      cached,
      primary,
    };

    state.counters.labelsDrawn += 1;
    if (state.counters.labelsDrawn % MASS_DEBUG_SAMPLE_INTERVAL === 1) {
      state.lastLabel = cloneLabelResult(cellId, safeMass, result);
      rememberSample(cellId, safeMass, safeRawSize, safeRenderSize, cellSize, name, Boolean(nameDrawn), result);
    }
    return result;
  }

  function needsRuntimeUpgrade() {
    return win.__blobioCellMassState?.version !== SCRIPT_VERSION
      || typeof win.BlobioCellClanTagDraw !== 'function'
      || typeof win.__blobioCellClanUidResponse !== 'function'
      || typeof win.__blobioCellClanTagRefresh !== 'function'
      || typeof win.__blobioCellClanTagRender !== 'function'
      || !win.__blobioCellMassState?.clanTags;
  }

  function safeDrawCellClanTagLabel(...args) {
    try {
      return drawCellClanTagLabel(...args);
    } catch (error) {
      rememberClanTagHookError(error, 'label');
      return null;
    }
  }

  function safeBeginClanTagOverlayFrame() {
    try {
      return beginClanTagOverlayFrame();
    } catch (error) {
      rememberClanTagHookError(error, 'begin-frame');
      return false;
    }
  }

  function safeRenderCellClanTagOverlay(...args) {
    try {
      return renderCellClanTagOverlay(...args);
    } catch (error) {
      rememberClanTagHookError(error, 'render');
      return false;
    }
  }

  function drawCellClanTagLabel(
    playerId,
    cellId,
    mass,
    rawSize,
    renderSize,
    cellSize,
    name,
    nameDrawn,
    nameScale,
    isOwnCell = false,
    loweredRankName = false,
  ) {
    state.counters.clanHookCalls += 1;
    rememberSeenClanPlayerId(playerId, name, cellId);

    if (!clanTagState.settings.enabled || !clanTagState.settings.showCellTags) {
      state.counters.clanHiddenBySetting += 1;
      rememberClanCellSample('hidden-setting', playerId, cellId, mass, renderSize, name, nameDrawn);
      return null;
    }

    const safeMass = Math.max(0, Number(mass) || 0);
    const safeRenderSize = Number(renderSize) || Number(rawSize) || 0;
    const trimmedName = String(name || '').trim();
    if (!nameDrawn || !trimmedName) {
      const lookupQueued = queuePlayerUidLookup(playerId, name);
      rememberClanCellSample('hidden-name', playerId, cellId, safeMass, safeRenderSize, name, nameDrawn, '', { lookupQueued });
      state.counters.clanHiddenByName += 1;
      return null;
    }

    const uid = resolveCellUid(playerId, name);
    const clan = uid ? clanTagState.members.get(uid) : null;
    updateSeenClanPlayerUid(playerId, uid, clan?.tag ? 'clan-member' : (uid ? 'mapped-non-clan' : 'no-clan'));
    if (!clan?.tag) {
      const lookupQueued = queuePlayerUidLookup(playerId, name);
      rememberClanCellSample('hidden-uid', playerId, cellId, safeMass, safeRenderSize, name, nameDrawn, uid, { lookupQueued });
      state.counters.clanHiddenByUid += 1;
      return null;
    }

    if (!shouldRenderClanForCell(uid, cellId, safeMass, safeRenderSize)) {
      rememberClanCellSample('cell-priority', playerId, cellId, safeMass, safeRenderSize, name, nameDrawn, uid);
      state.counters.clanHiddenByCellPriority += 1;
      return null;
    }

    let nicknameLength = 0;
    for (const _character of trimmedName) {
      nicknameLength += 1;
      if (nicknameLength > 3) {
        break;
      }
    }
    const shortName = nicknameLength >= 1 && nicknameLength <= 3;
    const baseScale = clampNumber(nameScale, 0.001, 1.4, Math.max(0.001, safeRenderSize / 420));
    const scale = clampNumber(baseScale * CLAN_TAG_SCALE_FACTOR, 0.001, 1.05, baseScale * CLAN_TAG_SCALE_FACTOR);
    const result = {
      uid,
      cellId: String(cellId ?? ''),
      text: ` {${clan.tag}}`,
      tag: clan.tag,
      scale,
      priority: getClanCellMetric(safeMass, safeRenderSize),
      gap: Math.max(3, Math.min(12, safeRenderSize * 0.04)),
      maxWidth: CLAN_TAG_MAX_WIDTH,
      position: settings.mode === 'vip' || (settings.mode === 'dynamic' && loweredRankName) ? 'below' : 'above',
      downwardOffsetRatio: shortName ? CLAN_TAG_SHORT_NAME_DOWNWARD_OFFSET : 0,
      bold: true,
      color: { ...CLAN_TAG_COLOR },
    };

    state.counters.clanTagsDrawn += 1;
    state.lastClanTag = {
      at: Date.now(),
      uid,
      cellId: String(cellId ?? ''),
      name: String(name || '').slice(0, 32),
      text: result.text,
      scale: roundNumber(scale),
      mass: Math.round(safeMass * 10) / 10,
      source: playerUidState.lastMatch?.source || '',
      playerId: String(playerId ?? ''),
      isOwnCell: Boolean(isOwnCell),
      loweredRankName: Boolean(loweredRankName),
      nicknameLength,
      downwardOffsetRatio: result.downwardOffsetRatio,
    };
    return result;
  }

  function beginClanTagOverlayFrame() {
    state.counters.clanOverlayFrames += 1;
    if (clanOverlay.hasVisibleContent) {
      let cleared = clearClanTagOverlayCanvas();
      if (!cleared && ensureClanTagOverlay()) {
        cleared = clearClanTagOverlayCanvas();
      }
      if (cleared) {
        clanOverlay.hasVisibleContent = false;
      } else {
        state.counters.clanOverlaySkipped += 1;
      }
    }

    clanOverlay.frameId += 1;
    clanOverlay.pending.clear();
    clanOverlay.flushScheduled = false;
    return true;
  }

  function clearClanTagOverlayCanvas() {
    const width = Number(clanOverlay.overlay?.width) || 0;
    const height = Number(clanOverlay.overlay?.height) || 0;
    if (width <= 0 || height <= 0 || !clanOverlay.context) {
      return false;
    }

    clanOverlay.context.clearRect?.(0, 0, width, height);
    state.counters.clanOverlayClearCalls += 1;
    return true;
  }

  function renderCellClanTagOverlay(label, centerX, centerY, cellSize, radius, projectionMatrix) {
    if (!label?.text || !ensureClanTagOverlay()) {
      state.counters.clanOverlaySkipped += 1;
      return false;
    }

    const text = String(label.text || '').trim();
    if (!text) {
      state.counters.clanOverlaySkipped += 1;
      return false;
    }

    const queued = queueClanTagOverlayDraw(label, centerX, centerY, cellSize, radius, projectionMatrix);
    if (queued) {
      scheduleClanTagOverlayFlush();
    }
    return queued;
  }

  function queueClanTagOverlayDraw(label, centerX, centerY, cellSize, radius, projectionMatrix) {
    state.counters.clanOverlayQueueCalls += 1;
    const key = normalizeUid(label.uid) || String(label.cellId || label.text || 'clan-tag');
    const priority = Number(label.priority) || getClanCellMetric(0, Number(radius) || Number(cellSize) || 0);
    const drawInfo = getClanTagDrawInfo(centerX, centerY, radius, cellSize, projectionMatrix);
    const candidate = {
      label,
      centerX,
      centerY,
      cellSize,
      radius,
      projectionMatrix: null,
      drawInfo,
      priority,
    };
    const current = clanOverlay.pending.get(key);
    if (!current) {
      clanOverlay.pending.set(key, candidate);
      return true;
    }

    const currentCellId = String(current.label?.cellId ?? '');
    const nextCellId = String(label?.cellId ?? '');
    if (currentCellId && currentCellId === nextCellId) {
      clanOverlay.pending.set(key, candidate);
      state.counters.clanOverlayCandidatesReplaced += 1;
      return true;
    }

    if (priority > current.priority + CLAN_TAG_CELL_EPSILON) {
      clanOverlay.pending.set(key, candidate);
      state.counters.clanOverlayCandidatesReplaced += 1;
      return true;
    }
    if (current.priority > priority + CLAN_TAG_CELL_EPSILON) {
      return true;
    }

    const selectedCellId = clanOverlay.selectedCells.get(key);
    if (selectedCellId && currentCellId === selectedCellId) {
      return true;
    }
    clanOverlay.pending.set(key, candidate);
    state.counters.clanOverlayCandidatesReplaced += 1;
    return true;
  }

  function scheduleClanTagOverlayFlush() {
    if (clanOverlay.flushScheduled) {
      return;
    }

    clanOverlay.flushScheduled = true;
    const run = () => {
      clanOverlay.flushScheduled = false;
      flushClanTagOverlayDraws();
    };

    if (typeof win.queueMicrotask === 'function') {
      state.counters.clanOverlayMicrotasks += 1;
      win.queueMicrotask(run);
      return;
    }
    if (typeof win.setTimeout === 'function') {
      state.counters.clanOverlayTimeouts += 1;
      win.setTimeout(run, 0);
      return;
    }
    run();
  }

  function flushClanTagOverlayDraws() {
    state.counters.clanOverlayFlushes += 1;
    clanOverlay.flushScheduled = false;
    if (
      clanOverlay.pending.size > 0
      && state.counters.clanOverlayFrames === 0
      && clanOverlay.hasVisibleContent
      && clearClanTagOverlayCanvas()
    ) {
      clanOverlay.hasVisibleContent = false;
      state.counters.clanOverlayFallbackClears += 1;
    }

    let drawn = 0;
    for (const candidate of clanOverlay.pending.values()) {
      let didDraw = false;
      try {
        didDraw = drawCellClanTagOverlayNow(candidate);
      } catch (error) {
        rememberClanTagHookError(error, 'flush');
        state.counters.clanOverlaySkipped += 1;
      }

      if (didDraw) {
        const key = normalizeUid(candidate.label?.uid) || String(candidate.label?.cellId || candidate.label?.text || 'clan-tag');
        const cellId = String(candidate.label?.cellId ?? '');
        if (key && cellId) {
          clanOverlay.selectedCells.set(key, cellId);
        }
        drawn += 1;
      }
    }
    clanOverlay.pending.clear();
    if (clanOverlay.hasVisibleContent) {
      scheduleClanTagOverlayStaleClear();
    }
    return drawn;
  }

  function scheduleClanTagOverlayStaleClear() {
    if (typeof win.setTimeout !== 'function') {
      return;
    }

    clanOverlay.staleClearDeadline = Date.now() + CLAN_TAG_STALE_CLEAR_MS;
    state.counters.clanOverlayStaleDeadlineUpdates += 1;
    if (clanOverlay.staleClearTimer) {
      return;
    }

    const checkDeadline = () => {
      clanOverlay.staleClearTimer = 0;
      const remaining = clanOverlay.staleClearDeadline - Date.now();
      if (remaining > 0) {
        clanOverlay.staleClearTimer = win.setTimeout(checkDeadline, remaining);
        state.counters.clanOverlayStaleTimers += 1;
        return;
      }

      clanOverlay.staleClearDeadline = 0;
      clanOverlay.pending.clear();
      clanOverlay.selectedCells.clear();
      if (clanOverlay.hasVisibleContent && clearClanTagOverlayCanvas()) {
        clanOverlay.hasVisibleContent = false;
        state.counters.clanOverlayStaleClears += 1;
        state.lastClanOverlayDraw = {
          at: Date.now(),
          drawn: false,
          reason: 'stale-clear',
        };
      }
    };

    clanOverlay.staleClearTimer = win.setTimeout(checkDeadline, CLAN_TAG_STALE_CLEAR_MS);
    state.counters.clanOverlayStaleTimers += 1;
  }

  function drawCellClanTagOverlayNow(candidate) {
    const { label, centerX, centerY, cellSize, radius, projectionMatrix } = candidate;
    const text = String(label.text || '').trim();
    const drawInfo = candidate.drawInfo || getClanTagDrawInfo(centerX, centerY, radius, cellSize, projectionMatrix);
    if (!drawInfo || !isClanTagNearViewport(drawInfo.x, drawInfo.y, drawInfo.radius)) {
      state.counters.clanOverlaySkipped += 1;
      state.lastClanOverlayDraw = {
        at: Date.now(),
        drawn: false,
        reason: drawInfo ? 'outside-viewport' : 'invalid-position',
        text,
      };
      return false;
    }

    const context = clanOverlay.context;
    const fontSize = getClanTagFontSize(drawInfo.radius, label.scale);
    const gap = Math.max(3, Math.min(14, fontSize * 0.25));
    const aboveNameOffset = Math.min(drawInfo.radius * CLAN_TAG_ABOVE_RADIUS_OFFSET, fontSize * 2.25);
    const belowDesiredOffset = Math.max(
      drawInfo.radius * CLAN_TAG_BELOW_RADIUS_OFFSET,
      aboveNameOffset + gap + fontSize * 1.2,
    );
    const belowMaxOffset = Math.max(fontSize * 1.2, drawInfo.radius - fontSize * 0.45);
    const downwardOffset = drawInfo.radius * 2 * clampNumber(label.downwardOffsetRatio, 0, 0.1, 0);
    const belowNameOffset = Math.min(belowDesiredOffset, belowMaxOffset) + downwardOffset;
    const x = drawInfo.x;
    const y = label.position === 'above'
      ? drawInfo.y - aboveNameOffset - gap + downwardOffset
      : drawInfo.y + belowNameOffset;

    context.font = `800 ${fontSize}px Ubuntu, Arial, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineJoin = 'round';
    context.lineWidth = Math.max(2, Math.round(fontSize * 0.09));
    context.strokeStyle = 'rgba(20, 20, 20, 0.88)';
    context.fillStyle = 'rgba(127, 127, 127, 1)';
    context.strokeText?.(text, x, y);
    clanOverlay.hasVisibleContent = true;
    context.fillText?.(text, x, y);

    state.counters.clanOverlayDraws += 1;
    state.lastClanOverlayDraw = {
      at: Date.now(),
      drawn: true,
      text,
      cellId: String(label.cellId ?? ''),
      uid: String(label.uid ?? ''),
      tag: String(label.tag ?? ''),
      position: label.position || '',
      x: roundNumber(x),
      y: roundNumber(y),
      worldX: roundNumber(Number(centerX) || 0),
      worldY: roundNumber(Number(centerY) || 0),
      radius: roundNumber(drawInfo.radius),
      fontSize: roundNumber(fontSize),
      offsetFromCenter: roundNumber(y - drawInfo.y),
      downwardOffset: roundNumber(label.position === 'below' ? downwardOffset : 0),
      downwardOffsetRatio: label.position === 'below' ? roundNumber(Number(label.downwardOffsetRatio) || 0) : 0,
      font: context.font,
      projected: Boolean(drawInfo.projected),
    };
    return true;
  }

  function getClanTagDrawInfo(centerX, centerY, radius, cellSize, projectionMatrix) {
    const x = Number(centerX);
    const y = Number(centerY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }

    const projected = projectClanTagWorldPoint(x, y, projectionMatrix);
    if (!projected) {
      return null;
    }

    const measureRadius = Math.max(0, Number(radius) || Number(cellSize) / 2 || 0);
    const right = measureRadius > 0 ? projectClanTagWorldPoint(x + measureRadius, y, projectionMatrix) : null;
    const top = measureRadius > 0 ? projectClanTagWorldPoint(x, y + measureRadius, projectionMatrix) : null;
    const screenRadius = Math.max(
      right ? Math.abs(right.x - projected.x) : 0,
      top ? Math.abs(top.y - projected.y) : 0,
      1,
    );

    return {
      x: projected.x,
      y: projected.y,
      radius: screenRadius,
      projected: true,
    };
  }

  function projectClanTagWorldPoint(x, y, projectionMatrix) {
    const matrix = getProjectionMatrixValues(projectionMatrix);
    const viewport = getClanTagOverlayViewport();
    if (!matrix || viewport.width <= 0 || viewport.height <= 0) {
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
      x: (ndcX + 1) * 0.5 * viewport.width,
      y: (1 - ndcY) * 0.5 * viewport.height,
    };
  }

  function getProjectionMatrixValues(value) {
    const matrix = value?.a || value;
    return matrix && typeof matrix.length === 'number' && matrix.length >= 16 ? matrix : null;
  }

  function getClanTagOverlayViewport() {
    const rect = clanOverlay.targetCanvas?.getBoundingClientRect?.();
    return {
      width: Number(rect?.width) || parseCssPixels(clanOverlay.overlay?.style?.width) || Number(win.innerWidth) || 0,
      height: Number(rect?.height) || parseCssPixels(clanOverlay.overlay?.style?.height) || Number(win.innerHeight) || 0,
    };
  }

  function getClanTagFontSize(screenRadius, scale) {
    const radius = Math.max(0, Number(screenRadius) || 0);
    const safeScale = clampNumber(scale, 0.55, 1.05, 0.72);
    const scaled = radius * 0.19 * safeScale;
    const normalSize = clampNumber(scaled, 12, 64, 16);
    const radiusCap = radius * CLAN_TAG_MAX_RADIUS_RATIO;
    if (safeScale > 0.8 && radiusCap > 0 && normalSize > radiusCap) {
      return Math.max(4, radiusCap);
    }
    return normalSize;
  }

  function isClanTagNearViewport(x, y, radius) {
    const viewport = getClanTagOverlayViewport();
    const margin = Math.max(80, Math.min(260, (Number(radius) || 0) + 80));
    return x + margin >= 0
      && y + margin >= 0
      && x - margin <= viewport.width
      && y - margin <= viewport.height;
  }

  function ensureClanTagOverlay() {
    const cachedCanvas = clanOverlay.targetCanvas;
    const now = Date.now();
    const useCachedCanvas = cachedCanvas
      && now - clanOverlay.targetCanvasCheckedAt < CLAN_TAG_TARGET_REFRESH_MS
      && cachedCanvas.isConnected !== false
      && !shouldIgnoreCanvasForClanOverlay(cachedCanvas);
    const canvas = useCachedCanvas ? cachedCanvas : findClanTagTargetCanvas(now);
    if (!canvas) {
      return false;
    }

    const doc = win.document || globalThis.document;
    if (!clanOverlay.overlay?.parentNode) {
      const overlay = doc?.createElement?.('canvas');
      if (!overlay) {
        return false;
      }
      overlay.classList?.add?.(CLAN_TAG_OVERLAY_CLASS);
      overlay.setAttribute?.('aria-hidden', 'true');
      (doc.body || doc.documentElement)?.appendChild?.(overlay);
      clanOverlay.overlay = overlay;
    }

    if (!clanOverlay.context && clanOverlay.overlay) {
      clanOverlay.context = clanOverlay.overlay.getContext?.('2d') || null;
    }

    if (!clanOverlay.context) {
      return false;
    }

    alignClanTagOverlay(canvas);
    return true;
  }

  function cleanupStaleClanTagOverlayCanvases() {
    const doc = win.document || globalThis.document;
    const overlays = Array.from(doc?.querySelectorAll?.('canvas') || [])
      .filter((canvas) => canvas !== clanOverlay.overlay && canvasHasClass(canvas, CLAN_TAG_OVERLAY_CLASS));
    let removed = 0;

    for (const overlay of overlays) {
      try {
        if (typeof overlay.remove === 'function') {
          overlay.remove();
          removed += 1;
          continue;
        }
        if (overlay.parentNode && typeof overlay.parentNode.removeChild === 'function') {
          overlay.parentNode.removeChild(overlay);
          removed += 1;
        }
      } catch (error) {
        rememberError(`Cell clan tag stale overlay cleanup failed: ${getErrorMessage(error)}`);
      }
    }

    state.counters.clanOverlayCleanups += removed;
    return removed;
  }

  function findClanTagTargetCanvas(checkedAt = Date.now()) {
    const doc = win.document || globalThis.document;
    const canvases = Array.from(doc?.querySelectorAll?.('canvas') || []);
    let best = null;
    let bestArea = 0;
    let fallback = null;
    let fallbackArea = 0;

    for (const canvas of canvases) {
      if (shouldIgnoreCanvasForClanOverlay(canvas)) {
        continue;
      }
      const rect = canvas.getBoundingClientRect?.();
      const area = Math.max(0, Number(rect?.width) || 0) * Math.max(0, Number(rect?.height) || 0);
      if (area <= 0) {
        continue;
      }
      if (canvasHasClass(canvas, GAME_CANVAS_CLASS) && area > bestArea) {
        best = canvas;
        bestArea = area;
      }
      if (area > fallbackArea) {
        fallback = canvas;
        fallbackArea = area;
      }
    }

    clanOverlay.targetCanvas = best || fallback;
    clanOverlay.targetCanvasCheckedAt = checkedAt;
    return clanOverlay.targetCanvas;
  }

  function shouldIgnoreCanvasForClanOverlay(canvas) {
    if (!canvas || canvas === clanOverlay.overlay || String(canvas.tagName || '').toUpperCase() !== 'CANVAS') {
      return true;
    }
    if (canvas.id === 'pie-chart') {
      return true;
    }
    for (const className of IGNORED_CANVAS_CLASSES) {
      if (canvasHasClass(canvas, className)) {
        return true;
      }
    }
    const rect = canvas.getBoundingClientRect?.();
    const width = Math.max(0, Number(rect?.width) || Number(canvas.clientWidth) || 0);
    const height = Math.max(0, Number(rect?.height) || Number(canvas.clientHeight) || 0);
    return width < 20 || height < 20;
  }

  function canvasHasClass(canvas, className) {
    return Boolean(canvas?.classList?.contains?.(className)
      || String(canvas?.className || '').split(/\s+/).includes(className));
  }

  function alignClanTagOverlay(canvas) {
    const rect = canvas.getBoundingClientRect?.();
    if (!rect || !clanOverlay.overlay || !clanOverlay.context) {
      return;
    }

    const dpr = Math.max(1, Number(win.devicePixelRatio) || 1);
    const cssWidth = Math.max(1, Math.round(Number(rect.width) || Number(canvas.clientWidth) || 1));
    const cssHeight = Math.max(1, Math.round(Number(rect.height) || Number(canvas.clientHeight) || 1));
    const width = Math.round(cssWidth * dpr);
    const height = Math.round(cssHeight * dpr);

    if (clanOverlay.overlay.width !== width || clanOverlay.overlay.height !== height) {
      clanOverlay.overlay.width = width;
      clanOverlay.overlay.height = height;
      clanOverlay.context.setTransform?.(dpr, 0, 0, dpr, 0, 0);
      clanOverlay.hasVisibleContent = false;
    }

    clanOverlay.overlay.style.left = `${Math.round(Number(rect.left) || 0)}px`;
    clanOverlay.overlay.style.top = `${Math.round(Number(rect.top) || 0)}px`;
    clanOverlay.overlay.style.width = `${cssWidth}px`;
    clanOverlay.overlay.style.height = `${cssHeight}px`;
  }

  function installClanTagOverlayStyle() {
    const doc = win.document || globalThis.document;
    if (!doc) {
      return;
    }

    const styleText = [
      `.${CLAN_TAG_OVERLAY_CLASS}{position:fixed;left:0;top:0;z-index:60;pointer-events:none}`,
      '#chat,#leader-board-wrapper,.blobio-chat-settings-root,.blobio-menu-feature-root{position:relative;z-index:120}',
      '#mouseMenu{z-index:120}',
    ].join('\n');
    let style = doc.getElementById?.(CLAN_TAG_OVERLAY_STYLE_ID);
    if (style) {
      style.textContent = styleText;
      return;
    }

    style = doc.createElement?.('style');
    if (!style) {
      return;
    }
    style.id = CLAN_TAG_OVERLAY_STYLE_ID;
    style.textContent = styleText;
    (doc.head || doc.documentElement)?.appendChild?.(style);
  }

  function parseCssPixels(value) {
    const number = Number.parseFloat(String(value || ''));
    return Number.isFinite(number) ? number : 0;
  }

  function shouldRenderClanForCell(uid, cellId, mass, renderSize) {
    const now = Date.now();
    sweepClanCellCache(now);

    const key = normalizeUid(uid);
    const id = String(cellId ?? '');
    if (!key || !id) {
      return true;
    }

    const metric = getClanCellMetric(mass, renderSize);
    const current = clanCellCache.get(key);
    if (!current || now - current.lastSeen > CLAN_PRIMARY_CELL_TTL_MS) {
      clanCellCache.set(key, { cellId: id, metric, lastSeen: now });
      return true;
    }

    if (current.cellId === id) {
      current.metric = metric;
      current.lastSeen = now;
      return true;
    }

    if (metric > current.metric + CLAN_TAG_CELL_EPSILON) {
      clanCellCache.set(key, { cellId: id, metric, lastSeen: now });
      return true;
    }

    if (Math.abs(metric - current.metric) <= CLAN_TAG_CELL_EPSILON) {
      return true;
    }

    return false;
  }

  function getClanCellMetric(mass, renderSize) {
    return Math.max(0, Number(mass) || 0, Math.pow(Number(renderSize) || 0, 2) / 100);
  }

  function sweepClanCellCache(now) {
    if (now - lastClanCellSweep < 2000 || clanCellCache.size < 8) {
      return;
    }

    lastClanCellSweep = now;
    for (const [uid, entry] of clanCellCache) {
      if (now - entry.lastSeen > 10000) {
        clanCellCache.delete(uid);
      }
    }
  }

  function resolveCellUid(playerId, name) {
    refreshPlayerUidMapIfNeeded();

    const normalizedPlayerId = normalizeUid(playerId);
    if (normalizedPlayerId) {
      const mappedUid = playerUidState.playerIdToUid.get(normalizedPlayerId);
      if (mappedUid) {
        if (!clanTagState.members.has(mappedUid)) {
          return mappedUid;
        }
        state.counters.clanResolvedByPlayerId += 1;
        rememberPlayerUidMatch('player-id-map', mappedUid, playerId, name);
        return mappedUid;
      }
    }

    const directUid = normalizedPlayerId;
    if (directUid && clanTagState.members.has(directUid)) {
      state.counters.clanResolvedByDirectUid += 1;
      rememberPlayerUidMatch('direct', directUid, playerId, name);
      return directUid;
    }

    return '';
  }

  function rememberPlayerUidMatch(source, uid, playerId, name) {
    const safePlayerId = String(playerId ?? '');
    const safeName = String(name || '').slice(0, 32);
    const previous = playerUidState.lastMatch;
    if (
      previous
      && previous.source === source
      && previous.uid === uid
      && previous.playerId === safePlayerId
      && previous.name === safeName
    ) {
      state.counters.clanLastMatchDiagnosticCalls += 1;
      if (state.counters.clanLastMatchDiagnosticCalls % CLAN_DEBUG_SAMPLE_INTERVAL !== 1) {
        state.counters.clanLastMatchSkips += 1;
        return;
      }
    }

    state.counters.clanLastMatchSamples += 1;
    playerUidState.lastMatch = {
      at: Date.now(),
      source,
      uid,
      playerId: safePlayerId,
      name: safeName,
    };
    state.playerUidMap = describePlayerUidState();
  }

  function rememberSeenClanPlayerId(playerId, name, cellId) {
    const id = normalizeUid(playerId);
    if (!id) {
      return;
    }

    let entry = seenClanPlayerIds.get(id);
    if (entry) {
      entry.hookCalls += 1;
      if (entry.hookCalls % CLAN_DEBUG_SAMPLE_INTERVAL !== 1) {
        state.counters.clanSeenDetailSkips += 1;
        return;
      }
    } else {
      const now = Date.now();
      entry = {
        playerId: id,
        name: '',
        cellId: '',
        uid: '',
        hookCalls: 1,
        firstSeen: now,
        lastSeen: now,
        lastReason: 'seen',
      };
      seenClanPlayerIds.set(id, entry);
    }

    entry.name = String(name || '').slice(0, 32);
    entry.cellId = String(cellId ?? '');
    if (entry.hookCalls > 1) {
      entry.lastSeen = Date.now();
    }
    state.counters.clanSeenDetailSamples += 1;

    while (seenClanPlayerIds.size > 24) {
      const first = seenClanPlayerIds.keys().next().value;
      seenClanPlayerIds.delete(first);
    }
  }

  function updateSeenClanPlayerUid(playerId, uid, reason) {
    const id = normalizeUid(playerId);
    if (!id || !seenClanPlayerIds.has(id)) {
      return;
    }

    const entry = seenClanPlayerIds.get(id);
    const nextUid = normalizeUid(uid);
    const nextReason = reason || entry.lastReason;
    if (
      entry.uid === nextUid
      && entry.lastReason === nextReason
      && entry.hookCalls % CLAN_DEBUG_SAMPLE_INTERVAL !== 1
    ) {
      return;
    }

    entry.uid = nextUid;
    entry.lastReason = nextReason;
    entry.lastSeen = Date.now();
  }

  function refreshPlayerUidMapIfNeeded(force = false) {
    const now = Date.now();
    if (!force && now - playerUidState.refreshedAt < PLAYER_UID_MAP_REFRESH_MS) {
      return false;
    }

    playerUidState.refreshedAt = now;
    playerUidState.refreshes += 1;

    try {
      playerUidState.lastError = '';
    } catch (error) {
      playerUidState.lastError = getErrorMessage(error);
      rememberError(`Cell clan tag player UID map failed: ${playerUidState.lastError}`);
    }

    state.counters.clanUidMapRefreshes += 1;
    state.playerUidMap = describePlayerUidState();
    return true;
  }

  function adoptClanUidSocketBridge() {
    const bridge = win.__blobioClanUidSocketBridge || globalThis.__blobioClanUidSocketBridge;
    if (!bridge || typeof bridge !== 'object') {
      return false;
    }

    socketBridge = bridge;
    playerUidState.socketBridgeInstalled = Boolean(bridge.installed || typeof bridge.sendUidLookup === 'function');
    const debug = readSocketBridgeDebug();
    if (debug?.socketFound || bridge.socketFound) {
      playerUidState.socketFound = true;
      playerUidState.lastSocketSource = debug?.lastSource || bridge.lastSource || 'loader-bridge';
    }
    state.playerUidMap = describePlayerUidState();
    return playerUidState.socketBridgeInstalled;
  }

  function readSocketBridgeDebug() {
    if (!socketBridge) {
      return null;
    }

    try {
      if (typeof socketBridge.getDebug === 'function') {
        return socketBridge.getDebug();
      }
    } catch (error) {
      playerUidState.lastError = getErrorMessage(error);
    }

    return {
      installed: Boolean(socketBridge.installed),
      socketFound: Boolean(socketBridge.socketFound),
      lastSource: socketBridge.lastSource || '',
    };
  }

  function installPlayerUidSocketProbe() {
    const installedCtor = win.WebSocket;
    const WebSocketCtor = installedCtor?.__blobioClanUidSocketOriginal || installedCtor;
    const proto = WebSocketCtor?.prototype || installedCtor?.prototype;
    if (!proto || typeof proto.send !== 'function') {
      playerUidState.socketHookInstalled = false;
      playerUidState.lastError = 'WebSocket send hook unavailable';
      state.playerUidMap = describePlayerUidState();
      return false;
    }

    if (proto.send.__blobioClanUidSocketPatchVersion === SCRIPT_VERSION) {
      playerUidState.socketHookInstalled = true;
      originalSocketSend = proto.send.__blobioClanUidSocketOriginal || originalSocketSend;
      installPlayerUidSocketConstructor(WebSocketCtor, installedCtor);
      state.playerUidMap = describePlayerUidState();
      return true;
    }

    const previousSend = proto.send.__blobioClanUidSocketOriginal || proto.send;
    originalSocketSend = previousSend;
    const wrapped = function blobioClanUidSocketSend(data) {
      rememberActiveGameSocket(this, 'socket-send');
      const result = previousSend.apply(this, arguments);
      const manualPlayerId = readUidLookupRequestPlayerId(data);
      if (manualPlayerId) {
        rememberUidResponseOrigin('manual', manualPlayerId);
      }
      return result;
    };

    wrapped.__blobioClanUidSocketPatchVersion = SCRIPT_VERSION;
    wrapped.__blobioClanUidSocketOriginal = previousSend;
    proto.send = wrapped;
    playerUidState.socketHookInstalled = true;
    installPlayerUidSocketConstructor(WebSocketCtor, installedCtor);
    state.playerUidMap = describePlayerUidState();
    return true;
  }

  function installPlayerUidSocketConstructor(WebSocketCtor, installedCtor) {
    if (typeof WebSocketCtor !== 'function') {
      return false;
    }

    if (installedCtor?.__blobioClanUidSocketCtorPatchVersion === SCRIPT_VERSION) {
      playerUidState.socketConstructorHookInstalled = true;
      return true;
    }

    try {
      const WrappedWebSocket = function BlobioTrackedWebSocket(...args) {
        const socket = new WebSocketCtor(...args);
        rememberActiveGameSocket(socket, 'socket-constructor');
        return socket;
      };

      WrappedWebSocket.prototype = WebSocketCtor.prototype;
      Object.setPrototypeOf?.(WrappedWebSocket, WebSocketCtor);
      WrappedWebSocket.__blobioClanUidSocketOriginal = WebSocketCtor;
      WrappedWebSocket.__blobioClanUidSocketCtorPatchVersion = SCRIPT_VERSION;
      win.WebSocket = WrappedWebSocket;
      playerUidState.socketConstructorHookInstalled = true;
      return true;
    } catch (error) {
      playerUidState.socketConstructorHookInstalled = false;
      playerUidState.lastError = getErrorMessage(error);
      rememberError(`Cell clan tag WebSocket constructor hook failed: ${playerUidState.lastError}`);
      return false;
    }
  }

  function installHudSocketCallbackProbeWithRetry() {
    if (installHudSocketCallbackProbe()) {
      return true;
    }

    if (typeof win.setInterval !== 'function') {
      return false;
    }

    const timer = win.setInterval(() => {
      if (installHudSocketCallbackProbe()) {
        win.clearInterval?.(timer);
      }
    }, HUD_SOCKET_HOOK_RETRY_MS);
    win.setTimeout?.(() => win.clearInterval?.(timer), HUD_SOCKET_HOOK_TIMEOUT_MS);
    return false;
  }

  function installHudSocketCallbackProbe() {
    const created = wrapHudSocketCallback('__BlobioHudInfoSocketCreated', 'hud-created');
    const sent = wrapHudSocketCallback('__BlobioHudInfoSocketSend', 'hud-send');
    const message = wrapHudSocketCallback('__BlobioHudInfoSocketMessage', 'hud-message');
    playerUidState.socketCallbackHookInstalled = created || sent || message;
    state.playerUidMap = describePlayerUidState();
    return playerUidState.socketCallbackHookInstalled;
  }

  function wrapHudSocketCallback(key, source) {
    const original = win[key];
    if (typeof original !== 'function') {
      return false;
    }

    if (original.__blobioCellClanUidSocketCallbackVersion === SCRIPT_VERSION) {
      return true;
    }

    const previous = original.__blobioCellClanUidSocketCallbackOriginal || original;
    const wrapped = function blobioCellClanUidSocketCallback(socket, event) {
      rememberActiveGameSocket(socket, source);
      if (source === 'hud-message' && consumeSocketUidResponseEvent(event)) {
        return true;
      }
      return previous.apply(this, arguments);
    };
    wrapped.__blobioCellClanUidSocketCallbackVersion = SCRIPT_VERSION;
    wrapped.__blobioCellClanUidSocketCallbackOriginal = previous;
    win[key] = wrapped;
    return true;
  }

  function rememberActiveGameSocket(socket, source = 'socket-hook') {
    if (!socket || typeof socket !== 'object') {
      return;
    }

    const changed = activeGameSocket !== socket || !playerUidState.socketFound;
    activeGameSocket = socket;
    playerUidState.socketFound = true;
    playerUidState.lastSocketSource = source;
    installSocketSendUidHook(socket);
    installSocketMessageUidResponseHook(socket);
    if (changed) {
      state.playerUidMap = describePlayerUidState();
    }
    flushUidLookupQueue(Date.now());
  }

  function installSocketSendUidHook(socket) {
    if (typeof socket.send !== 'function' || socket.send.__blobioClanUidSocketPatchVersion === SCRIPT_VERSION) {
      return;
    }
    // The game creates its socket in an iframe, outside the page's WebSocket prototype.
    const previous = socket.send.__blobioClanUidSocketOriginal || socket.send;
    const wrapped = function blobioClanUidGameSocketSend(data) {
      const result = previous.apply(this, arguments);
      const playerId = readUidLookupRequestPlayerId(data);
      if (playerId) {
        rememberUidResponseOrigin('manual', playerId);
      }
      return result;
    };
    wrapped.__blobioClanUidSocketPatchVersion = SCRIPT_VERSION;
    wrapped.__blobioClanUidSocketOriginal = previous;
    socket.send = wrapped;
  }

  function queuePlayerUidLookup(playerId, playerName) {
    const normalizedPlayerId = normalizeUid(playerId);
    const numericPlayerId = Number(normalizedPlayerId);
    if (!normalizedPlayerId || !Number.isInteger(numericPlayerId) || numericPlayerId < 1 || numericPlayerId > 65535) {
      return false;
    }

    const now = Date.now();
    const mappedUid = playerUidState.playerIdToUid.get(normalizedPlayerId);
    if (mappedUid && clanTagState.members.has(mappedUid)) {
      return false;
    }

    expireUidLookupState(now);
    if (
      queuedUidLookups.has(normalizedPlayerId)
      || pendingUidLookups.has(normalizedPlayerId)
      || now - (uidLookupCooldowns.get(normalizedPlayerId) || 0) < UID_LOOKUP_COOLDOWN_MS
    ) {
      return false;
    }

    if (uidLookupQueue.length >= UID_LOOKUP_MAX_QUEUE) {
      const dropped = uidLookupQueue.shift();
      if (dropped) {
        queuedUidLookups.delete(dropped);
        state.counters.clanUidLookupQueueDrops += 1;
      }
    }

    queuedUidLookups.set(normalizedPlayerId, {
      playerId: normalizedPlayerId,
      name: String(playerName || '').slice(0, 32),
      queuedAt: now,
    });
    uidLookupQueue.push(normalizedPlayerId);
    state.counters.clanUidLookupQueued += 1;
    flushUidLookupQueue(now);
    return true;
  }

  function flushUidLookupQueue(now = Date.now()) {
    if (!uidLookupQueue.length || now < nextUidLookupAt) {
      return false;
    }
    if (pendingUidLookups.size > 0) {
      return false;
    }

    if (!hasLocalUidLookupSocket() && !hasBridgeUidLookupSocket()) {
      state.counters.clanUidLookupSkippedSocket += 1;
      return false;
    }

    while (uidLookupQueue.length) {
      const playerId = uidLookupQueue.shift();
      const entry = queuedUidLookups.get(playerId);
      queuedUidLookups.delete(playerId);
      if (!entry || pendingUidLookups.has(playerId)) {
        continue;
      }

      const numericPlayerId = Number(playerId);
      const payload = new Uint8Array(3);
      payload[0] = UID_LOOKUP_PACKET;
      payload[1] = numericPlayerId & 255;
      payload[2] = (numericPlayerId >> 8) & 255;

      if (sendUidLookupFrame(playerId, payload)) {
        pendingUidLookups.set(playerId, {
          ...entry,
          sentAt: now,
        });
        uidLookupCooldowns.set(playerId, now);
        nextUidLookupAt = now + UID_LOOKUP_MIN_INTERVAL_MS;
        state.counters.clanUidLookupSent += 1;
        state.playerUidMap = describePlayerUidState();
        return true;
      }

      queuedUidLookups.set(playerId, entry);
      uidLookupQueue.unshift(playerId);
      state.counters.clanUidLookupSkippedSocket += 1;
      state.playerUidMap = describePlayerUidState();
      return false;
    }

    return false;
  }

  function hasLocalUidLookupSocket() {
    return Boolean(activeGameSocket && isSocketOpen(activeGameSocket) && typeof originalSocketSend === 'function');
  }

  function hasBridgeUidLookupSocket() {
    if (!socketBridge) {
      adoptClanUidSocketBridge();
    }
    if (!socketBridge || typeof socketBridge.sendUidLookup !== 'function') {
      return false;
    }

    const debug = readSocketBridgeDebug();
    return Boolean(debug?.socketFound || socketBridge.socketFound);
  }

  function sendUidLookupFrame(playerId, payload) {
    if (hasLocalUidLookupSocket()) {
      try {
        originalSocketSend.call(activeGameSocket, payload.buffer);
        rememberUidResponseOrigin('auto', playerId);
        state.counters.clanUidLookupSentBySocket += 1;
        return true;
      } catch (error) {
        activeGameSocket = null;
        playerUidState.socketFound = false;
        playerUidState.lastError = getErrorMessage(error);
        rememberError(`Cell clan tag UID lookup failed: ${playerUidState.lastError}`);
      }
    }

    if (!socketBridge) {
      adoptClanUidSocketBridge();
    }
    if (socketBridge && typeof socketBridge.sendUidLookup === 'function') {
      try {
        if (socketBridge.sendUidLookup(playerId) === true) {
          rememberUidResponseOrigin('auto', playerId);
          const debug = readSocketBridgeDebug();
          playerUidState.socketFound = true;
          playerUidState.lastSocketSource = debug?.lastSource || socketBridge.lastSource || 'loader-bridge';
          state.counters.clanUidLookupSentByBridge += 1;
          return true;
        }
      } catch (error) {
        playerUidState.lastError = getErrorMessage(error);
        rememberError(`Cell clan tag bridge UID lookup failed: ${playerUidState.lastError}`);
      }
    }

    return false;
  }

  function expireUidLookupState(now) {
    for (const [playerId, entry] of pendingUidLookups) {
      if (now - entry.sentAt > UID_LOOKUP_RESPONSE_TIMEOUT_MS) {
        pendingUidLookups.delete(playerId);
        uidLookupCooldowns.delete(playerId);
        removeUidResponseOrigin('auto', playerId);
      }
    }

    for (let index = uidResponseOrigins.length - 1; index >= 0; index -= 1) {
      if (now - uidResponseOrigins[index].sentAt > UID_LOOKUP_RESPONSE_TIMEOUT_MS) {
        uidResponseOrigins.splice(index, 1);
      }
    }

    if (uidLookupCooldowns.size > UID_LOOKUP_MAX_QUEUE * 2) {
      for (const [playerId, sentAt] of uidLookupCooldowns) {
        if (now - sentAt > UID_LOOKUP_COOLDOWN_MS * 2) {
          uidLookupCooldowns.delete(playerId);
        }
      }
    }
  }

  function handleSocketUidResponse(accountId) {
    expireUidLookupState(Date.now());
    const uid = normalizeUid(accountId);

    const origin = uidResponseOrigins[0];
    if (origin?.type === 'manual') {
      return false;
    }

    let playerId = '';
    let entry = null;
    if (origin?.type === 'auto') {
      uidResponseOrigins.shift();
      playerId = origin.playerId;
      entry = pendingUidLookups.get(playerId) || null;
      if (!entry) {
        state.counters.clanUidLookupSuppressedMenus += 1;
        return true;
      }
    } else {
      const pending = pendingUidLookups.entries().next();
      if (pending.done) {
        return false;
      }
      [playerId, entry] = pending.value;
    }

    pendingUidLookups.delete(playerId);
    state.counters.clanUidLookupResponseHooks += 1;
    if (rememberPlayerUid(uid, playerId, entry.name, 'socket-response-hook')) {
      state.counters.clanUidLookupResponses += 1;
    }
    state.counters.clanUidLookupSuppressedMenus += 1;
    state.playerUidMap = describePlayerUidState();
    flushUidLookupQueue(Date.now());
    return true;
  }

  function rememberUidResponseOrigin(type, playerId) {
    const normalizedPlayerId = normalizeUid(playerId);
    if (!normalizedPlayerId || (type !== 'auto' && type !== 'manual')) {
      return false;
    }

    uidResponseOrigins.push({
      type,
      playerId: normalizedPlayerId,
      sentAt: Date.now(),
    });
    if (uidResponseOrigins.length > UID_LOOKUP_MAX_QUEUE * 2) {
      uidResponseOrigins.shift();
    }
    if (type === 'manual') {
      state.counters.clanUidLookupManualRequests += 1;
    }
    return true;
  }

  function consumeManualUidResponseOrigin() {
    const origin = uidResponseOrigins[0];
    if (origin?.type !== 'manual') {
      return null;
    }

    uidResponseOrigins.shift();
    state.counters.clanUidLookupManualResponses += 1;
    return origin;
  }

  function removeUidResponseOrigin(type, playerId) {
    const normalizedPlayerId = normalizeUid(playerId);
    const index = uidResponseOrigins.findIndex((origin) => (
      origin.type === type && origin.playerId === normalizedPlayerId
    ));
    if (index < 0) {
      return false;
    }
    uidResponseOrigins.splice(index, 1);
    return true;
  }

  function readUidLookupRequestPlayerId(data) {
    const bytes = toSocketMessageBytes(data);
    if (!bytes || bytes.byteLength < 3 || (bytes[0] & 255) !== UID_LOOKUP_PACKET) {
      return '';
    }
    return normalizeUid((bytes[1] & 255) | ((bytes[2] & 255) << 8));
  }

  function debugQueuePlayerUidLookup(playerId, playerName = '') {
    const queued = queuePlayerUidLookup(playerId, playerName);
    const report = clanDebugReport();
    report.manualLookup = {
      playerId: String(playerId ?? ''),
      name: String(playerName || '').slice(0, 32),
      queued,
    };
    try {
      win.console?.log?.('[Blobio Clan] manual UID lookup', report.manualLookup, report);
    } catch {}
    return report;
  }

  function installSocketMessageUidResponseHook(socket) {
    if (!socket || typeof socket !== 'object') {
      return false;
    }

    let installed = wrapSocketOnMessage(socket);
    if (typeof socket.addEventListener === 'function' && !messageHookedSockets.has(socket)) {
      try {
        socket.addEventListener('message', handleSocketMessageEvent, true);
        messageHookedSockets.add(socket);
        installed = true;
      } catch (error) {
        playerUidState.lastError = getErrorMessage(error);
        rememberError(`Cell clan tag socket message hook failed: ${playerUidState.lastError}`);
      }
    }

    if (installed) {
      playerUidState.socketMessageHookInstalled = true;
      state.playerUidMap = describePlayerUidState();
    }
    return installed;
  }

  function wrapSocketOnMessage(socket) {
    const original = socket.onmessage;
    if (typeof original !== 'function') {
      return false;
    }

    if (original.__blobioCellClanUidMessageVersion === SCRIPT_VERSION) {
      return true;
    }

    const previous = original.__blobioCellClanUidMessageOriginal || original;
    const wrapped = function blobioCellClanUidSocketMessage(event) {
      if (consumeSocketUidResponseEvent(event)) {
        return undefined;
      }
      return previous.apply(this, arguments);
    };

    wrapped.__blobioCellClanUidMessageVersion = SCRIPT_VERSION;
    wrapped.__blobioCellClanUidMessageOriginal = previous;
    try {
      socket.onmessage = wrapped;
      return true;
    } catch (error) {
      playerUidState.lastError = getErrorMessage(error);
      rememberError(`Cell clan tag socket onmessage hook failed: ${playerUidState.lastError}`);
      return false;
    }
  }

  function handleSocketMessageEvent(event) {
    consumeSocketUidResponseEvent(event);
  }

  function consumeSocketUidResponseEvent(event) {
    const uid = readUidLookupResponseMessage(event?.data);
    if (!uid || !handleSocketUidResponse(uid)) {
      return false;
    }

    state.counters.clanUidLookupMessageResponses += 1;
    try {
      event.stopImmediatePropagation?.();
      event.preventDefault?.();
    } catch {}
    return true;
  }

  function readUidLookupResponseMessage(data) {
    const bytes = toSocketMessageBytes(data);
    if (!bytes || bytes.byteLength < 5 || (bytes[0] & 255) !== UID_LOOKUP_PACKET) {
      return '';
    }

    try {
      const view = new DataView(bytes.buffer, bytes.byteOffset + 1, 4);
      // UID zero is a completed lookup for an account-less cell, not a missing reply.
      return String(view.getInt32(0, true));
    } catch {
      return '';
    }
  }

  function toSocketMessageBytes(data) {
    if (!data) {
      return null;
    }

    if (
      (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer)
      || (typeof win.ArrayBuffer === 'function' && data instanceof win.ArrayBuffer)
      || Object.prototype.toString.call(data) === '[object ArrayBuffer]'
    ) {
      return new Uint8Array(data);
    }

    if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' && ArrayBuffer.isView(data)) {
      return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }

    if (Array.isArray(data)) {
      return Uint8Array.from(data);
    }

    return null;
  }

  function isSocketOpen(socket) {
    const openValue = Number(win.WebSocket?.OPEN ?? 1);
    return Number(socket?.readyState) === openValue;
  }

  function collectMouseMenuUidRow(next) {
    const doc = win.document || globalThis.document;
    const playerName = doc?.querySelector?.('#mouseMenu #playerName[uid], #playerName[uid]');
    const uid = normalizeUid(playerName?.getAttribute?.('uid'));
    if (!uid) {
      return;
    }

    rememberPlayerNameUid(next, playerName.getAttribute?.('title') || playerName.textContent, uid, 'mouse-menu-dom');
  }

  function collectLeaderboardUidRows(next) {
    const doc = win.document || globalThis.document;
    const rows = Array.from(doc?.querySelectorAll?.('#leader-board li[uid]') || [])
      .slice(0, PLAYER_UID_MAP_MAX_ROWS);

    for (const row of rows) {
      const uid = normalizeUid(row.getAttribute?.('uid'));
      if (!uid) {
        continue;
      }

      rememberPlayerNameUid(next, stripLeaderboardRank(row.textContent), uid, 'leaderboard');
    }
  }

  function collectChatUidRows(next) {
    const doc = win.document || globalThis.document;
    const rows = Array.from(doc?.querySelectorAll?.('#chat li[uid]') || [])
      .slice(-PLAYER_UID_MAP_MAX_ROWS);

    for (const row of rows) {
      const uid = normalizeUid(row.getAttribute?.('uid'));
      if (!uid) {
        continue;
      }

      rememberPlayerNameUid(next, readChatPlayerName(row), uid, 'chat');
    }
  }

  function installContextMenuUidHook() {
    if (wrapContextMenuUidHook()) {
      return true;
    }

    if (typeof win.setInterval !== 'function') {
      return false;
    }

    const timer = win.setInterval(() => {
      if (wrapContextMenuUidHook()) {
        win.clearInterval?.(timer);
      }
    }, CONTEXT_MENU_UID_HOOK_RETRY_MS);

    win.setTimeout?.(() => win.clearInterval?.(timer), CONTEXT_MENU_UID_HOOK_TIMEOUT_MS);
    return false;
  }

  function wrapContextMenuUidHook() {
    const installed = win.showCellContextMenu;
    if (typeof installed !== 'function') {
      playerUidState.contextMenuHookInstalled = false;
      state.playerUidMap = describePlayerUidState();
      return false;
    }

    if (installed.__blobioCellClanUidHookVersion === SCRIPT_VERSION) {
      playerUidState.contextMenuHookInstalled = true;
      state.playerUidMap = describePlayerUidState();
      return true;
    }

    const original = installed.__blobioCellClanUidHookOriginal || installed;

    const wrapped = function blobioShowCellContextMenu(accountId, playerId, playerName) {
      state.counters.clanContextMenuHookCalls += 1;
      playerUidState.contextMenuHookCalls += 1;
      const manualOrigin = consumeManualUidResponseOrigin();
      const rememberedPlayerId = manualOrigin?.playerId || playerId;
      const rememberedPlayerName = manualOrigin && manualOrigin.playerId !== normalizeUid(playerId)
        ? seenClanPlayerIds.get(manualOrigin.playerId)?.name || ''
        : playerName;
      rememberPlayerUid(accountId, rememberedPlayerId, rememberedPlayerName, 'mouse-menu-callback');
      return original.apply(this, arguments);
    };

    wrapped.__blobioCellClanUidHookVersion = SCRIPT_VERSION;
    wrapped.__blobioCellClanUidHookOriginal = original;
    win.showCellContextMenu = wrapped;
    playerUidState.contextMenuHookInstalled = true;
    state.playerUidMap = describePlayerUidState();
    return true;
  }

  function rememberPlayerUid(accountId, playerId, playerName, source) {
    const uid = normalizeUid(accountId);
    if (!uid) {
      return false;
    }

    const normalizedPlayerId = normalizeUid(playerId);
    if (normalizedPlayerId) {
      playerUidState.playerIdToUid.set(normalizedPlayerId, uid);
      playerUidState.playerIdSources.set(normalizedPlayerId, source);
    }

    rememberPlayerNameUid(playerUidState, playerName, uid, source);
    playerUidState.lastContextMenu = {
      at: Date.now(),
      source,
      uid,
      playerId: String(playerId ?? ''),
      name: String(playerName || '').slice(0, 32),
    };
    state.playerUidMap = describePlayerUidState();
    return true;
  }

  function rememberPlayerNameUid(next, name, uid, source) {
    const normalizedName = normalizePlayerName(name);
    if (!normalizedName || !uid || next.ambiguousNames.has(normalizedName)) {
      return;
    }

    const existing = next.nameToUid.get(normalizedName);
    if (existing && existing !== uid) {
      next.nameToUid.delete(normalizedName);
      next.ambiguousNames.add(normalizedName);
      return;
    }

    next.nameToUid.set(normalizedName, uid);
    next.sources.set(normalizedName, source);
  }

  function stripLeaderboardRank(value) {
    return String(value || '').replace(/^\s*\d+\.\s*/, '');
  }

  function readChatPlayerName(row) {
    const firstSpan = Array.from(row?.children || [])
      .find((child) => String(child?.tagName || '').toUpperCase() === 'SPAN');
    if (firstSpan) {
      return firstSpan.textContent;
    }

    const text = String(row?.textContent || '');
    const colonIndex = text.indexOf(':');
    return colonIndex >= 0 ? text.slice(0, colonIndex) : text;
  }

  function normalizePlayerName(value) {
    let name = String(value || '').replace(/\s+/g, ' ').trim();
    name = name.replace(/\s+\{[^{}]{1,48}\}\s*$/g, '').trim();
    name = name.replace(/(?:\s+\[(?:ADMIN|MD|VIP\+?|VIP)\]\s*)+$/gi, '').trim();
    return name.toLowerCase();
  }

  function readMassText(cellId, mass, now) {
    const key = String(cellId ?? `mass-${mass}`);
    const cached = labelCache.get(key);
    if (cached && settings.updateDelayMs > 0 && now - cached.updatedAt < settings.updateDelayMs) {
      cached.lastSeen = now;
      state.counters.cacheHits += 1;
      return { text: cached.text, cached: true };
    }
    if (settings.updateDelayMs > 0 && !canUpdateMassText(now)) {
      if (cached) {
        cached.lastSeen = now;
        state.counters.cacheHits += 1;
        return { text: cached.text, cached: true };
      }
      state.counters.cacheHits += 1;
      return { text: '', cached: true };
    }

    const text = formatMass(mass);
    labelCache.set(key, {
      text,
      updatedAt: now,
      lastSeen: now,
    });
    markMassTextUpdated(now);
    state.counters.labelUpdates += 1;
    return { text, cached: false };
  }

  function canUpdateMassText(now) {
    if (settings.updateDelayMs <= 0) {
      return true;
    }
    return nextMassUpdateAt <= 0 || now >= nextMassUpdateAt || now <= massBatchOpenUntil;
  }

  function markMassTextUpdated(now) {
    if (settings.updateDelayMs <= 0 || (nextMassUpdateAt > now && now <= massBatchOpenUntil)) {
      return;
    }
    nextMassUpdateAt = now + settings.updateDelayMs;
    massBatchOpenUntil = now + MASS_UPDATE_BATCH_WINDOW_MS;
  }

  function formatMass(value) {
    const mass = Math.max(0, Number(value) || 0);
    if (!settings.compact) {
      return String(Math.round(mass));
    }

    if (mass >= 1000000) {
      return `${trimNumber(mass / 1000000)}m`;
    }

    if (mass >= 1000) {
      return `${trimNumber(mass / 1000)}k`;
    }

    return String(Math.round(mass));
  }

  function trimNumber(value) {
    const rounded = Math.round(value * 10) / 10;
    return rounded % 1 === 0 ? String(rounded | 0) : rounded.toFixed(1);
  }

  function getAutoMinMass(totalMass) {
    const total = Number(totalMass) || 0;
    if (total > 15000) {
      return 500;
    }
    if (total >= 8000) {
      return 200;
    }
    if (total > 2000) {
      return 40;
    }
    return 0;
  }

  function getFitScale(text, name, nameScale, renderSize) {
    const textLength = Math.max(String(text || '').length, 3);
    const nameLength = Math.max(String(name || '').length, 3);
    const widestLength = Math.max(textLength, nameLength);
    const scale = Number(nameScale);

    if (Number.isFinite(scale) && scale > 0) {
      return scale * (nameLength / widestLength);
    }

    return Math.max(0.001, Number(renderSize) / (widestLength * 80));
  }

  function isPrimaryLabel(mass, largestSize, totalMass) {
    if (!settings.emphasizeBiggest) {
      return false;
    }

    const total = Number(totalMass) || 0;
    const share = total > 0 ? mass / total : 0;
    return share >= 0.18 || largestSize >= 80;
  }

  function readableScaleFloor(size) {
    if (size >= 520) {
      return 0.66;
    }
    if (size >= 360) {
      return 0.6;
    }
    if (size >= 250) {
      return 0.42;
    }
    if (size >= 150) {
      return 0.32;
    }
    if (size >= 95) {
      return 0.22;
    }
    return 0.18;
  }

  function secondaryReadableScaleFloor(mass, size, floor) {
    if (mass < 500 && size < 55) {
      return 0.001;
    }
    if (size >= 95 || mass >= 1500) {
      return floor * 0.9;
    }
    return floor * 0.78;
  }

  function cloneLabelResult(cellId, mass, result) {
    return {
      at: Date.now(),
      cellId: String(cellId ?? ''),
      mass: Math.round(mass * 10) / 10,
      text: result.text,
      scale: roundNumber(result.scale),
      offset: roundNumber(result.offset),
      primary: Boolean(result.primary),
      cached: Boolean(result.cached),
    };
  }

  function captureDrawState(cellId, label, nativeColor, x, y) {
    const native = cloneRendererColor(nativeColor);
    state.lastDrawCapture = {
      at: Date.now(),
      cellId: String(cellId ?? ''),
      text: typeof label?.text === 'string' ? label.text : '',
      scale: roundNumber(label?.scale),
      x: roundNumber(x),
      y: roundNumber(y),
      rendererMode: 'native-text-color',
      appliedColor: native,
      nativeColor: native,
    };
    return state.lastDrawCapture;
  }

  function captureSampledDrawState(cellId, label, nativeColor, x, y) {
    if (state.counters.labelsDrawn % MASS_DEBUG_SAMPLE_INTERVAL !== 1) {
      return state.lastDrawCapture;
    }
    return captureDrawState(cellId, label, nativeColor, x, y);
  }

  function captureClanTagDrawState(playerId, cellId, label, nativeColor, x, y) {
    const native = cloneRendererColor(nativeColor);
    state.lastClanDrawCapture = {
      at: Date.now(),
      uid: normalizeUid(label?.uid) || normalizeUid(playerId),
      cellId: String(cellId ?? ''),
      text: typeof label?.text === 'string' ? label.text : '',
      tag: typeof label?.tag === 'string' ? label.tag : '',
      scale: roundNumber(label?.scale),
      position: typeof label?.position === 'string' ? label.position : '',
      bold: Boolean(label?.bold),
      x: roundNumber(x),
      y: roundNumber(y),
      rendererMode: 'native-text-color',
      appliedColor: cloneRendererColor(label?.color) || native,
      nativeColor: native,
    };
    return state.lastClanDrawCapture;
  }

  function createEmptyClanTagState() {
    return {
      settings: {
        enabled: true,
        showCellTags: true,
      },
      members: new Map(),
      refreshedAt: 0,
      lastError: '',
    };
  }

  function createEmptyPlayerUidState() {
    return {
      playerIdToUid: new Map(),
      playerIdSources: new Map(),
      nameToUid: new Map(),
      sources: new Map(),
      ambiguousNames: new Set(),
      refreshedAt: 0,
      refreshes: 0,
      contextMenuHookInstalled: false,
      contextMenuHookCalls: 0,
      socketHookInstalled: false,
      socketConstructorHookInstalled: false,
      socketCallbackHookInstalled: false,
      socketMessageHookInstalled: false,
      socketBridgeInstalled: false,
      socketFound: false,
      lastSocketSource: '',
      lastContextMenu: null,
      lastMatch: null,
      lastError: '',
    };
  }

  function readClanTagState() {
    const next = createEmptyClanTagState();
    next.refreshedAt = Date.now();
    next.settings = {
      enabled: readRuntimeBoolean(CLAN_TEXT_KEYS.enabled, true),
      showCellTags: readRuntimeBoolean(CLAN_TEXT_KEYS.showCellTags, true),
    };

    try {
      next.members = parseClanMembers(readRuntimeValue(CLAN_CACHE_KEY));
    } catch (error) {
      next.lastError = getErrorMessage(error);
      rememberError(`Cell clan tag cache could not be read: ${next.lastError}`);
    }

    return next;
  }

  function describeClanTagState() {
    return {
      enabled: Boolean(clanTagState.settings.enabled),
      showCellTags: Boolean(clanTagState.settings.showCellTags),
      memberCount: clanTagState.members.size,
      refreshedAt: clanTagState.refreshedAt,
      lastError: clanTagState.lastError,
    };
  }

  function describePlayerUidState() {
    return {
      playerIdCount: playerUidState.playerIdToUid.size,
      nameCount: playerUidState.nameToUid.size,
      ambiguousNameCount: playerUidState.ambiguousNames.size,
      contextMenuHookInstalled: playerUidState.contextMenuHookInstalled,
      contextMenuHookCalls: playerUidState.contextMenuHookCalls,
      socketHookInstalled: playerUidState.socketHookInstalled,
      socketConstructorHookInstalled: playerUidState.socketConstructorHookInstalled,
      socketCallbackHookInstalled: playerUidState.socketCallbackHookInstalled,
      socketMessageHookInstalled: playerUidState.socketMessageHookInstalled,
      socketBridgeInstalled: playerUidState.socketBridgeInstalled,
      socketFound: playerUidState.socketFound,
      lastSocketSource: playerUidState.lastSocketSource,
      socketBridge: readSocketBridgeDebug(),
      queuedUidLookups: queuedUidLookups.size,
      pendingUidLookups: pendingUidLookups.size,
      pendingUidResponseOrigins: uidResponseOrigins.length,
      refreshedAt: playerUidState.refreshedAt,
      refreshes: playerUidState.refreshes,
      lastContextMenu: playerUidState.lastContextMenu,
      lastMatch: playerUidState.lastMatch,
      lastError: playerUidState.lastError,
    };
  }

  function parseClanMembers(value) {
    const members = new Map();
    if (!value) {
      return members;
    }

    const cached = JSON.parse(String(value));
    const data = cached?.data && typeof cached.data === 'object' ? cached.data : cached;
    const sourceMembers = data?.members;
    if (!sourceMembers || typeof sourceMembers !== 'object') {
      return members;
    }

    for (const [rawUid, entry] of Object.entries(sourceMembers)) {
      const uid = normalizeUid(rawUid);
      const tag = typeof entry === 'string'
        ? entry.trim()
        : String(entry?.tag || '').trim();
      if (uid && tag) {
        members.set(uid, { tag });
      }
    }

    return members;
  }

  function readRuntimeValue(key) {
    try {
      const bridge = win.__blobioSharedStorageBridge || globalThis.__blobioSharedStorageBridge;
      const value = bridge?.getItem?.(key);
      if (value !== null && value !== undefined) {
        return String(value);
      }
    } catch {}

    try {
      return win.localStorage?.getItem?.(key) ?? null;
    } catch {
      return null;
    }
  }

  function readRuntimeBoolean(key, fallback) {
    const value = readRuntimeValue(key);
    if (value === null || value === undefined || value === '') {
      return fallback;
    }
    return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
  }

  function normalizeUid(value) {
    const uid = String(value ?? '').replace(/\D/g, '');
    return uid && uid !== '0' ? uid : '';
  }

  function sweepLabelCache(now) {
    if (now - lastCacheSweep < 5000 || labelCache.size < 64) {
      return;
    }

    lastCacheSweep = now;
    for (const [cellId, entry] of labelCache) {
      if (now - entry.lastSeen > 30000) {
        labelCache.delete(cellId);
      }
    }
  }

  function installGameScriptPatch() {
    const wrapped = installGwtCallbackPatch();
    patchExistingCacheScripts();

    const NodeCtor = win.Node || globalThis.Node;
    if (!NodeCtor?.prototype) {
      if (!wrapped) {
        scheduleGwtCallbackPatchRetry();
      }
      return;
    }

    if (NodeCtor.prototype.__blobioCellMassScriptPatchVersion === SCRIPT_VERSION) {
      if (!wrapped) {
        scheduleGwtCallbackPatchRetry();
      }
      return;
    }

    const originalAppendChild = NodeCtor.prototype.appendChild;
    const originalInsertBefore = NodeCtor.prototype.insertBefore;

    NodeCtor.prototype.appendChild = function blobioCellMassAppendChild(node) {
      patchScriptNode(node);
      installGwtCallbackPatch();
      return originalAppendChild.call(this, node);
    };

    NodeCtor.prototype.insertBefore = function blobioCellMassInsertBefore(node, child) {
      patchScriptNode(node);
      installGwtCallbackPatch();
      return originalInsertBefore.call(this, node, child);
    };

    NodeCtor.prototype.__blobioCellMassScriptPatchInstalled = true;
    NodeCtor.prototype.__blobioCellMassScriptPatchVersion = SCRIPT_VERSION;
    if (!wrapped) {
      scheduleGwtCallbackPatchRetry();
    }
  }

  function scheduleGwtCallbackPatchRetry() {
    const timer = win.setInterval?.(() => {
      if (installGwtCallbackPatch()) {
        win.clearInterval?.(timer);
      }
    }, 10);
    if (timer !== undefined && timer !== null) {
      win.setTimeout?.(() => win.clearInterval?.(timer), 30000);
    }
  }

  function patchExistingCacheScripts() {
    const doc = win.document || globalThis.document;
    for (const script of doc?.querySelectorAll?.('script[src], script') || []) {
      patchScriptNode(script);
    }
  }

  function patchScriptNode(node) {
    if (!node || String(node.tagName || '').toLowerCase() !== 'script') {
      return false;
    }

    if (node.__blobioCellMassScriptPatchVersion === SCRIPT_VERSION) {
      return false;
    }

    const src = String(node.src || node.getAttribute?.('src') || '');
    if (src && !CACHE_SCRIPT_RE.test(src)) {
      return false;
    }

    node.__blobioCellMassScriptPatchVersion = SCRIPT_VERSION;
    if (node.dataset) {
      node.dataset.blobioCellMassScriptPatch = SCRIPT_VERSION;
    }
    if (src) {
      state.seenCacheScripts += 1;
    }

    if (typeof node.textContent !== 'string' || !node.textContent.includes('function ')) {
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
    if (!html || typeof html.onScriptDownloaded !== 'function') {
      return false;
    }

    if (html.__blobioCellMassCallbackWrappedVersion === SCRIPT_VERSION
      || html.onScriptDownloaded.__blobioCellMassCallbackWrappedVersion === SCRIPT_VERSION) {
      state.wrappedCallback = true;
      return true;
    }

    const original = html.onScriptDownloaded;
    html.onScriptDownloaded = function blobioCellMassOnScriptDownloaded(chunks) {
      let patchedChunks = chunks;
      try {
        patchedChunks = Array.isArray(chunks)
          ? chunks.map((chunk) => patchDownloadedChunk(chunk))
          : patchDownloadedChunk(chunks);
      } catch (error) {
        rememberError(`GWT patch failed: ${getErrorMessage(error)}`);
      }

      return original.call(this, patchedChunks);
    };

    html.__blobioCellMassCallbackWrapped = true;
    html.__blobioCellMassCallbackWrappedVersion = SCRIPT_VERSION;
    html.onScriptDownloaded.__blobioCellMassCallbackWrappedVersion = SCRIPT_VERSION;
    state.wrappedCallback = true;
    return true;
  }

  function patchDownloadedChunk(chunk) {
    if (typeof chunk !== 'string') {
      return chunk;
    }

    const result = patchGameBundle(chunk);
    if (result.changed || !state.lastPatchResult) {
      state.lastPatchResult = compactPatchResult(result);
    }

    if (!result.changed) {
      return chunk;
    }

    state.patchedChunks += 1;
    return result.source;
  }

  function patchGameBundle(source) {
    const result = patchLegacyGameBundle(source);
    if (typeof result.source !== 'string' || result.source.includes('__blobioCellMassMeasureName(h,')) {
      return result;
    }
    const measure = 'f=d?a.o.b:0;Mm(a.i,a.B);';
    const draw = 'Gm(a.i,a.c,h.text,b,c);';
    const capture = '$wnd.__blobioCellMassCaptureDraw&&$wnd.__blobioCellMassCaptureDraw(g.n,h,a.B,b,c);';
    if (!result.source.includes(measure) || !result.source.includes(draw)) {
      return result;
    }
    const patched = result.source.replace(capture, '').replace(measure,
      'h.dynamic&&$wnd.__blobioCellMassMeasureName&&$wnd.__blobioCellMassMeasureName(h,a.i.a,d&&g.f);' + measure)
      .replace(draw,
        'if(h.dynamic&&$wnd.__blobioCellMassPosition){wo(a.i.a);so(a.i.a,h.text,b,c);' +
        'c+=$wnd.__blobioCellMassPosition(h,a.i.a,g.S,g.M,g.u||g.r);xo(a.i.a,a.c)}else{' + draw + '}' + capture);
    return { source: patched, changed: true, reason: 'patched-dynamic-mass' };
  }

  function patchLegacyGameBundle(source) {
    if (typeof source !== 'string') {
      return { source, changed: false, reason: 'not-a-string' };
    }

    const uidPatch = patchUidResponseHandler(source);
    let patched = uidPatch.source;
    const uidChanged = uidPatch.changed;

    let frameChanged = false;
    patched = patchClanOverlayFrameStart(patched);
    frameChanged = patched !== uidPatch.source;
    const beforeGatePatch = patched;
    patched = patchClanDrawLookupGate(patched);
    const gateChanged = patched !== beforeGatePatch;
    const beforeArgumentPatch = patched;
    patched = patchClanDrawArguments(patched);
    const argumentChanged = patched !== beforeArgumentPatch;

    const unchanged = (reason) => ({
      source: patched,
      changed: uidChanged || frameChanged || gateChanged || argumentChanged,
      reason: uidChanged
        ? 'patched-uid-response'
        : (frameChanged
          ? 'patched-clan-frame'
          : (gateChanged
            ? 'patched-clan-lookup-gate'
            : (argumentChanged ? 'patched-clan-rank-flags' : reason))),
    });

    if (patched.includes('BlobioCellClanTagDraw(g.J,g.n')) {
      if (patched.includes('__blobioCellClanTagRender')) {
        return unchanged('already-patched');
      }
      const upgraded = replaceNativeClanDrawPatch(patched);
      return {
        source: upgraded,
        changed: upgraded !== patched || uidChanged || frameChanged || gateChanged || argumentChanged,
        reason: upgraded !== patched ? 'upgraded-clan-overlay' : (uidChanged ? 'patched-uid-response' : 'already-patched'),
      };
    }

    if (patched.includes('BlobioCellClanTagDraw(g.n,')) {
      let upgraded = patched
        .replace(/BlobioCellClanTagDraw\(g\.n,/g, 'BlobioCellClanTagDraw(g.J,g.n,')
        .replace(/__blobioCellClanTagCaptureDraw\(g\.n,/g, '__blobioCellClanTagCaptureDraw(g.J,g.n,');
      upgraded = replaceNativeClanDrawPatch(upgraded);
      return {
        source: upgraded,
        changed: upgraded !== patched || uidChanged || frameChanged || gateChanged || argumentChanged,
        reason: upgraded !== patched ? 'upgraded-clan-overlay' : (uidChanged ? 'patched-uid-response' : 'replace-failed'),
      };
    }

    if (patched.includes(`${PATCH_MARKER}(g.n,g.w*g.w/100`)) {
      const upgraded = addClanDrawPatch(patched);
      return {
        source: upgraded,
        changed: upgraded !== patched || uidChanged || frameChanged || gateChanged || argumentChanged,
        reason: upgraded !== patched ? 'upgraded-clan-tags' : (uidChanged ? 'patched-uid-response' : 'already-patched'),
      };
    }

    const nameBlockStart = 'Mm(a.i,g.u?a.b:g.r?a.a:a.B);if(Nye(qxe.f,(Ize(),Gze))&&g.B!=null){';
    const nameDrawEnd = 'Gm(a.i,a.c,g.B,b,c)}}}}';

    if (!patched.includes(nameBlockStart) || !patched.includes(nameDrawEnd)) {
      return unchanged('renderer-block-not-found');
    }

    patched = patched.replace(
      nameBlockStart,
      'Mm(a.i,g.u?a.b:g.r?a.a:a.B);d=false;if(Nye(qxe.f,(Ize(),Gze))&&g.B!=null){',
    );

    const drawPatch = [
      'Gm(a.i,a.c,g.B,b,c);d=true}}',
      getClanDrawPatch(),
      'if(g.p&&$wnd.BlobioCellMassDraw){',
      'h=$wnd.BlobioCellMassDraw(g.n,g.w*g.w/100,g.w,g.M,g.N,g.B,d,d?f:0,0,qxe.g/100);',
      'if(h&&h.text){',
      'f=d?a.o.b:0;',
      'Mm(a.i,a.B);',
      'Nn(a.i.b,h.scale);',
      'xp(a.o,a.i,h.text);',
      'if(a.o.d>g.N*h.maxWidth){h.scale*=g.N*h.maxWidth/a.o.d;Nn(a.i.b,h.scale);xp(a.o,a.i,h.text)}',
      'if(a.o.b>g.N*h.maxHeight){h.scale*=g.N*h.maxHeight/a.o.b;Nn(a.i.b,h.scale);xp(a.o,a.i,h.text)}',
      'b=g.R-a.o.d/2;',
      'c=g.S-a.o.b/2;',
      'd&&(c+=f*h.lineGap+a.o.b*0.55);',
      'c+=h.offset;',
      'c=$wnd.Math.max(g.S-g.M,c);',
      'c=$wnd.Math.min(g.S+g.M-a.o.b,c);',
      '$wnd.__blobioCellMassCaptureDraw&&$wnd.__blobioCellMassCaptureDraw(g.n,h,a.B,b,c);',
      'Gm(a.i,a.c,h.text,b,c);',
      'Nn(a.i.b,1)',
      '}}}}',
    ].join('');

    const rendererPatched = patched.replace(nameDrawEnd, drawPatch);
    if (rendererPatched === patched) {
      return unchanged('replace-failed');
    }

    return { source: rendererPatched, changed: true, reason: 'patched' };
  }

  function patchClanOverlayFrameStart(source) {
    const rendererMarker = 'Mm(a.i,g.u?a.b:g.r?a.a:a.B);';
    const markerIndex = source.indexOf(rendererMarker);
    if (markerIndex < 0) {
      return source;
    }

    const cellLoopPattern = /for\(([$\w]+)=0;\1<\(([$\w]+)\(\),([$\w]+)\)\.d\.a\.length;\1\+\+\)\{/g;
    let loopIndex = -1;
    for (let match = cellLoopPattern.exec(source); match && match.index < markerIndex; match = cellLoopPattern.exec(source)) {
      loopIndex = match.index;
    }

    const rendererAnchor = loopIndex >= 0 ? loopIndex : markerIndex;
    const functionPattern = /function\s+[$A-Z_a-z][$\w]*\(a\)\{/g;
    let rendererFunction = null;
    for (let match = functionPattern.exec(source); match && match.index < rendererAnchor; match = functionPattern.exec(source)) {
      rendererFunction = match;
    }
    if (!rendererFunction) {
      return source;
    }

    const bodyStart = rendererFunction.index + rendererFunction[0].length;
    const prologueEnd = loopIndex >= bodyStart ? loopIndex : markerIndex;
    const prologue = source.slice(bodyStart, prologueEnd);
    const clanFrameHook = '$wnd.__blobioCellClanTagBeginFrame&&$wnd.__blobioCellClanTagBeginFrame();';
    if (prologue.includes(clanFrameHook)) {
      return source;
    }

    const emoteFrameHook = '$wnd.__BlobioSkinEmoteBeginFrame&&$wnd.__BlobioSkinEmoteBeginFrame();';
    const emoteHookIndex = prologue.indexOf(emoteFrameHook);
    const insertAt = emoteHookIndex >= 0
      ? bodyStart + emoteHookIndex + emoteFrameHook.length
      : bodyStart;
    return `${source.slice(0, insertAt)}${clanFrameHook}${source.slice(insertAt)}`;
  }

  function replaceNativeClanDrawPatch(source) {
    const nativePatchStarts = [
      'if($wnd.BlobioCellClanTagDraw){h=$wnd.BlobioCellClanTagDraw(g.J,g.n,g.w*g.w/100,g.w,g.M,g.N,g.B,d,d?f:0,g.p,g.u||g.r);if(h&&h.text){',
      'if(g.c&&g.c.M==1&&$wnd.BlobioCellClanTagDraw){h=$wnd.BlobioCellClanTagDraw(g.J,g.n,g.w*g.w/100,g.w,g.M,g.N,g.B,d,d?f:0,g.p,g.u||g.r);if(h&&h.text){',
      'if(g.p&&$wnd.BlobioCellClanTagDraw){h=$wnd.BlobioCellClanTagDraw(g.J,g.n,g.w*g.w/100,g.w,g.M,g.N,g.B,d,d?f:0,g.p,g.u||g.r);if(h&&h.text){',
      'if($wnd.BlobioCellClanTagDraw){h=$wnd.BlobioCellClanTagDraw(g.J,g.n,g.w*g.w/100,g.w,g.M,g.N,g.B,d,d?f:0,0,qxe.g/100);if(h&&h.text){',
      'if(g.c&&g.c.M==1&&$wnd.BlobioCellClanTagDraw){h=$wnd.BlobioCellClanTagDraw(g.J,g.n,g.w*g.w/100,g.w,g.M,g.N,g.B,d,d?f:0,0,qxe.g/100);if(h&&h.text){',
      'if(g.p&&$wnd.BlobioCellClanTagDraw){h=$wnd.BlobioCellClanTagDraw(g.J,g.n,g.w*g.w/100,g.w,g.M,g.N,g.B,d,d?f:0,0,qxe.g/100);if(h&&h.text){',
    ];
    const nativePatchStart = nativePatchStarts.find((candidate) => source.includes(candidate)) || '';
    if (!nativePatchStart) {
      return source;
    }
    const massPatchStart = 'if(g.p&&$wnd.BlobioCellMassDraw){';
    const startIndex = source.indexOf(nativePatchStart);
    const massIndex = source.indexOf(massPatchStart, startIndex + nativePatchStart.length);
    if (massIndex < 0) {
      return source;
    }

    return `${source.slice(0, startIndex)}${getClanDrawPatch()}${source.slice(massIndex)}`;
  }

  function patchClanDrawLookupGate(source) {
    return source
      .replace(
        /if\(d&&g\.p&&\$wnd\.BlobioCellClanTagDraw\)\{/g,
        'if(g.c&&g.c.M==1&&$wnd.BlobioCellClanTagDraw){',
      )
      .replace(
        /if\(g\.p&&\$wnd\.BlobioCellClanTagDraw\)\{/g,
        'if(g.c&&g.c.M==1&&$wnd.BlobioCellClanTagDraw){',
      )
      .replace(
        /if\(\$wnd\.BlobioCellClanTagDraw\)\{/g,
        'if(g.c&&g.c.M==1&&$wnd.BlobioCellClanTagDraw){',
      );
  }

  function patchClanDrawArguments(source) {
    return source.replace(
      /BlobioCellClanTagDraw\(g\.J,g\.n,g\.w\*g\.w\/100,g\.w,g\.M,g\.N,g\.B,d,d\?f:0,0,qxe\.g\/100\)/g,
      'BlobioCellClanTagDraw(g.J,g.n,g.w*g.w/100,g.w,g.M,g.N,g.B,d,d?f:0,g.p,g.u||g.r)',
    );
  }

  function addClanDrawPatch(source) {
    const massPatchStart = 'Gm(a.i,a.c,g.B,b,c);d=true}}if(g.p&&$wnd.BlobioCellMassDraw){';
    if (!source.includes(massPatchStart)) {
      return source;
    }

    return source.replace(
      massPatchStart,
      `Gm(a.i,a.c,g.B,b,c);d=true}}${getClanDrawPatch()}if(g.p&&$wnd.BlobioCellMassDraw){`,
    );
  }

  function getClanDrawPatch() {
    return [
      'if(g.c&&g.c.M==1&&$wnd.BlobioCellClanTagDraw){',
      'h=$wnd.BlobioCellClanTagDraw(g.J,g.n,g.w*g.w/100,g.w,g.M,g.N,g.B,d,d?f:0,g.p,g.u||g.r);',
      'if(h&&h.text&&$wnd.__blobioCellClanTagRender){',
      '$wnd.__blobioCellClanTagRender(h,g.R,g.S,g.N,g.M,a.c&&a.c.g&&a.c.g.a)',
      '}}',
    ].join('');
  }

  function patchUidResponseHandler(source) {
    const fixedHandler = 'case 65:q=d.yU(e);q=$De(q);if($wnd.__blobioCellClanUidResponse&&$wnd.__blobioCellClanUidResponse(q.a)){break}b.K&&Txe(b.K,q);break;';
    if (source.includes(fixedHandler)) {
      return { source, changed: false };
    }

    const staleHandler = 'case 65:q=d.yU(e);q=$De(q);if(!b.K&&$wnd.__blobioCellClanUidResponse&&$wnd.__blobioCellClanUidResponse(q.a)){break}b.K&&Txe(b.K,q);break;';
    if (source.includes(staleHandler)) {
      return {
        source: source.replace(staleHandler, fixedHandler),
        changed: true,
      };
    }

    const packet65Handler = 'case 65:q=d.yU(e);Txe(b.K,$De(q));break;';
    if (!source.includes(packet65Handler)) {
      return { source, changed: false };
    }

    return {
      source: source.replace(
        packet65Handler,
        fixedHandler,
      ),
      changed: true,
    };
  }

  function compactPatchResult(result) {
    return {
      changed: Boolean(result.changed),
      reason: result.reason || '',
      sourceLength: typeof result.source === 'string' ? result.source.length : 0,
    };
  }

  function rememberSample(cellId, mass, rawSize, renderSize, cellSize, name, nameDrawn, result) {
    state.samples.push({
      cellId,
      mass: Math.round(mass * 10) / 10,
      rawSize,
      renderSize,
      cellSize,
      name: typeof name === 'string' ? name.slice(0, 32) : '',
      nameDrawn,
      text: result.text,
      scale: Math.round(result.scale * 1000) / 1000,
      primary: result.primary,
      cached: result.cached,
    });

    if (state.samples.length > 12) {
      state.samples.shift();
    }
  }

  function rememberClanCellSample(reason, playerId, cellId, mass, renderSize, name, nameDrawn, uid = '', extra = {}) {
    if (reason === 'cell-priority' && state.counters.clanHiddenByCellPriority % 30 !== 0) {
      return;
    }
    if (reason !== 'cell-priority') {
      state.counters.clanRecentCellDiagnosticCalls += 1;
      if (state.counters.clanRecentCellDiagnosticCalls % CLAN_DEBUG_SAMPLE_INTERVAL !== 1) {
        state.counters.clanRecentCellSkips += 1;
        return;
      }
    }

    const sample = {
      at: Date.now(),
      reason,
      playerId: String(playerId ?? ''),
      cellId: String(cellId ?? ''),
      uid: normalizeUid(uid),
      mass: Math.round((Number(mass) || 0) * 10) / 10,
      renderSize: Math.round((Number(renderSize) || 0) * 10) / 10,
      name: String(name || '').slice(0, 32),
      nameDrawn: Boolean(nameDrawn),
      ...extra,
    };
    state.counters.clanRecentCellSamples += 1;
    const previous = state.recentClanCells[state.recentClanCells.length - 1];
    if (
      previous
      && previous.reason === sample.reason
      && previous.playerId === sample.playerId
      && previous.cellId === sample.cellId
      && Date.now() - previous.at < 250
    ) {
      Object.assign(previous, sample);
      return;
    }

    state.recentClanCells.push(sample);
    if (state.recentClanCells.length > 16) {
      state.recentClanCells.shift();
    }
  }

  function clanDebugReport() {
    const report = {
      installed: true,
      version: SCRIPT_VERSION,
      url: win.location?.href || '',
      settings: {
        enabled: Boolean(clanTagState.settings.enabled),
        showCellTags: Boolean(clanTagState.settings.showCellTags),
      },
      clanTags: describeClanTagState(),
      playerUidMap: {
        ...describePlayerUidState(),
        mappedPlayerIds: Array.from(playerUidState.playerIdToUid.entries()).slice(0, 12)
          .map(([playerId, uid]) => ({
            playerId,
            uid,
            isClanMember: clanTagState.members.has(uid),
            source: playerUidState.playerIdSources.get(playerId) || '',
          })),
        queued: Array.from(queuedUidLookups.values()).slice(0, 8),
        pending: Array.from(pendingUidLookups.values()).slice(0, 8),
        responseOrigins: uidResponseOrigins.slice(0, 8),
      },
      counters: {
        clanHookCalls: state.counters.clanHookCalls,
        clanTagsDrawn: state.counters.clanTagsDrawn,
        clanHiddenBySetting: state.counters.clanHiddenBySetting,
        clanHiddenByName: state.counters.clanHiddenByName,
        clanHiddenByUid: state.counters.clanHiddenByUid,
        clanHiddenByCellPriority: state.counters.clanHiddenByCellPriority,
        clanResolvedByDirectUid: state.counters.clanResolvedByDirectUid,
        clanResolvedByPlayerId: state.counters.clanResolvedByPlayerId,
        clanUidLookupQueued: state.counters.clanUidLookupQueued,
        clanUidLookupSent: state.counters.clanUidLookupSent,
        clanUidLookupSentBySocket: state.counters.clanUidLookupSentBySocket,
        clanUidLookupSentByBridge: state.counters.clanUidLookupSentByBridge,
        clanUidLookupResponses: state.counters.clanUidLookupResponses,
        clanUidLookupResponseHooks: state.counters.clanUidLookupResponseHooks,
        clanUidLookupMessageResponses: state.counters.clanUidLookupMessageResponses,
        clanUidLookupManualRequests: state.counters.clanUidLookupManualRequests,
        clanUidLookupManualResponses: state.counters.clanUidLookupManualResponses,
        clanUidLookupSkippedSocket: state.counters.clanUidLookupSkippedSocket,
        clanUidLookupQueueDrops: state.counters.clanUidLookupQueueDrops,
        clanOverlayFrames: state.counters.clanOverlayFrames,
        clanOverlayDraws: state.counters.clanOverlayDraws,
        clanOverlayQueueCalls: state.counters.clanOverlayQueueCalls,
        clanOverlayCandidatesReplaced: state.counters.clanOverlayCandidatesReplaced,
        clanOverlayFlushes: state.counters.clanOverlayFlushes,
        clanOverlayMicrotasks: state.counters.clanOverlayMicrotasks,
        clanOverlayTimeouts: state.counters.clanOverlayTimeouts,
        clanOverlayClearCalls: state.counters.clanOverlayClearCalls,
        clanOverlayStaleTimers: state.counters.clanOverlayStaleTimers,
        clanOverlayStaleDeadlineUpdates: state.counters.clanOverlayStaleDeadlineUpdates,
        clanOverlayFallbackClears: state.counters.clanOverlayFallbackClears,
        clanOverlayStaleClears: state.counters.clanOverlayStaleClears,
        clanOverlaySkipped: state.counters.clanOverlaySkipped,
        clanOverlayCleanups: state.counters.clanOverlayCleanups,
        clanSeenDetailSamples: state.counters.clanSeenDetailSamples,
        clanSeenDetailSkips: state.counters.clanSeenDetailSkips,
        clanRecentCellDiagnosticCalls: state.counters.clanRecentCellDiagnosticCalls,
        clanRecentCellSamples: state.counters.clanRecentCellSamples,
        clanRecentCellSkips: state.counters.clanRecentCellSkips,
        clanLastMatchDiagnosticCalls: state.counters.clanLastMatchDiagnosticCalls,
        clanLastMatchSamples: state.counters.clanLastMatchSamples,
        clanLastMatchSkips: state.counters.clanLastMatchSkips,
      },
      recentClanCells: state.recentClanCells.slice(),
      seenPlayerIds: Array.from(seenClanPlayerIds.values()).slice(-16).map((entry) => ({
        playerId: entry.playerId,
        name: entry.name,
        cellId: entry.cellId,
        uid: entry.uid,
        hookCalls: entry.hookCalls,
        lastReason: entry.lastReason,
      })),
      lastMatch: playerUidState.lastMatch,
      lastContextMenu: playerUidState.lastContextMenu,
      lastClanTag: state.lastClanTag,
      lastClanOverlayDraw: state.lastClanOverlayDraw,
      errors: state.errors.slice(-8),
      commands: [
        'BlobioClanDebug()',
        'BlobioClanLookupDebug(playerId, optionalName)',
        'BlobioCellMassDebug()',
        'BlobioCellClanTagPerformanceDebug()',
        'await BlobioRenderPerformanceProfile(3000)',
      ],
    };

    try {
      win.console?.log?.('[Blobio Clan] debug', report);
      win.console?.log?.('[Blobio Clan] JSON:', JSON.stringify(report));
    } catch {}
    return report;
  }

  function debugReport() {
    const report = {
      installed: true,
      version: SCRIPT_VERSION,
      url: win.location?.href || '',
      uptimeMs: Date.now() - state.startedAt,
      settings: { ...settings },
      counters: { ...state.counters, cachedCells: labelCache.size },
      clanTags: { ...state.clanTags },
      playerUidMap: { ...state.playerUidMap },
      patch: {
        seenCacheScripts: state.seenCacheScripts,
        wrappedCallback: state.wrappedCallback,
        patchedChunks: state.patchedChunks,
        lastPatchResult: state.lastPatchResult,
      },
      samples: state.samples.slice(),
      lastLabel: state.lastLabel,
      lastDrawCapture: state.lastDrawCapture,
      lastClanTag: state.lastClanTag,
      lastClanDrawCapture: state.lastClanDrawCapture,
      lastClanOverlayDraw: state.lastClanOverlayDraw,
      clanOverlay: clanOverlay.overlay ? {
        connected: Boolean(clanOverlay.overlay.parentNode),
        width: Number(clanOverlay.overlay.width) || 0,
        height: Number(clanOverlay.overlay.height) || 0,
        targetCanvas: clanOverlay.targetCanvas ? {
          width: Number(clanOverlay.targetCanvas.width) || 0,
          height: Number(clanOverlay.targetCanvas.height) || 0,
        } : null,
      } : null,
      commands: [
        'BlobioCellMassDebug()',
        'BlobioClanDebug()',
        'BlobioClanLookupDebug(playerId, optionalName)',
        'BlobioShowMassDebug()',
        'blobioCellMassDebug()',
        'BlobioCellClanTagPerformanceDebug()',
        'await BlobioRenderPerformanceProfile(3000)',
      ],
      errors: state.errors.slice(-8),
    };

    try {
      win.console?.log?.('[Blobio Cell Mass] debug', report);
      win.console?.log?.('[Blobio Cell Mass] JSON:', JSON.stringify(report));
    } catch {}
    return report;
  }

  function normalizeSettings(value = {}) {
    const source = value && typeof value === 'object' ? value : {};
    const defaults = {
      enabled: true,
      compact: true,
      smartRendering: true,
      emphasizeBiggest: true,
      mode: 'normal',
      textScale: 0.65,
      yOffset: 10,
      nameGap: 1.2,
      updateDelayMs: 3000,
    };

    return {
      enabled: source.enabled === undefined ? defaults.enabled : Boolean(source.enabled),
      compact: source.compact === undefined ? defaults.compact : Boolean(source.compact),
      smartRendering: source.smartRendering === undefined ? defaults.smartRendering : Boolean(source.smartRendering),
      emphasizeBiggest: source.emphasizeBiggest === undefined ? defaults.emphasizeBiggest : Boolean(source.emphasizeBiggest),
      mode: ['normal', 'vip', 'custom', 'dynamic'].includes(source.mode) ? source.mode : defaults.mode,
      textScale: clampNumber(source.textScale, 0.35, 1.4, defaults.textScale),
      yOffset: clampNumber(source.yOffset, -120, 120, defaults.yOffset),
      nameGap: clampNumber(source.nameGap, 0.1, 3, defaults.nameGap),
      updateDelayMs: Math.round(clampNumber(source.updateDelayMs, 0, 10000, defaults.updateDelayMs)),
    };
  }

  function clampNumber(value, min, max, fallback) {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
  }

  function rememberError(message) {
    state.errors.push({
      at: Date.now(),
      message,
    });
    if (state.errors.length > 20) {
      state.errors.shift();
    }
  }

  function rememberClanTagHookError(error, phase) {
    rememberError(`Cell clan tag ${phase} failed: ${getErrorMessage(error)}`);
  }

  function cloneRendererColor(color) {
    if (!color || typeof color !== 'object') {
      return null;
    }
    return {
      d: roundNumber(color.d),
      c: roundNumber(color.c),
      b: roundNumber(color.b),
      a: roundNumber(color.a),
    };
  }

  function roundNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number * 10000) / 10000 : 0;
  }

  function getErrorMessage(error) {
    return error?.message || String(error);
  }
}
