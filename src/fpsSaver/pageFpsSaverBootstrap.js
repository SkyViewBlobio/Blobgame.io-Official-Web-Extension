const FPS_SAVER_VERSION = '0.1.2';
const FPS_SAVER_PAGE_HOOK = '__BlobPerfSaver';
const FPS_SAVER_RUNTIME_HOOK = '__BlobioFpsSaver';
const FPS_SAVER_STYLE_ID = 'blobio-fps-saver-style';
const FPS_SAVER_CACHE_SCRIPT_RE = /\/html\/[a-f0-9]{32}\.cache\.js(?:[?#].*)?$/i;
const FPS_SAVER_PARTICLE_LOOP_RE = /if\(!a\.c\|\|!g\|\|!g\.K\|\|!g\.c\)\{continue\}[A-Za-z_$][\w$]*\(g\);/;
const FPS_SAVER_FOOD_CASE_RE = /case 2:case 5:case 0:/;
const FPS_SAVER_WORK_CULL_HOOK = 'if($wnd.__BlobPerfSaver&&$wnd.__BlobPerfSaver.skipParticleWork(g)){continue;}';
const FPS_SAVER_DRAW_CULL_HOOK = 'if($wnd.__BlobPerfSaver&&$wnd.__BlobPerfSaver.skipParticleDraw(g)){break;}';
const FPS_SAVER_STALE_FRAME_CHECK_MASK = 255;

const FPS_SAVER_DEFAULT_SETTINGS = {
  liteMode: true,
  noTransitions: false,
  hiddenTab: true,
  hiddenFps: 2,
  gameOverlay: true,
  toastModalAnim: true,
  chatGuard: true,
  maxChatRows: 40,
  objectRenderer: true,
  foodCulling: true,
  foodLimit: 90,
  massCulling: true,
  massLimit: 900,
};

export function pageFpsSaverBootstrap(initialSettings = {}, pageWindow = globalThis) {
  const root = pageWindow || globalThis;
  const doc = root.document || globalThis.document;
  if (!doc?.documentElement) {
    return false;
  }

  const host = String(root.location?.hostname || globalThis.location?.hostname || '').toLowerCase();
  const isGameClient = host === 'custom.client.blobgame.io';
  const isMainPage = (host === 'blobgame.io' || host.endsWith('.blobgame.io')) && !isGameClient;
  const previousState = root.__blobioFpsSaverState;
  const state = previousState?.version === FPS_SAVER_VERSION
    ? previousState
    : createUpgradedState(root, previousState, initialSettings, isGameClient, isMainPage);
  state.settings = normalizeSettings(initialSettings);
  state.isGameClient = isGameClient;
  state.isMainPage = isMainPage;
  state.document = doc;
  root.__blobioFpsSaverState = state;

  exposeHooks(root, state);
  installStyle(doc);
  installRequestAnimationFrameHook(root, doc, state);
  installGameScriptPatch(root, state);
  applySettings(root, doc, state);
  onReady(doc, root, () => applySettings(root, doc, state));

  root.__blobioFpsSaverRefresh = (nextSettings = {}) => {
    state.settings = normalizeSettings(nextSettings);
    exposeHooks(root, state);
    applySettings(root, doc, state);
    return { ...state.settings };
  };

  root.BlobioFpsSaverDebug = () => buildDebug(root, doc, state);
  root.__BlobioFpsSaverDebug = root.BlobioFpsSaverDebug;
  root.__blobioFpsSaverInstalled = true;
  return true;
}

function createUpgradedState(root, previousState, settings, isGameClient, isMainPage) {
  const state = createState(settings, isGameClient, isMainPage);
  if (!previousState || typeof previousState !== 'object') {
    return state;
  }

  previousState.chatObserver?.disconnect?.();
  previousState.iframeObserver?.disconnect?.();
  if (previousState.chatRetryTimer) {
    root.clearInterval?.(previousState.chatRetryTimer);
  }

  // Older RAF wrappers close over their state. Leave that state inert so the
  // current version can safely wrap it without throttling hidden tabs twice.
  previousState.settings = {
    ...(previousState.settings || {}),
    liteMode: false,
    noTransitions: false,
    hiddenTab: false,
    gameOverlay: false,
    toastModalAnim: false,
    chatGuard: false,
  };

  state.installedAt = Number(previousState.installedAt) || state.installedAt;
  for (const key of Object.keys(state.counters)) {
    const previous = Number(previousState.counters?.[key]);
    if (Number.isFinite(previous) && previous >= 0) {
      state.counters[key] = previous;
    }
  }
  state.errors = Array.isArray(previousState.errors) ? previousState.errors.slice(-8) : [];
  return state;
}

function createState(settings, isGameClient, isMainPage) {
  const cleanSettings = normalizeSettings(settings);
  return {
    version: FPS_SAVER_VERSION,
    installedAt: Date.now(),
    settings: cleanSettings,
    isGameClient,
    isMainPage,
    rafHooked: false,
    scriptPatchInstalled: false,
    callbackWrapped: false,
    chatObserver: null,
    chatRetryTimer: null,
    iframeObserver: null,
    frameCull: {
      id: 0,
      startedAt: 0,
      firstParticle: null,
      foodSeen: 0,
      foodSkipped: 0,
      massSeen: 0,
      massSkipped: 0,
    },
    counters: {
      rafFrames: 0,
      hiddenFrames: 0,
      seenCacheScripts: 0,
      callbackCalls: 0,
      patchedChunks: 0,
      foodSeen: 0,
      foodSkipped: 0,
      massSeen: 0,
      massSkipped: 0,
      particleLoopResets: 0,
      chatTrimmed: 0,
    },
    patch: {
      lastPatchResult: null,
    },
    errors: [],
  };
}

function normalizeSettings(source = {}) {
  const data = source && typeof source === 'object' ? source : {};
  return {
    liteMode: boolSetting(data.liteMode, FPS_SAVER_DEFAULT_SETTINGS.liteMode),
    noTransitions: boolSetting(data.noTransitions, FPS_SAVER_DEFAULT_SETTINGS.noTransitions),
    hiddenTab: boolSetting(data.hiddenTab, FPS_SAVER_DEFAULT_SETTINGS.hiddenTab),
    hiddenFps: clampInteger(data.hiddenFps, 1, 10, FPS_SAVER_DEFAULT_SETTINGS.hiddenFps),
    gameOverlay: boolSetting(data.gameOverlay, FPS_SAVER_DEFAULT_SETTINGS.gameOverlay),
    toastModalAnim: boolSetting(data.toastModalAnim, FPS_SAVER_DEFAULT_SETTINGS.toastModalAnim),
    chatGuard: boolSetting(data.chatGuard, FPS_SAVER_DEFAULT_SETTINGS.chatGuard),
    maxChatRows: clampInteger(data.maxChatRows, 20, 120, FPS_SAVER_DEFAULT_SETTINGS.maxChatRows),
    objectRenderer: boolSetting(data.objectRenderer, FPS_SAVER_DEFAULT_SETTINGS.objectRenderer),
    foodCulling: boolSetting(data.foodCulling, FPS_SAVER_DEFAULT_SETTINGS.foodCulling),
    foodLimit: clampInteger(data.foodLimit, 0, 900, FPS_SAVER_DEFAULT_SETTINGS.foodLimit),
    massCulling: boolSetting(data.massCulling, FPS_SAVER_DEFAULT_SETTINGS.massCulling),
    massLimit: clampInteger(data.massLimit, 0, 900, FPS_SAVER_DEFAULT_SETTINGS.massLimit),
  };
}

function boolSetting(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
}

function clampInteger(value, min, max, fallback) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const number = Math.round(Number(value));
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function exposeHooks(root, state) {
  root[FPS_SAVER_PAGE_HOOK] = {
    version: FPS_SAVER_VERSION,
    settings: state.settings,
    beginFrame: (timestamp) => beginRenderFrame(root, state, timestamp),
    skipParticle: (object) => skipParticleWork(root, state, object),
    skipParticleWork: (object) => skipParticleWork(root, state, object),
    skipParticleDraw: (object) => skipParticleWork(root, state, object),
    debug: () => buildDebug(root, state.document, state),
  };
  root[FPS_SAVER_RUNTIME_HOOK] = root[FPS_SAVER_PAGE_HOOK];
}

function installRequestAnimationFrameHook(root, doc, state) {
  const installedVersion = root.__blobioFpsSaverRafHookedVersion
    || root.requestAnimationFrame?.__blobioFpsSaverRafHookedVersion;
  if (installedVersion === FPS_SAVER_VERSION || typeof root.requestAnimationFrame !== 'function') {
    state.rafHooked = installedVersion === FPS_SAVER_VERSION;
    return;
  }

  const previousRaf = root.requestAnimationFrame;
  const previousCancel = root.cancelAnimationFrame;
  const nativeRaf = previousRaf.bind(root);
  const nativeCancel = typeof root.cancelAnimationFrame === 'function'
    ? previousCancel.bind(root)
    : null;
  const handles = new Map();
  let nextId = -1;
  let lastHiddenTs = 0;

  const wrappedRaf = function blobioFpsSaverRequestAnimationFrame(callback) {
    if (typeof callback !== 'function') {
      return nativeRaf(callback);
    }

    const id = nextId--;
    const handle = { active: true, nativeId: 0 };

    const tick = (timestamp) => {
      if (!handle.active) {
        return;
      }

      if (state.settings.hiddenTab && doc.hidden) {
        const hiddenDelay = 1000 / Math.max(1, state.settings.hiddenFps);
        if (lastHiddenTs && timestamp - lastHiddenTs < hiddenDelay) {
          handle.nativeId = nativeRaf(tick);
          return;
        }
        lastHiddenTs = timestamp;
        state.counters.hiddenFrames += 1;
      }

      handles.delete(id);
      state.counters.rafFrames += 1;
      beginRenderFrame(root, state, timestamp);
      callback.call(root, timestamp);
    };

    handle.nativeId = nativeRaf(tick);
    handles.set(id, handle);
    return id;
  };

  const wrappedCancel = function blobioFpsSaverCancelAnimationFrame(id) {
    const handle = handles.get(id);
    if (handle) {
      handle.active = false;
      handles.delete(id);
      nativeCancel?.(handle.nativeId);
      return;
    }
    nativeCancel?.(id);
  };

  wrappedRaf.__blobioFpsSaverRafHookedVersion = FPS_SAVER_VERSION;
  wrappedRaf.__blobioFpsSaverOriginal = previousRaf;
  wrappedCancel.__blobioFpsSaverRafHookedVersion = FPS_SAVER_VERSION;
  wrappedCancel.__blobioFpsSaverOriginal = previousCancel;
  root.requestAnimationFrame = wrappedRaf;
  root.cancelAnimationFrame = wrappedCancel;

  root.__blobioFpsSaverRafHooked = true;
  root.__blobioFpsSaverRafHookedVersion = FPS_SAVER_VERSION;
  state.rafHooked = true;
}

function beginRenderFrame(root, state, timestamp, force = false) {
  const frame = state.frameCull;
  const startedAt = Number(timestamp) || now(root);
  if (!force && frame.startedAt === startedAt) {
    return;
  }

  flushCullCounters(state);
  frame.id += 1;
  frame.startedAt = startedAt;
  frame.firstParticle = null;
  frame.foodSeen = 0;
  frame.foodSkipped = 0;
  frame.massSeen = 0;
  frame.massSkipped = 0;
}

function flushCullCounters(state) {
  const frame = state.frameCull;
  const counters = state.counters;
  counters.foodSeen += frame.foodSeen;
  counters.foodSkipped += frame.foodSkipped;
  counters.massSeen += frame.massSeen;
  counters.massSkipped += frame.massSkipped;
}

function skipParticleWork(root, state, object) {
  const settings = state.settings;
  if (!settings.objectRenderer) {
    return false;
  }

  const type = object?.c?.M;
  const isFood = type === 2;
  if (isFood ? !settings.foodCulling : (type !== 5 && type !== 0) || !settings.massCulling) {
    return false;
  }

  if (!state.frameCull.startedAt) {
    beginRenderFrame(root, state);
  }
  const frame = state.frameCull;
  const seen = frame.foodSeen + frame.massSeen;
  if (seen > 0 && (seen & FPS_SAVER_STALE_FRAME_CHECK_MASK) === 0) {
    const current = now(root);
    if (current - frame.startedAt > 250) {
      beginRenderFrame(root, state, current, true);
    }
  }
  syncParticleLoopFrame(root, state, object);

  if (isFood) {
    frame.foodSeen += 1;

    if (frame.foodSeen <= settings.foodLimit) {
      return false;
    }

    frame.foodSkipped += 1;
    return true;
  }

  frame.massSeen += 1;

  if (frame.massSeen <= settings.massLimit) {
    return false;
  }

  frame.massSkipped += 1;
  return true;
}

function syncParticleLoopFrame(root, state, object) {
  if (!object || (typeof object !== 'object' && typeof object !== 'function')) {
    return;
  }

  const frame = state.frameCull;
  if (!frame.firstParticle) {
    frame.firstParticle = object;
    return;
  }

  if (object === frame.firstParticle && frame.foodSeen + frame.massSeen > 0) {
    beginRenderFrame(root, state, now(root), true);
    state.counters.particleLoopResets += 1;
    state.frameCull.firstParticle = object;
  }
}

function installGameScriptPatch(root, state) {
  if (!state.isGameClient) {
    return;
  }

  const NodeCtor = root.Node || globalThis.Node;
  if (!NodeCtor?.prototype
    || NodeCtor.prototype.__blobioFpsSaverScriptPatchVersion === FPS_SAVER_VERSION) {
    installGwtCallbackPatch(root, state);
    return;
  }

  const originalAppendChild = NodeCtor.prototype.appendChild;
  const originalInsertBefore = NodeCtor.prototype.insertBefore;

  NodeCtor.prototype.appendChild = function blobioFpsSaverAppendChild(node) {
    if (shouldWatchScript(node)) {
      node.dataset.blobioFpsSaverScriptPatch = 'seen';
      state.counters.seenCacheScripts += 1;
      installGwtCallbackPatch(root, state);
    }
    return originalAppendChild.call(this, node);
  };

  NodeCtor.prototype.insertBefore = function blobioFpsSaverInsertBefore(node, child) {
    if (shouldWatchScript(node)) {
      node.dataset.blobioFpsSaverScriptPatch = 'seen';
      state.counters.seenCacheScripts += 1;
      installGwtCallbackPatch(root, state);
    }
    return originalInsertBefore.call(this, node, child);
  };

  NodeCtor.prototype.__blobioFpsSaverScriptPatchInstalled = true;
  NodeCtor.prototype.__blobioFpsSaverScriptPatchVersion = FPS_SAVER_VERSION;
  state.scriptPatchInstalled = true;

  installGwtCallbackPatch(root, state);
  const timer = root.setInterval?.(() => {
    if (installGwtCallbackPatch(root, state)) {
      root.clearInterval?.(timer);
    }
  }, 10);
  root.setTimeout?.(() => root.clearInterval?.(timer), 30000);
}

function shouldWatchScript(node) {
  return node
    && node.tagName === 'SCRIPT'
    && node.src
    && node.dataset
    && !node.dataset.blobioFpsSaverScriptPatch
    && FPS_SAVER_CACHE_SCRIPT_RE.test(node.src);
}

function installGwtCallbackPatch(root, state) {
  const html = root.html;
  const installedVersion = html?.__blobioFpsSaverCallbackWrappedVersion
    || html?.onScriptDownloaded?.__blobioFpsSaverCallbackWrappedVersion;
  if (!html || installedVersion === FPS_SAVER_VERSION || typeof html.onScriptDownloaded !== 'function') {
    state.callbackWrapped = installedVersion === FPS_SAVER_VERSION;
    return state.callbackWrapped;
  }

  const original = html.onScriptDownloaded;
  const wrapped = function blobioFpsSaverOnScriptDownloaded(chunks) {
    state.counters.callbackCalls += 1;
    let patchedChunks = chunks;

    try {
      patchedChunks = Array.isArray(chunks)
        ? chunks.map((chunk) => patchDownloadedChunk(chunk, state))
        : patchDownloadedChunk(chunks, state);
    } catch (error) {
      rememberError(state, error);
    }

    return original.call(this, patchedChunks);
  };

  wrapped.__blobioFpsSaverCallbackWrappedVersion = FPS_SAVER_VERSION;
  wrapped.__blobioFpsSaverOriginal = original;
  html.onScriptDownloaded = wrapped;
  html.__blobioFpsSaverCallbackWrapped = true;
  html.__blobioFpsSaverCallbackWrappedVersion = FPS_SAVER_VERSION;
  state.callbackWrapped = true;
  return true;
}

function patchDownloadedChunk(chunk, state) {
  if (typeof chunk !== 'string') {
    return chunk;
  }

  const result = patchGameCode(chunk);
  state.patch.lastPatchResult = result.result;
  if (!result.changed) {
    return chunk;
  }

  state.counters.patchedChunks += 1;
  return result.code;
}

function patchGameCode(code) {
  if (typeof code !== 'string') {
    return { code, changed: false, result: null };
  }

  const loopSeen = FPS_SAVER_PARTICLE_LOOP_RE.test(code);
  const caseSeen = FPS_SAVER_FOOD_CASE_RE.test(code);
  const workAlreadyPatched = code.includes('$wnd.__BlobPerfSaver.skipParticleWork(g)');
  const drawAlreadyPatched = code.includes('$wnd.__BlobPerfSaver.skipParticleDraw(g)')
    || code.includes('$wnd.__BlobPerfSaver.skipParticle(g)');
  let patched = code;

  if (loopSeen && !workAlreadyPatched) {
    patched = patched.replace(FPS_SAVER_PARTICLE_LOOP_RE, (match) => match.replace(
      /([A-Za-z_$][\w$]*\(g\);)$/,
      `${FPS_SAVER_WORK_CULL_HOOK}$1`,
    ));
  }

  if (!patched.includes('$wnd.__BlobPerfSaver.skipParticleWork(g)') && caseSeen && !drawAlreadyPatched) {
    patched = patched.replace(FPS_SAVER_FOOD_CASE_RE, (match) => `${match}${FPS_SAVER_DRAW_CULL_HOOK}`);
  }

  const result = {
    changed: patched !== code,
    particleLoopSeen: loopSeen,
    foodAndMassCaseSeen: caseSeen,
    earlyCullHookInstalled: patched.includes('$wnd.__BlobPerfSaver.skipParticleWork(g)'),
    drawCullHookInstalled: patched.includes('$wnd.__BlobPerfSaver.skipParticleDraw(g)')
      || patched.includes('$wnd.__BlobPerfSaver.skipParticle(g)'),
  };

  return {
    code: patched,
    changed: result.changed,
    result,
  };
}

function installStyle(doc) {
  if (doc.getElementById?.(FPS_SAVER_STYLE_ID)) {
    return;
  }

  const style = doc.createElement('style');
  style.id = FPS_SAVER_STYLE_ID;
  style.textContent = `
html.blobio-fps-saver-no-transitions *,
html.blobio-fps-saver-no-transitions *::before,
html.blobio-fps-saver-no-transitions *::after {
  animation: none !important;
  transition: none !important;
  scroll-behavior: auto !important;
}

html.blobio-fps-saver-main-lite body > div,
html.blobio-fps-saver-main-lite body > main,
html.blobio-fps-saver-main-lite body > section,
html.blobio-fps-saver-main-lite iframe {
  contain: layout paint style;
}

html.blobio-fps-saver-main-lite iframe {
  content-visibility: auto;
  contain-intrinsic-size: 360px 240px;
}

html.blobio-fps-saver-overlay-contain #chat-wrapper,
html.blobio-fps-saver-overlay-contain #chat,
html.blobio-fps-saver-overlay-contain #leader-board,
html.blobio-fps-saver-overlay-contain #leader-board-wrapper,
html.blobio-fps-saver-overlay-contain #score-wrapper,
html.blobio-fps-saver-overlay-contain #toast,
html.blobio-fps-saver-overlay-contain #mouseMenu,
html.blobio-fps-saver-overlay-contain #aslist-outer,
html.blobio-fps-saver-overlay-contain #plist-outer,
html.blobio-fps-saver-overlay-contain #rlist-outer,
html.blobio-fps-saver-overlay-contain .swal2-container {
  contain: layout paint style;
}

html.blobio-fps-saver-toast-lite #toast,
html.blobio-fps-saver-toast-lite .toast,
html.blobio-fps-saver-toast-lite .toast *,
html.blobio-fps-saver-toast-lite .swal2-popup,
html.blobio-fps-saver-toast-lite .swal2-backdrop-show,
html.blobio-fps-saver-toast-lite .swal2-show,
html.blobio-fps-saver-toast-lite .swal2-hide {
  animation: none !important;
  transition: none !important;
}
`;
  (doc.head || doc.documentElement).appendChild(style);
}

function applySettings(root, doc, state) {
  const html = doc.documentElement;
  if (!html) {
    return;
  }

  toggleClass(html, 'blobio-fps-saver-no-transitions', state.settings.noTransitions);
  toggleClass(html, 'blobio-fps-saver-main-lite', state.settings.liteMode && state.isMainPage);
  toggleClass(html, 'blobio-fps-saver-overlay-contain', state.settings.gameOverlay && state.isGameClient);
  toggleClass(html, 'blobio-fps-saver-toast-lite', state.settings.toastModalAnim);

  installChatGuard(root, doc, state);
  optimizeMainPageIframes(root, doc, state);
  exposeHooks(root, state);
}

function optimizeMainPageIframes(root, doc, state) {
  if (!state.isMainPage || !state.settings.liteMode || !doc.querySelectorAll) {
    disconnectIframeObserver(state);
    return;
  }

  const applyIframeHints = () => {
    for (const frame of doc.querySelectorAll('iframe') || []) {
      frame.loading = 'lazy';
      frame.style.contain = 'layout paint style';
      frame.style.contentVisibility = 'auto';
      frame.style.containIntrinsicSize = '360px 240px';
    }
  };

  applyIframeHints();

  if (!state.iframeObserver && typeof root.MutationObserver === 'function' && doc.body) {
    state.iframeObserver = new root.MutationObserver(() => {
      scheduleFrame(root, applyIframeHints);
    });
    state.iframeObserver.observe(doc.body, { childList: true, subtree: true });
  }
}

function disconnectIframeObserver(state) {
  state.iframeObserver?.disconnect?.();
  state.iframeObserver = null;
}

function installChatGuard(root, doc, state) {
  if (!state.isGameClient || !state.settings.chatGuard || typeof root.MutationObserver !== 'function') {
    disconnectChatGuard(root, state);
    return;
  }

  const chat = doc.getElementById?.('chat');
  if (!chat) {
    if (!state.chatRetryTimer && doc.body) {
      state.chatRetryTimer = root.setInterval?.(() => {
        if (doc.getElementById?.('chat')) {
          root.clearInterval?.(state.chatRetryTimer);
          state.chatRetryTimer = null;
          installChatGuard(root, doc, state);
        }
      }, 1000) || null;
      root.setTimeout?.(() => {
        if (state.chatRetryTimer) {
          root.clearInterval?.(state.chatRetryTimer);
          state.chatRetryTimer = null;
        }
      }, 30000);
    }
    return;
  }

  if (state.chatObserver) {
    trimChat(chat, state);
    return;
  }

  let cleanupScheduled = false;
  state.chatObserver = new root.MutationObserver(() => {
    if (cleanupScheduled) {
      return;
    }
    cleanupScheduled = true;
    scheduleFrame(root, () => {
      cleanupScheduled = false;
      if (!state.settings.chatGuard || !state.chatObserver) return;
      trimChat(chat, state);
    });
  });
  state.chatObserver.observe(chat, { childList: true, subtree: true });
  trimChat(chat, state);
}

function trimChat(chat, state) {
  // Smooth chat wraps messages in a list; keep the wrapper and its handlers intact.
  const list = chat.querySelector?.('ul') || chat;
  const max = state.settings.maxChatRows;
  let removed = 0;
  while (list.children && list.children.length > max) {
    list.removeChild(list.firstElementChild || list.firstChild);
    removed += 1;
  }
  state.counters.chatTrimmed += removed;
}

function disconnectChatGuard(root, state) {
  state.chatObserver?.disconnect?.();
  state.chatObserver = null;
  if (state.chatRetryTimer) {
    root.clearInterval?.(state.chatRetryTimer);
    state.chatRetryTimer = null;
  }
}

function onReady(doc, root, callback) {
  if (doc.readyState === 'loading') {
    doc.addEventListener?.('DOMContentLoaded', callback, { once: true });
    return;
  }
  root.setTimeout?.(callback, 0);
}

function scheduleFrame(root, callback) {
  if (typeof root.requestAnimationFrame === 'function') {
    root.requestAnimationFrame(callback);
    return;
  }
  root.setTimeout?.(callback, 16);
}

function toggleClass(node, className, enabled) {
  if (enabled) {
    node.classList?.add?.(className);
  } else {
    node.classList?.remove?.(className);
  }
}

function now(root) {
  return Number(root.performance?.now?.()) || Date.now();
}

function rememberError(state, error) {
  const message = error?.message || String(error);
  state.errors.push({ message, at: Date.now() });
  state.errors = state.errors.slice(-8);
}

function buildDebug(root, doc, state) {
  const counters = state.counters;
  const frame = state.frameCull;
  return {
    installed: Boolean(root.__blobioFpsSaverInstalled),
    version: FPS_SAVER_VERSION,
    url: String(root.location?.href || ''),
    uptimeMs: Date.now() - state.installedAt,
    isGameClient: state.isGameClient,
    isMainPage: state.isMainPage,
    settings: { ...state.settings },
    counters: {
      ...counters,
      foodSeen: counters.foodSeen + frame.foodSeen,
      foodSkipped: counters.foodSkipped + frame.foodSkipped,
      massSeen: counters.massSeen + frame.massSeen,
      massSkipped: counters.massSkipped + frame.massSkipped,
    },
    frameCull: frameCullDebug(state.frameCull),
    patch: {
      scriptPatchInstalled: state.scriptPatchInstalled,
      callbackWrapped: state.callbackWrapped,
      lastPatchResult: state.patch.lastPatchResult,
    },
    dom: {
      noTransitions: Boolean(doc?.documentElement?.classList?.contains?.('blobio-fps-saver-no-transitions')),
      mainLite: Boolean(doc?.documentElement?.classList?.contains?.('blobio-fps-saver-main-lite')),
      overlayContain: Boolean(doc?.documentElement?.classList?.contains?.('blobio-fps-saver-overlay-contain')),
      toastLite: Boolean(doc?.documentElement?.classList?.contains?.('blobio-fps-saver-toast-lite')),
      chatRows: Number((doc?.getElementById?.('chat')?.querySelector?.('ul') || doc?.getElementById?.('chat'))?.children?.length) || 0,
    },
    errors: state.errors.slice(),
  };
}

function frameCullDebug(frame) {
  const { firstParticle, ...debug } = frame || {};
  return {
    ...debug,
    passTracking: Boolean(firstParticle),
  };
}

pageFpsSaverBootstrap.__test = {
  normalizeSettings,
  patchGameCode,
};
