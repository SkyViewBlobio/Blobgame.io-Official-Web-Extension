const RENDER_PERFORMANCE_VERSION = '0.1.2';
const DEFAULT_PROFILE_MS = 3000;
const MIN_PROFILE_MS = 250;
const MAX_PROFILE_MS = 30000;

export function pageRenderPerformanceBootstrap(pageWindow = globalThis) {
  const win = pageWindow || globalThis;
  const host = String(win.location?.hostname || '').toLowerCase();
  if (host && host !== 'custom.client.blobgame.io' && host !== 'blobgame.io') {
    return false;
  }

  if (win.__blobioRenderPerformanceVersion === RENDER_PERFORMANCE_VERSION) {
    return true;
  }

  const commands = [
    'BlobioRenderPerformanceDebug()',
    'await BlobioRenderPerformanceProfile(3000)',
    'BlobioGameBackgroundPerformanceDebug()',
    'BlobioVirusPelletColorsPerformanceDebug()',
    'BlobioVirusMotherCellPerformanceDebug()',
    'BlobioJellyShaderPerformanceDebug()',
    'BlobioCellRingPerformanceDebug()',
    'BlobioCellClanTagPerformanceDebug()',
  ];

  const readers = {
    background: readBackground,
    cellColors: readCellColors,
    virusGlow: readVirusGlow,
    jellyShader: readJellyShader,
    cellRing: readCellRing,
    clanTag: readClanTag,
  };

  win.__blobioRenderPerformanceVersion = RENDER_PERFORMANCE_VERSION;
  win.__blobioRenderPerformanceSnapshot = captureSnapshot;
  win.BlobioRenderPerformanceDebug = debugReport;
  win.BlobioRenderPerformanceProfile = profile;

  exposeFeatureCommand('BlobioGameBackgroundPerformanceDebug', 'background');
  exposeFeatureCommand('BlobioVirusPelletColorsPerformanceDebug', 'cellColors');
  exposeFeatureCommand('BlobioVirusMotherCellPerformanceDebug', 'virusGlow');
  exposeFeatureCommand('BlobioJellyShaderPerformanceDebug', 'jellyShader');
  exposeFeatureCommand('BlobioCellRingPerformanceDebug', 'cellRing');
  exposeFeatureCommand('BlobioCellClanTagPerformanceDebug', 'clanTag');

  win.BlobioGameBackgroundDebug ||= win.BlobioGameBackgroundPerformanceDebug;
  win.BlobioVirusMotherCellDebug ||= win.BlobioVirusMotherCellPerformanceDebug;
  win.BlobioJellyShaderDebug ||= win.BlobioJellyShaderPerformanceDebug;
  win.BlobioCellClanTagDebug ||= win.BlobioCellClanTagPerformanceDebug;
  if (typeof win.blobCellColorsProfile === 'function') {
    win.BlobioVirusPelletColorsProfile = win.blobCellColorsProfile;
  }

  return true;

  function exposeFeatureCommand(commandName, featureName) {
    win[commandName] = () => {
      const report = captureSnapshot().features[featureName];
      win.console?.log?.(`[Blobio Performance] ${featureName}`, report);
      return report;
    };
  }

  function captureSnapshot() {
    const features = {};
    for (const [name, read] of Object.entries(readers)) {
      try {
        features[name] = read();
      } catch (error) {
        features[name] = {
          installed: false,
          enabled: false,
          error: error?.message || String(error),
          counters: {},
        };
      }
    }

    return {
      version: RENDER_PERFORMANCE_VERSION,
      capturedAt: Date.now(),
      extensionVersion: String(win.__blobioExtensionVersion || win.__blobioExtension?.version || ''),
      measurement: describeMeasurement(),
      features,
      commands: [...commands],
    };
  }

  function debugReport() {
    const report = captureSnapshot();
    win.console?.log?.('[Blobio Performance] render snapshot', report);
    return report;
  }

  function profile(requestedDurationMs = DEFAULT_PROFILE_MS) {
    const durationMs = clampDuration(requestedDurationMs);
    const startedAt = now();
    const start = captureSnapshot();

    return new Promise((resolve) => {
      const finish = () => {
        const end = captureSnapshot();
        const elapsedMs = Math.max(1, now() - startedAt);
        const frame = pickFrameSource(start, end);
        const features = {};

        for (const name of Object.keys(readers)) {
          const startFeature = start.features[name] || { counters: {} };
          const endFeature = end.features[name] || { counters: {} };
          const delta = subtractCounters(startFeature.counters, endFeature.counters);
          features[name] = {
            installed: Boolean(endFeature.installed),
            enabled: Boolean(endFeature.enabled),
            delta,
            perSecond: divideCounters(delta, elapsedMs / 1000),
            perFrame: frame.frames > 0 ? divideCounters(delta, frame.frames) : null,
          };
        }

        const report = {
          version: RENDER_PERFORMANCE_VERSION,
          measurement: describeMeasurement(),
          requestedDurationMs: durationMs,
          durationMs: round(elapsedMs),
          frameSource: frame.source,
          frames: frame.frames,
          fps: round(frame.frames * 1000 / elapsedMs),
          averageFrameMs: frame.frames > 0 ? round(elapsedMs / frame.frames) : null,
          observedFrameIntervalMs: frame.frames > 0 ? round(elapsedMs / frame.frames) : null,
          features,
          start,
          end,
          commands: [...commands],
        };
        win.__blobioRenderPerformanceLastProfile = report;
        win.console?.log?.('[Blobio Performance] render profile', report);
        resolve(report);
      };

      const setTimer = win.setTimeout || globalThis.setTimeout;
      if (typeof setTimer === 'function') {
        setTimer.call(win, finish, durationMs);
      } else {
        finish();
      }
    });
  }

  function readBackground() {
    const state = win.__blobioGameBackgroundState || {};
    return {
      installed: Boolean(win.__blobioGameBackgroundInstalled || state.installed),
      enabled: Boolean(state.settings?.enabled),
      executionPath: 'existing-canvas-clear-and-fill-calls',
      diagnostics: {
        countersAvailable: Object.prototype.hasOwnProperty.call(state, 'clearCalls'),
        requiresLoaderVersion: '0.2.78',
      },
      counters: numbers({
        getContextCalls: state.getContextCalls,
        webGlContextCalls: state.webGlContextCalls,
        clearColorCalls: state.clearColorCalls,
        clearCalls: state.clearCalls,
        fillRectCalls: state.fillRectCalls,
        clearColorHits: state.clearColorHits,
        clearHits: state.clearHits,
        fillHits: state.fillHits,
        defaultFramebufferChecks: state.defaultFramebufferChecks,
        defaultFramebufferQueries: state.defaultFramebufferQueries,
        framebufferBindCalls: state.framebufferBindCalls,
        canvasMarks: state.canvasMarks,
        canvasStyleUpdates: state.canvasStyleUpdates,
        canvasStyleSkips: state.canvasStyleSkips,
        knownCanvasScans: state.knownCanvasScans,
        gradientObjectsBuilt: state.gradientObjectsBuilt,
        frameObserverCallbacks: state.frameObserverCallbacks,
        frameObserverNodes: state.frameObserverNodes,
        patchedWindows: state.patchedWindows,
        patchedFrames: state.patchedFrames,
        extraDrawCalls: 0,
      }),
    };
  }

  function readCellColors() {
    const state = win.__blobCellColorState || {};
    const hits = state.hits || {};
    const loader = win.__blobioVirusPelletColorLoaderStatus || {};
    return {
      installed: Boolean(win.__blobioVirusPelletColorInstalled || state.patchInstalled),
      enabled: Boolean(win.__BlobCellColorizer?.enabled ?? loader.enabled),
      executionPath: 'existing-cell-color-selection-hook',
      counters: numbers({
        callbackCalls: state.callbackCalls,
        patchedChunks: state.patchedChunks,
        metricsRefreshes: state.metricsRefreshes,
        virusColorCalls: hits.virus,
        pelletColorCalls: hits.pellets,
        ignoredCalls: hits.ignoredByType,
        disabledCalls: hits.disabled,
        totalColorCalls: sum(hits.virus, hits.pellets, hits.ignoredByType, hits.disabled),
        extraDrawCalls: 0,
      }),
    };
  }

  function readVirusGlow() {
    const state = win.__blobVirusGlowState || {};
    const settings = win.__blobVirusGlowSettings || {};
    return {
      installed: Boolean(win.__blobioVirusMotherCellInstalled || Object.keys(state).length),
      enabled: Boolean(win.__blobioVirusMotherCellLoaderStatus?.bootstrapEnabled),
      executionPath: 'additional-virus-glow-texture-draw',
      mask: String(settings.maskId || ''),
      counters: numbers({
        frames: state.frame,
        callbackCalls: state.callbackCalls,
        patchedChunks: state.patchedChunks,
        highDetailVirusHits: state.highDetailVirusHits,
        fallbackVirusHits: state.fallbackVirusHits,
        textureVirusHits: state.textureVirusHits,
        highDetailGlowDraws: state.highDetailGlowDraws,
        fallbackGlowDraws: state.fallbackGlowDraws,
        nonRotatedHighDetailDraws: state.nonRotatedHighDetailDraws,
        nonRotatedFallbackDraws: state.nonRotatedFallbackDraws,
        glowTextureDraws: state.glowTextureDraws,
        virusTextureDraws: state.virusTextureDraws,
        skippedVirusTextureDraws: state.skippedVirusTextureDraws,
        rotationDraws: state.rotationDraws,
        rotationStateChecks: state.rotationStateChecks,
        rotationTextureDraws: state.rotationTextureDraws,
        glowMaskAssetHits: state.glowMaskAssetHits,
        glowMaskTextureUploads: state.glowMaskTextureUploads,
        colorizerVirusCalls: state.colorizerVirusCalls,
        colorizerVirusApplied: state.colorizerVirusApplied,
        colorizerVirusMissing: state.colorizerVirusMissing,
        extraGlowDrawCalls: sum(state.highDetailGlowDraws, state.fallbackGlowDraws),
      }),
    };
  }

  function readJellyShader() {
    const status = win.__blobioJellyShaderStatus || {};
    return {
      installed: Boolean(win.__blobioJellyShaderInstalled || Object.keys(status).length),
      enabled: Boolean(status.enabled),
      executionPath: 'existing-cell-fragment-shader',
      gpuPerFragment: Boolean(status.enabled && status.shaderSourcesPatched > 0),
      counters: numbers({
        shaderSourcesSeen: status.shaderSourcesSeen,
        shaderSourcesPatched: status.shaderSourcesPatched,
        skinShaderPatches: status.skinShaderPatches,
        noSkinShaderPatches: status.noSkinShaderPatches,
        hookInstallAttempts: status.hookInstallAttempts,
        refreshCalls: status.refreshCalls,
        cpuCallbacksPerFrame: 0,
        extraDrawCalls: 0,
      }),
    };
  }

  function readCellRing() {
    const state = win.__BlobioCellRingState || {};
    const overlay = state.overlay || {};
    const markers = state.markers || {};
    const bundle = state.bundle || {};
    const shader = state.shader || {};
    return {
      installed: Boolean(win.__blobioCellRingInstalled || state.installed),
      enabled: Boolean(state.settings?.enabled),
      executionPath: 'cell-color-hook-plus-native-glow-before-name',
      counters: numbers({
        overlayFrames: overlay.frames,
        overlayDraws: overlay.draws,
        overlayClearCalls: overlay.clearCalls,
        overlaySkipped: overlay.skipped,
        overlayCompileErrors: overlay.compileErrors,
        trackCalls: overlay.trackCalls,
        trackFrameLimitSkips: overlay.trackFrameLimitSkips,
        trackSetupSkips: overlay.trackSetupSkips,
        trackViewportSkips: overlay.trackViewportSkips,
        trackDrawSkips: overlay.trackDrawSkips,
        colorCalls: markers.colorCalls,
        ownColorCalls: markers.ownColorCalls,
        otherColorCalls: markers.otherColorCalls,
        borderSuppressions: markers.borderSuppressions,
        textureSubstitutions: markers.defaultTextureSubstitutions,
        colorDecisionSamples: markers.colorDecisionSamples,
        shaderSourceCalls: shader.sourceCalls,
        shaderPatchedCalls: shader.patchedCalls,
        bundleCallbackCalls: bundle.callbackCalls,
        patchedChunks: bundle.patchedChunks,
        extraOverlayDrawCalls: overlay.draws,
      }),
    };
  }

  function readClanTag() {
    const state = win.__blobioCellMassState || {};
    const counters = state.counters || {};
    return {
      installed: Boolean(win.__blobioCellMassInstalled || state.installed),
      enabled: Boolean(state.clanTags?.enabled && state.clanTags?.showCellTags),
      executionPath: 'single-2d-canvas-text-overlay',
      counters: numbers({
        hookCalls: counters.clanHookCalls,
        tagsResolved: counters.clanTagsDrawn,
        overlayFrames: counters.clanOverlayFrames,
        overlayDraws: counters.clanOverlayDraws,
        overlaySkipped: counters.clanOverlaySkipped,
        overlayQueueCalls: counters.clanOverlayQueueCalls,
        overlayCandidatesReplaced: counters.clanOverlayCandidatesReplaced,
        overlayFlushes: counters.clanOverlayFlushes,
        overlayMicrotasks: counters.clanOverlayMicrotasks,
        overlayTimeouts: counters.clanOverlayTimeouts,
        overlayClearCalls: counters.clanOverlayClearCalls,
        overlayStaleTimers: counters.clanOverlayStaleTimers,
        overlayStaleDeadlineUpdates: counters.clanOverlayStaleDeadlineUpdates,
        overlayFallbackClears: counters.clanOverlayFallbackClears,
        seenDetailSamples: counters.clanSeenDetailSamples,
        seenDetailSkips: counters.clanSeenDetailSkips,
        recentCellSamples: counters.clanRecentCellSamples,
        recentCellSkips: counters.clanRecentCellSkips,
        lastMatchSamples: counters.clanLastMatchSamples,
        lastMatchSkips: counters.clanLastMatchSkips,
        uidLookupsSent: counters.clanUidLookupSent,
        uidResponses: counters.clanUidLookupResponses,
        automatedMenusSuppressed: counters.clanUidLookupSuppressedMenus,
        manualUidRequests: counters.clanUidLookupManualRequests,
        manualMenusOpened: counters.clanUidLookupManualResponses,
        canvasTextDrawCalls: finite(counters.clanOverlayDraws) * 2,
      }),
    };
  }

  function pickFrameSource(start, end) {
    const candidates = [
      ['cellRing.overlayFrames', 'cellRing', 'overlayFrames'],
      ['virusGlow.frames', 'virusGlow', 'frames'],
      ['clanTag.overlayFrames', 'clanTag', 'overlayFrames'],
    ];
    let fallback = { source: '', frames: 0 };
    for (const [source, feature, counter] of candidates) {
      const frames = Math.max(
        0,
        finite(end.features[feature]?.counters?.[counter]) - finite(start.features[feature]?.counters?.[counter]),
      );
      if (!fallback.source && end.features[feature]?.installed) {
        fallback = { source, frames };
      }
      if (frames > 0) {
        return { source, frames };
      }
    }
    return fallback;
  }

  function describeMeasurement() {
    return {
      kind: 'counter-rate-sample',
      featureCpuTiming: false,
      gpuTiming: false,
      note: 'Reports callback and draw rates plus observed frame cadence; it does not attribute CPU or GPU time to a feature.',
    };
  }

  function subtractCounters(start = {}, end = {}) {
    const result = {};
    for (const key of Object.keys(end)) {
      result[key] = Math.max(0, finite(end[key]) - finite(start[key]));
    }
    return result;
  }

  function divideCounters(counters, divisor) {
    const result = {};
    const safeDivisor = Math.max(Number.EPSILON, divisor);
    for (const [key, value] of Object.entries(counters)) {
      result[key] = round(value / safeDivisor);
    }
    return result;
  }

  function numbers(source) {
    const result = {};
    for (const [key, value] of Object.entries(source)) {
      result[key] = finite(value);
    }
    return result;
  }

  function sum(...values) {
    return values.reduce((total, value) => total + finite(value), 0);
  }

  function finite(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function clampDuration(value) {
    const duration = finite(value) || DEFAULT_PROFILE_MS;
    return Math.max(MIN_PROFILE_MS, Math.min(MAX_PROFILE_MS, Math.round(duration)));
  }

  function now() {
    return typeof win.performance?.now === 'function' ? win.performance.now() : Date.now();
  }

  function round(value) {
    return Math.round(finite(value) * 1000) / 1000;
  }
}
