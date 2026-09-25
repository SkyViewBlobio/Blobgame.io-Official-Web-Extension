const CACHE_SCRIPT_RE = /\/html\/[a-f0-9]{32}\.cache\.js(?:[?#].*)?$/i;
const SETTINGS_EVENT = 'blobio-virus-pellet-colors-updated';
const RUNTIME_FIX_REVISION = 'draw-local-fast-target-gates-v8';
const FOOD_DRAW_RE = /case 2:case 5:case 0:g\.K\.a\s*=\s*(?:0\.75|\.75|0\.7500000+);([$A-Za-z_][$\w]*)\(a\.c,g\.K\);([$A-Za-z_][$\w]*)\(a\.c,([$A-Za-z_][$\w]*),g\.R-g\.M,g\.S-g\.M,g\.N,g\.N\);/;
const FOOD_ALPHA_RE = /case 2:case 5:case 0:g\.K\.a\s*=\s*(?:0\.75|\.75|0\.7500000+);/;
const FOOD_CASE_RE = /case 2:case 5:case 0:/;
const VIRUS_BRANCH_RE = /case 4:case 3:if\(g\.q\)\{if\(g\.P\)\{h=g\.P;([$A-Za-z_][$\w]*)\(\);([$A-Za-z_][$\w]*)\(a\.c,g\.K\);([$A-Za-z_][$\w]*)\(a\.c,h,g\.R-g\.M,g\.S-g\.M,g\.N,g\.N\)\}\}else\{\1\(\);\2\(a\.c,g\.K\);\3\(a\.c,(\(?a\.[$A-Za-z_][$\w]*\)?),g\.R-g\.M,g\.S-g\.M,g\.N,g\.N\)\}break;/;
const FALLBACK_RENDER_RE = /function ([$A-Za-z_][$\w]*)\(a,b\)\{var c;if\(b\.q\)\{c=b\.P;([$A-Za-z_][$\w]*)\(\);([$A-Za-z_][$\w]*)\(a\.c,b\.K\);([$A-Za-z_][$\w]*)\(a\.c,c,b\.R-b\.M,b\.S-b\.M,b\.N,b\.N\)\}else if\(b\.P\)\{\3\(a\.c,b\.K\);\4\(a\.c,b\.P,b\.R-b\.M,b\.S-b\.M,b\.N,b\.N\)\}else\{b\.K\.a=0\.75;\3\(a\.c,b\.K\);\4\(a\.c,([$A-Za-z_][$\w]*),b\.R-b\.M,b\.S-b\.M,b\.N,b\.N\)\}\}/;

const PAGE_HOOK = '__BlobCellColorizer';
const STATE_KEY = '__blobCellColorState';
const INV_255 = 1 / 255;
const DEBUG_SAMPLE_MASK = 4095;
const METRICS_REFRESH_MASK = 4095;
const DEFAULT_SETTINGS = Object.freeze({
  enabled: false,
  virus: {
    enabled: true,
    mode: 'solid',
    alpha: 100,
    solid: '#00d25a',
    gradient: {
      from: '#00ff8c',
      to: '#0078ff',
      angle: 135,
    },
  },
  pellets: {
    enabled: true,
    mode: 'solid',
    alpha: 100,
    solid: '#ffb450',
    gradient: {
      from: '#ff50a0',
      to: '#46dcff',
      angle: 45,
    },
  },
});

export function pageVirusPelletColorsBootstrap(initialSettings, pageWindow = globalThis) {
  const win = pageWindow;
  const doc = win.document;
  const settings = normalizeVirusPelletColorSettings(initialSettings);
  const loaderStatus = win.__blobioVirusPelletColorLoaderStatus || {};
  loaderStatus.bootstrapEntered = true;
  loaderStatus.bootstrapHost = win.location?.hostname || '';
  loaderStatus.bootstrapEnabled = settings.enabled;
  win.__blobioVirusPelletColorLoaderStatus = loaderStatus;

  if (win.location?.hostname !== 'custom.client.blobgame.io') {
    loaderStatus.bootstrapResult = 'skipped';
    exposeDisabledDebug(win, settings, loaderStatus);
    return false;
  }

  const installedRevision = win.__blobioVirusPelletColorRuntimeRevision || '';
  if (win.__blobioVirusPelletColorInstalled && installedRevision === RUNTIME_FIX_REVISION) {
    win.__blobioVirusPelletColorRefresh?.(settings);
    loaderStatus.bootstrapResult = settings.enabled ? 'refreshed' : 'disabled-refresh';
    return true;
  }
  if (win.__blobioVirusPelletColorInstalled) {
    loaderStatus.upgradedFromRevision = installedRevision || 'legacy';
  }
  win.__blobioVirusPelletColorInstalled = true;
  win.__blobioVirusPelletColorRuntimeRevision = RUNTIME_FIX_REVISION;

  let activeSettings = settings;
  let renderConfig = buildRenderConfig(activeSettings);
  let activeProfile = null;
  const gradientMetrics = {
    canvas: null,
    width: 1280,
    height: 720,
    centerX: 640,
    centerY: 360,
    invLength: 1 / Math.sqrt(1280 * 1280 + 720 * 720),
    checks: 0,
  };
  const state = getState(win);
  loaderStatus.bootstrapResult = 'installing';

  win.addEventListener?.('resize', () => {
    gradientMetrics.canvas = null;
    gradientMetrics.checks = 0;
  }, { passive: true });
  win.addEventListener?.(SETTINGS_EVENT, refreshFromSettingsEvent);
  doc?.addEventListener?.(SETTINGS_EVENT, refreshFromSettingsEvent);

  exposePageHook();
  installDebugCommand();
  installGameScriptPatch();
  loaderStatus.bootstrapResult = 'installed';
  return true;

  function refresh(nextSettings) {
    activeSettings = normalizeVirusPelletColorSettings(nextSettings);
    renderConfig = buildRenderConfig(activeSettings);
    exposePageHook();
    loaderStatus.enabled = activeSettings.enabled;
    state.lastRuntimeRefresh = {
      time: Date.now(),
      parentEnabled: activeSettings.enabled,
      virusEnabled: renderConfig.virus.enabled,
      pelletsEnabled: renderConfig.pellets.enabled,
    };
  }

  function refreshFromSettingsEvent(event) {
    const nextSettings = event?.detail?.settings || event?.detail;
    if (nextSettings && typeof nextSettings === 'object') {
      refresh(nextSettings);
    }
  }

  function buildRenderConfig(source) {
    const parentEnabled = Boolean(source.enabled);
    return {
      virus: buildRenderTarget(source.virus, 'virus', 'lastVirus', parentEnabled),
      pellets: buildRenderTarget(source.pellets, 'pellets', 'lastPellet', parentEnabled),
    };
  }

  function buildRenderTarget(target, hitKey, lastKey, parentEnabled) {
    const mode = target.mode === 'gradient' ? 'gradient' : 'solid';
    const enabled = Boolean(parentEnabled && target.enabled !== false);
    return {
      hitKey,
      lastKey,
      enabled,
      solid: enabled && mode === 'solid',
      gradient: enabled && mode === 'gradient',
      solidColor: toGwtColor(target.solid, target.alpha),
      gradientColor: buildGradientColor(target.gradient, target.alpha),
      gradientScratch: { d: 0, c: 0, b: 0, a: 1 },
    };
  }

  function toGwtColor(color, alpha) {
    const clean = String(color || '#000000').slice(1);
    const red = Number.parseInt(clean.slice(0, 2), 16) || 0;
    const green = Number.parseInt(clean.slice(2, 4), 16) || 0;
    const blue = Number.parseInt(clean.slice(4, 6), 16) || 0;
    return {
      d: red * INV_255,
      c: green * INV_255,
      b: blue * INV_255,
      a: alpha / 100,
      r: red,
      g: green,
      blue,
      alpha,
    };
  }

  function buildGradientColor(gradient, alpha) {
    const angle = gradient.angle * Math.PI / 180;
    const from = toGwtColor(gradient.from, alpha);
    const to = toGwtColor(gradient.to, alpha);

    return {
      cos: Math.cos(angle),
      sin: Math.sin(angle),
      fromD: from.d,
      fromC: from.c,
      fromB: from.b,
      fromA: from.a,
      deltaD: to.d - from.d,
      deltaC: to.c - from.c,
      deltaB: to.b - from.b,
      deltaA: to.a - from.a,
    };
  }

  function exposePageHook() {
    const virus = renderConfig.virus;
    const pellets = renderConfig.pellets;
    win[PAGE_HOOK] = {
      enabled: activeSettings.enabled,
      virusEnabled: virus.enabled,
      virusSolidColor: virus.solid ? virus.solidColor : null,
      virusGradient: virus.gradient,
      foodEnabled: pellets.enabled,
      foodSolidColor: pellets.solid ? pellets.solidColor : null,
      foodGradient: pellets.gradient,
      virusColor: (object) => getDrawColor(virus, object, 3, 4),
      foodColor: (object) => getDrawColor(pellets, object, 2),
      virusDrawColor: (object) => getDrawColor(virus, object, null),
      foodDrawColor: (object) => getDrawColor(pellets, object, null),
    };
    win.__blobioVirusPelletColorRefresh = refresh;
  }

  function getState() {
    const existing = win[STATE_KEY] && typeof win[STATE_KEY] === 'object' ? win[STATE_KEY] : {};
    const next = Object.assign({
      version: initialSettings?.version || '',
      patchInstalled: false,
      wrappedCallback: false,
      seenCacheScripts: 0,
      callbackCalls: 0,
      patchedChunks: 0,
      lastPatchResult: null,
      lastChangedPatchResult: null,
      patchResults: [],
      lastPatchTime: 0,
      metricsRefreshes: 0,
      lastProfile: null,
      lastRuntimeRefresh: null,
      hits: {
        virus: 0,
        pellets: 0,
        ignoredByType: 0,
        disabled: 0,
      },
      lastVirus: null,
      lastPellet: null,
      lastIgnored: null,
      errors: [],
    }, existing);

    next.version = initialSettings?.version || next.version;
    next.hits = Object.assign({
      virus: 0,
      pellets: 0,
      ignoredByType: 0,
      disabled: 0,
    }, next.hits || {});
    next.patchResults = Array.isArray(next.patchResults) ? next.patchResults : [];
    next.errors = Array.isArray(next.errors) ? next.errors : [];
    next.metricsRefreshes = Number(next.metricsRefreshes) || 0;
    win[STATE_KEY] = next;
    return next;
  }

  function installDebugCommand() {
    const debug = () => ({
      version: initialSettings?.version || state.version,
      patchRevision: RUNTIME_FIX_REVISION,
      page: win.location?.href || '',
      hasPageHook: Boolean(win[PAGE_HOOK]),
      commands: [
        'blobCellColorsDebug()',
        'BlobioVirusPelletColorsDebug()',
        'window.__blobVirusPelletColorsDebug()',
        'blobCellColorsProfile(optionalMs)',
        'BlobioVirusPelletColorsProfile(optionalMs)',
        'BlobioVirusPelletColorsPerformanceDebug()',
      ],
      settings: activeSettings,
      activeTargets: {
        virus: describeRenderTarget(renderConfig.virus),
        pellets: describeRenderTarget(renderConfig.pellets),
      },
      pageHook: win[PAGE_HOOK] ? {
        enabled: Boolean(win[PAGE_HOOK].enabled),
        virusEnabled: Boolean(win[PAGE_HOOK].virusEnabled),
        foodEnabled: Boolean(win[PAGE_HOOK].foodEnabled),
        hasVirusSolidColor: Boolean(win[PAGE_HOOK].virusSolidColor),
        hasFoodSolidColor: Boolean(win[PAGE_HOOK].foodSolidColor),
        hasVirusDrawColor: typeof win[PAGE_HOOK].virusDrawColor === 'function',
        hasFoodDrawColor: typeof win[PAGE_HOOK].foodDrawColor === 'function',
        hasAutoHook: typeof win[PAGE_HOOK].auto === 'function',
        virusGradient: Boolean(win[PAGE_HOOK].virusGradient),
        foodGradient: Boolean(win[PAGE_HOOK].foodGradient),
      } : null,
      loaderStatus: { ...loaderStatus },
      state: {
        patchInstalled: state.patchInstalled,
        wrappedCallback: state.wrappedCallback,
        seenCacheScripts: state.seenCacheScripts,
        callbackCalls: state.callbackCalls,
        patchedChunks: state.patchedChunks,
        lastPatchResult: state.lastPatchResult,
        lastChangedPatchResult: state.lastChangedPatchResult,
        patchResults: state.patchResults.slice(-8),
        lastPatchTime: state.lastPatchTime,
        metricsRefreshes: state.metricsRefreshes,
        lastProfile: state.lastProfile,
        lastRuntimeRefresh: state.lastRuntimeRefresh,
        hits: { ...state.hits },
        lastVirus: state.lastVirus,
        lastPellet: state.lastPellet,
        lastIgnored: state.lastIgnored,
        errors: state.errors.slice(),
      },
    });

    win.blobCellColorsDebug = debug;
    win.__blobCellColorsDebug = debug;
    win.BlobioVirusPelletColorsDebug = debug;
    win.__blobVirusPelletColorsDebug = debug;
    win.blobCellColorsProfile = (durationMs) => startProfile(durationMs);
    win.__blobCellColorsProfile = win.blobCellColorsProfile;
    win.BlobioVirusPelletColorsProfile = win.blobCellColorsProfile;
  }

  function describeRenderTarget(target) {
    return {
      enabled: Boolean(target.enabled),
      mode: target.gradient ? 'gradient' : 'solid',
      solid: Boolean(target.solid),
      gradient: Boolean(target.gradient),
      hasSolidColor: Boolean(target.solidColor),
      hitKey: target.hitKey,
    };
  }

  function rememberError(error) {
    const message = error?.message || String(error);
    state.errors.push(message);
    state.errors = state.errors.slice(-8);
    win.console?.warn?.('[Blobio] Virus | Pellets Colors', message);
  }

  function getDrawColor(target, object, allowedType, alternateType = null) {
    const profile = activeProfile;
    const profileStart = profile ? nowMs() : 0;

    if (!object || !object.K) {
      state.hits.ignoredByType += 1;
      sampleIgnoredObject(object);
      if (profile) {
        recordProfileCall(profile, 'ignored', 'ignored', profileStart);
      }
      return object?.K;
    }

    if (!isAllowedObjectType(object, allowedType, alternateType)) {
      state.hits.ignoredByType += 1;
      sampleIgnoredObject(object);
      if (profile) {
        recordProfileCall(profile, target.hitKey, 'ignored', profileStart);
      }
      return object.K;
    }

    if (!target.enabled) {
      state.hits.disabled += 1;
      if (profile) {
        recordProfileCall(profile, target.hitKey, 'disabled', profileStart);
      }
      return object.K;
    }

    const gradient = target.gradient;
    const drawColor = gradient ? target.gradientScratch : target.solidColor;
    const amount = gradient ? setGradientGwtColor(drawColor, target.gradientColor, object) : null;
    recordColorHit(target, object, amount);
    if (profile) {
      recordProfileCall(profile, target.hitKey, gradient ? 'gradient' : 'solid', profileStart);
    }

    return drawColor;
  }

  function startProfile(durationMs) {
    if (activeProfile?.promise) {
      return activeProfile.promise;
    }

    const requested = Number(durationMs);
    const duration = Number.isFinite(requested) ? requested : 2000;
    const clampedDuration = Math.min(10000, Math.max(250, Math.round(duration)));
    const profile = {
      startedAt: nowMs(),
      durationMs: clampedDuration,
      startHits: { ...state.hits },
      startMetricsRefreshes: state.metricsRefreshes,
      targets: {
        pellets: createProfileBucket(),
        virus: createProfileBucket(),
        ignored: createProfileBucket(),
      },
      promise: null,
    };

    profile.promise = new Promise((resolve) => {
      win.setTimeout(() => {
        const summary = summarizeProfile(profile);
        if (activeProfile === profile) {
          activeProfile = null;
        }
        state.lastProfile = summary;
        resolve(summary);
      }, clampedDuration);
    });

    activeProfile = profile;
    return profile.promise;
  }

  function createProfileBucket() {
    return {
      calls: 0,
      gradient: 0,
      solid: 0,
      ignored: 0,
      disabled: 0,
      totalMs: 0,
      maxMs: 0,
    };
  }

  function recordProfileCall(profile, targetName, path, startedAt) {
    if (!profile) {
      return;
    }

    const bucket = profile.targets[targetName] || profile.targets.ignored;
    const elapsed = nowMs() - startedAt;
    bucket.calls += 1;
    bucket[path] = (bucket[path] || 0) + 1;
    bucket.totalMs += elapsed;
    bucket.maxMs = Math.max(bucket.maxMs, elapsed);
  }

  function summarizeProfile(profile) {
    const elapsed = Math.max(1, nowMs() - profile.startedAt);
    const hitDelta = {
      virus: state.hits.virus - (profile.startHits.virus || 0),
      pellets: state.hits.pellets - (profile.startHits.pellets || 0),
      ignoredByType: state.hits.ignoredByType - (profile.startHits.ignoredByType || 0),
      disabled: state.hits.disabled - (profile.startHits.disabled || 0),
    };

    return {
      durationMs: Math.round(elapsed),
      hitDelta,
      callsPerSecond: {
        virus: roundProfileNumber(hitDelta.virus / elapsed * 1000),
        pellets: roundProfileNumber(hitDelta.pellets / elapsed * 1000),
      },
      metricsRefreshes: state.metricsRefreshes - profile.startMetricsRefreshes,
      targets: {
        pellets: summarizeProfileBucket(profile.targets.pellets, elapsed),
        virus: summarizeProfileBucket(profile.targets.virus, elapsed),
        ignored: summarizeProfileBucket(profile.targets.ignored, elapsed),
      },
    };
  }

  function summarizeProfileBucket(bucket, elapsed) {
    return {
      calls: bucket.calls,
      callsPerSecond: roundProfileNumber(bucket.calls / elapsed * 1000),
      gradient: bucket.gradient,
      solid: bucket.solid,
      ignored: bucket.ignored,
      disabled: bucket.disabled,
      totalMs: roundProfileNumber(bucket.totalMs),
      avgMs: roundProfileNumber(bucket.calls ? bucket.totalMs / bucket.calls : 0),
      maxMs: roundProfileNumber(bucket.maxMs),
    };
  }

  function roundProfileNumber(value) {
    return Math.round(value * 1000) / 1000;
  }

  function nowMs() {
    return typeof win.performance?.now === 'function' ? win.performance.now() : Date.now();
  }

  function isAllowedObjectType(object, allowedType, alternateType) {
    if (allowedType === null) {
      return true;
    }

    const type = getObjectType(object);
    return type === allowedType || type === alternateType;
  }

  function getObjectType(object) {
    const type = object?.c?.M;
    if (typeof type === 'number') {
      return type;
    }
    const number = Number(type);
    return Number.isFinite(number) ? number : type;
  }

  function debugObject(object, color) {
    if (!object) {
      return null;
    }

    return {
      id: object.n,
      type: getObjectType(object),
      rawType: object.c?.M,
      x: object.R,
      y: object.S,
      size: object.N,
      color: color ? { ...color } : null,
      time: Date.now(),
    };
  }

  function sampleIgnoredObject(object) {
    if ((state.hits.ignoredByType & DEBUG_SAMPLE_MASK) === 0) {
      state.lastIgnored = debugObject(object, null);
    }
  }

  function setGradientGwtColor(target, gradient, object) {
    const metrics = getGradientMetrics();
    const x = object.R || 0;
    const y = object.S || 0;
    const projected = ((x - metrics.centerX) * gradient.cos + (y - metrics.centerY) * gradient.sin) * metrics.invLength + 0.5;
    const amount = projected < 0 ? 0 : projected > 1 ? 1 : projected;

    target.d = gradient.fromD + gradient.deltaD * amount;
    target.c = gradient.fromC + gradient.deltaC * amount;
    target.b = gradient.fromB + gradient.deltaB * amount;
    target.a = gradient.fromA + gradient.deltaA * amount;
    return amount;
  }

  function getGradientMetrics() {
    if (!gradientMetrics.canvas || (gradientMetrics.checks++ & METRICS_REFRESH_MASK) === 0) {
      refreshGradientMetrics();
    }
    return gradientMetrics;
  }

  function refreshGradientMetrics() {
    state.metricsRefreshes += 1;
    let canvas = gradientMetrics.canvas;
    if (!canvas || canvas.isConnected === false) {
      canvas = doc.querySelector?.('#embed-html canvas, canvas') || null;
      gradientMetrics.canvas = canvas;
    }

    const width = canvas && (canvas.width || canvas.clientWidth) || win.innerWidth || 1280;
    const height = canvas && (canvas.height || canvas.clientHeight) || win.innerHeight || 720;
    gradientMetrics.width = width;
    gradientMetrics.height = height;
    gradientMetrics.centerX = width / 2;
    gradientMetrics.centerY = height / 2;
    gradientMetrics.invLength = 1 / (Math.sqrt(width * width + height * height) || 1);
  }

  function recordColorHit(target, object, amount) {
    const hits = state.hits[target.hitKey] + 1;
    state.hits[target.hitKey] = hits;

    if ((hits & DEBUG_SAMPLE_MASK) !== 0) {
      return;
    }

    state[target.lastKey] = debugObject(object, amount === null
      ? runtimeColorToDebug(target.solidColor)
      : gradientColorToDebug(target.gradientColor, amount));
  }

  function runtimeColorToDebug(color) {
    return {
      r: color.r,
      g: color.g,
      b: color.blue,
      a: color.alpha,
    };
  }

  function gradientColorToDebug(gradient, amount) {
    return {
      r: Math.round((gradient.fromD + gradient.deltaD * amount) * 255),
      g: Math.round((gradient.fromC + gradient.deltaC * amount) * 255),
      b: Math.round((gradient.fromB + gradient.deltaB * amount) * 255),
      a: Math.round((gradient.fromA + gradient.deltaA * amount) * 100),
    };
  }

  function installGameScriptPatch() {
    const NodeCtor = win.Node;
    if (!NodeCtor?.prototype || NodeCtor.prototype.__blobCellColorPatchInstalled === RUNTIME_FIX_REVISION) {
      return;
    }

    const originalAppendChild = NodeCtor.prototype.appendChild;
    const originalInsertBefore = NodeCtor.prototype.insertBefore;

    NodeCtor.prototype.appendChild = function appendChildBlobCellColor(node) {
      if (shouldPatchScript(node)) {
        node.dataset.blobCellColorPatch = 'seen';
        state.seenCacheScripts += 1;
        installGwtCallbackPatch();
      }
      return originalAppendChild.call(this, node);
    };

    NodeCtor.prototype.insertBefore = function insertBeforeBlobCellColor(node, child) {
      if (shouldPatchScript(node)) {
        node.dataset.blobCellColorPatch = 'seen';
        state.seenCacheScripts += 1;
        installGwtCallbackPatch();
      }
      return originalInsertBefore.call(this, node, child);
    };

    NodeCtor.prototype.__blobCellColorPatchInstalled = RUNTIME_FIX_REVISION;
    state.patchInstalled = true;
    installGwtCallbackPatch();

    const callbackPatchTimer = win.setInterval?.(() => {
      if (installGwtCallbackPatch()) {
        win.clearInterval?.(callbackPatchTimer);
      }
    }, 10);
    win.setTimeout?.(() => {
      win.clearInterval?.(callbackPatchTimer);
    }, 30000);
  }

  function shouldPatchScript(node) {
    return node
      && node.tagName === 'SCRIPT'
      && node.src
      && !node.dataset.blobCellColorPatch
      && CACHE_SCRIPT_RE.test(node.src);
  }

  function installGwtCallbackPatch() {
    const html = win.html;
    if (!html
      || html.__blobCellColorsWrappedRevision === RUNTIME_FIX_REVISION
      || typeof html.onScriptDownloaded !== 'function') {
      return false;
    }

    const originalOnScriptDownloaded = html.onScriptDownloaded;
    html.onScriptDownloaded = function blobCellColorsOnScriptDownloaded(chunks) {
      state.callbackCalls += 1;
      let patchedChunks = chunks;
      try {
        patchedChunks = patchDownloadedChunks(chunks);
      } catch (error) {
        rememberError(error);
      }
      return originalOnScriptDownloaded.call(this, patchedChunks);
    };

    html.__blobCellColorsWrapped = true;
    html.__blobCellColorsWrappedRevision = RUNTIME_FIX_REVISION;
    state.wrappedCallback = true;
    return true;
  }

  function patchDownloadedChunks(chunks) {
    if (Array.isArray(chunks)) {
      return chunks.map(patchDownloadedChunk);
    }
    return patchDownloadedChunk(chunks);
  }

  function patchDownloadedChunk(chunk) {
    if (typeof chunk !== 'string') {
      return chunk;
    }

    const patched = patchGameCode(chunk);
    if (!patched.changed) {
      return chunk;
    }

    state.patchedChunks += 1;
    state.lastPatchTime = Date.now();
    return patched.code;
  }

  function patchGameCode(code) {
    let patched = code;
    let foodPatched = false;
    let foodPatchMode = 'none';
    const foodCaseSeen = patched.includes('case 2:case 5:case 0:');
    const foodDrawSeen = FOOD_DRAW_RE.test(patched);
    const foodAlphaSeen = FOOD_ALPHA_RE.test(patched);
    let virusPatched = false;
    let virusPatchMode = 'none';
    let fallbackFoodPatched = false;
    let fallbackVirusPatched = false;
    const exactVirusBranchSeen = VIRUS_BRANCH_RE.test(patched);
    const virusBranchSeen = exactVirusBranchSeen;

    if (!patched.includes('$wnd.__BlobCellColorizer.foodDrawColor(g)') && foodDrawSeen) {
      patched = patched.replace(FOOD_DRAW_RE, (match, setColor, drawRegion, foodTexture) => {
        foodPatched = true;
        foodPatchMode = 'draw-branch';
        return 'case 2:case 5:case 0:g.K.a=0.75;'
          + `if($wnd.__BlobCellColorizer&&$wnd.__BlobCellColorizer.foodEnabled&&g.c&&g.c.M==2){${setColor}(a.c,$wnd.__BlobCellColorizer.foodDrawColor(g))}`
          + `else{${setColor}(a.c,g.K)}`
          + `${drawRegion}(a.c,${foodTexture},g.R-g.M,g.S-g.M,g.N,g.N);`;
      });
    }

    if (!patched.includes('$wnd.__BlobCellColorizer.virusDrawColor(g)') && exactVirusBranchSeen) {
      patched = patched.replace(VIRUS_BRANCH_RE, (match, initDrawState, setColor, drawRegion, virusTexture) => {
        virusPatched = true;
        virusPatchMode = 'draw-branch';
        return 'case 4:case 3:'
          + `if($wnd.__BlobCellColorizer&&$wnd.__BlobCellColorizer.virusEnabled){${initDrawState}();${setColor}(a.c,$wnd.__BlobCellColorizer.virusDrawColor(g));${drawRegion}(a.c,${virusTexture},g.R-g.M,g.S-g.M,g.N,g.N)}`
          + `else if(g.q){if(g.P){h=g.P;${initDrawState}();${setColor}(a.c,g.K);${drawRegion}(a.c,h,g.R-g.M,g.S-g.M,g.N,g.N)}}`
          + `else{${initDrawState}();${setColor}(a.c,g.K);${drawRegion}(a.c,${virusTexture},g.R-g.M,g.S-g.M,g.N,g.N)}break;`;
      });
    }

    if (FALLBACK_RENDER_RE.test(patched)) {
      patched = patched.replace(FALLBACK_RENDER_RE, (match, fallbackName, initDrawState, setColor, drawRegion, defaultTexture) => {
        fallbackVirusPatched = true;
        fallbackFoodPatched = true;
        return `function ${fallbackName}(a,b){var c;if(b.c&&(b.c.M==4||b.c.M==3)&&$wnd.__BlobCellColorizer&&$wnd.__BlobCellColorizer.virusEnabled){${setColor}(a.c,$wnd.__BlobCellColorizer.virusDrawColor(b));${drawRegion}(a.c,${defaultTexture},b.R-b.M,b.S-b.M,b.N,b.N)}`
          + `else if(b.c&&b.c.M==2&&$wnd.__BlobCellColorizer&&$wnd.__BlobCellColorizer.foodEnabled){${setColor}(a.c,$wnd.__BlobCellColorizer.foodDrawColor(b));${drawRegion}(a.c,${defaultTexture},b.R-b.M,b.S-b.M,b.N,b.N)}`
          + `else if(b.q){c=b.P;${initDrawState}();${setColor}(a.c,b.K);${drawRegion}(a.c,c,b.R-b.M,b.S-b.M,b.N,b.N)}`
          + `else if(b.P){${setColor}(a.c,b.K);${drawRegion}(a.c,b.P,b.R-b.M,b.S-b.M,b.N,b.N)}`
          + `else{b.K.a=0.75;${setColor}(a.c,b.K);${drawRegion}(a.c,${defaultTexture},b.R-b.M,b.S-b.M,b.N,b.N)}}`;
      });
    }

    const result = {
      changed: foodPatched || virusPatched || fallbackFoodPatched || fallbackVirusPatched,
      patchRevision: RUNTIME_FIX_REVISION,
      autoHookPatched: false,
      foodCaseSeen,
      foodDrawSeen,
      foodAlphaSeen,
      foodPatched,
      foodPatchMode,
      fallbackFoodPatched,
      virusBranchSeen,
      exactVirusBranchSeen,
      virusAlphaSeen: false,
      virusCaseSeen: exactVirusBranchSeen,
      virusPatched,
      virusPatchMode,
      fallbackVirusPatched,
    };
    state.lastPatchResult = result;
    state.patchResults.push(result);
    state.patchResults = state.patchResults.slice(-12);
    if (result.changed) {
      state.lastChangedPatchResult = result;
    }

    return {
      code: patched,
      changed: result.changed,
    };
  }
}

function exposeDisabledDebug(win, settings, loaderStatus) {
  if (typeof win.blobCellColorsDebug === 'function') {
    return;
  }

  win.blobCellColorsDebug = () => ({
    enabled: false,
    patchRevision: RUNTIME_FIX_REVISION,
    settings,
    loaderStatus: { ...loaderStatus },
    commands: [
      'blobCellColorsDebug()',
      'BlobioVirusPelletColorsDebug()',
      'window.__blobVirusPelletColorsDebug()',
    ],
  });
  win.__blobCellColorsDebug = win.blobCellColorsDebug;
  win.BlobioVirusPelletColorsDebug = win.blobCellColorsDebug;
  win.__blobVirusPelletColorsDebug = win.blobCellColorsDebug;
}

function normalizeVirusPelletColorSettings(settings = {}) {
  const source = settings && typeof settings === 'object' ? settings : {};
  return {
    enabled: Boolean(source.enabled),
    virus: normalizeTargetSettings(source.virus, DEFAULT_SETTINGS.virus),
    pellets: normalizeTargetSettings(source.pellets, DEFAULT_SETTINGS.pellets),
  };
}

function normalizeTargetSettings(value, fallback) {
  const source = value && typeof value === 'object' ? value : {};
  const gradient = source.gradient && typeof source.gradient === 'object' ? source.gradient : {};

  return {
    enabled: source.enabled !== false,
    mode: source.mode === 'gradient' ? 'gradient' : 'solid',
    alpha: normalizeAlpha(source.alpha, fallback.alpha),
    solid: normalizeColor(source.solid, fallback.solid),
    gradient: {
      from: normalizeColor(gradient.from, fallback.gradient.from),
      to: normalizeColor(gradient.to, fallback.gradient.to),
      angle: normalizeAngle(gradient.angle, fallback.gradient.angle),
    },
  };
}

function normalizeColor(value, fallback) {
  const color = String(value || '').trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(color) ? color : fallback;
}

function normalizeAlpha(value, fallback) {
  const alpha = Number(value);
  return Number.isFinite(alpha) ? Math.max(0, Math.min(100, Math.round(alpha))) : fallback;
}

function normalizeAngle(value, fallback) {
  const angle = Number(value);
  if (!Number.isFinite(angle)) {
    return fallback;
  }
  return Math.max(0, Math.min(360, Math.round(angle)));
}
