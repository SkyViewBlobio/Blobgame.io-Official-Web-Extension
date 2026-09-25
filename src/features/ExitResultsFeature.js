import { EXIT_RESULTS_CSS, EXIT_RESULTS_STYLE_ID } from '../css/ExitResultsStyles.js';
import { getTampermonkeyPageWindow } from '../runtimePageWindow.js';
import { createBlobioStorage } from '../storage/BlobioStorage.js';
import { gainedExperience, hasObservedExitUpdates, loadExitProfile, loadServerRecordId, recordForMode } from './ExitResultsData.js';

const NUMBER_FORMAT = new Intl.NumberFormat('en-US');
const XP_CHIP_HOLD_MS = 5000;

export class ExitResultsFeature {
  constructor({ document = globalThis.document, storage = createBlobioStorage(document), starUrl } = {}) {
    this.document = document;
    this.window = document.defaultView;
    this.pageWindow = getTampermonkeyPageWindow(this.window);
    this.storage = storage;
    this.starUrl = starUrl;
    this.timers = new Set();
    this.frames = new Set();
    this.request = null;
    this.runId = 0;
    this.before = null;
    this.visible = null;
  }

  start() {
    if (this.root) return true;
    this.style = this.document.createElement('style');
    this.style.id = EXIT_RESULTS_STYLE_ID;
    this.style.textContent = EXIT_RESULTS_CSS;
    this.document.head.appendChild(this.style);
    this.pageObserver = new this.window.MutationObserver(() => this.attach());
    this.pageObserver.observe(this.document.documentElement, { childList: true, subtree: true });
    this.attach();
    return true;
  }

  attach() {
    const root = this.document.getElementById('exit-dialog');
    if (!root || this.root) return;
    this.pageObserver.disconnect();
    this.root = root;
    this.originalScore = root.querySelector('#score-wrapper')?.parentElement;
    this.buttons = [root.querySelector('button[onclick]'), root.querySelector('#restart-game')];
    this.originalScore?.classList.add('blobio-exit-original-score');

    const content = this.document.createElement('section');
    content.className = 'blobio-exit-content';
    content.innerHTML = `
      <h2 class="blobio-exit-title">Game Results</h2>
      <div class="blobio-exit-stats">
        <div class="blobio-exit-row">Your highest mass score: <span class="blobio-exit-value">0</span></div>
        <div class="blobio-exit-row">Experienced collected: <span class="blobio-exit-value">—</span></div>
        <div class="blobio-exit-row"><span class="blobio-exit-record-label">Personal high-score in this mode: </span><span class="blobio-exit-value">—</span></div>
      </div>
      <div class="blobio-exit-progress" role="progressbar" aria-label="Level experience">
        <div class="blobio-exit-progress-fill"></div>
        <div class="blobio-exit-progress-label">XP unavailable</div>
        <div class="blobio-exit-xp-chip"></div>
        <div class="blobio-exit-level"><img alt="" src="${this.starUrl}"><span>—</span></div>
      </div>
      <div class="blobio-exit-actions"></div>
    `;
    root.insertBefore(content, root.querySelector('#blobgame-io_multisize'));
    this.content = content;
    this.rows = [...content.querySelectorAll('.blobio-exit-row')];
    this.values = [...content.querySelectorAll('.blobio-exit-value')];
    this.level = content.querySelector('.blobio-exit-level span');
    this.fill = content.querySelector('.blobio-exit-progress-fill');
    this.progress = content.querySelector('.blobio-exit-progress');
    this.progressLabel = content.querySelector('.blobio-exit-progress-label');
    this.chip = content.querySelector('.blobio-exit-xp-chip');
    this.recordLabel = content.querySelector('.blobio-exit-record-label');
    this.buttons.forEach(button => { if (button) content.querySelector('.blobio-exit-actions').appendChild(button); });
    root.classList.add('blobio-exit-results');
    this.visibilityObserver = new this.window.MutationObserver(() => this.syncVisibility());
    this.visibilityObserver.observe(root, { attributes: true, attributeFilter: ['style'] });
    this.syncVisibility();
  }

  syncVisibility() {
    const visible = this.window.getComputedStyle(this.root).display !== 'none';
    if (visible === this.visible) return;
    this.visible = visible;
    this.runId++;
    this.request?.abort();
    this.request = null;
    this.clearAnimation();
    if (visible) this.showResults(this.runId);
    else this.snapshotBeforeRun();
  }

  async snapshotBeforeRun() {
    const runId = this.runId;
    const token = this.storage.getItem('access-token');
    const request = new this.window.AbortController();
    this.request = request;
    this.before = null;
    try {
      const profile = await loadExitProfile({ fetch: this.window.fetch.bind(this.window), token, signal: request.signal });
      if (runId === this.runId && !request.signal.aborted) this.before = profile;
    } catch {
      if (runId === this.runId) this.before = null;
    } finally {
      if (this.request === request) this.request = null;
    }
  }

  async showResults(runId) {
    const scoreText = this.document.getElementById('score-wrapper')?.textContent?.trim();
    const score = scoreText ? Number(scoreText) : NaN;
    const peakScore = Number(this.pageWindow.__BlobioHudInfoPeakScore);
    let safeScore = Number.isFinite(score) && score >= 0 ? score : null;
    if (Number.isFinite(peakScore) && peakScore >= 0) {
      safeScore = Math.max(safeScore ?? 0, peakScore);
    }
    const before = this.before;
    const token = this.storage.getItem('access-token');
    const address = new URLSearchParams(this.window.location.search).get('ip')
      || `${this.storage.getItem('config-ip')}:${this.storage.getItem('config-port')}`;
    this.beginResults(safeScore, before);
    const request = new this.window.AbortController();
    this.request = request;
    const fetch = this.window.fetch.bind(this.window);
    const modeRequest = loadServerRecordId({ fetch, address, signal: request.signal }).catch(() => null);
    const modeId = await modeRequest;
    if (runId !== this.runId || request.signal.aborted) return;
    let after = null;
    if (token) {
      let observedUpdates = false;
      let lastProfile = null;
      let successfulResponses = 0;
      const attempts = before ? 7 : 1;
      for (let attempt = 0; attempt < attempts; attempt++) {
        try {
          after = await loadExitProfile({ fetch, token, signal: request.signal });
        } catch {
          after = null;
        }
        if (runId !== this.runId || request.signal.aborted) return;
        if (after && (!before || after.id === before.id)) {
          lastProfile = after;
          successfulResponses++;
        } else {
          after = null;
        }
        observedUpdates = hasObservedExitUpdates(before, after, modeId, safeScore);
        if (observedUpdates) break;
        if (attempt < attempts - 1) await new Promise(resolve => this.window.setTimeout(resolve, 650));
      }
      if (!observedUpdates) after = successfulResponses >= (attempts === 1 ? 1 : 3) ? lastProfile : null;
    }
    if (this.request === request) this.request = null;
    if (runId !== this.runId) return;
    const oldRecord = recordForMode(before, modeId);
    const newRecord = recordForMode(after, modeId);
    const recordPending = safeScore != null && oldRecord != null && safeScore > oldRecord
      && (newRecord == null || newRecord < safeScore);
    const isRecord = safeScore != null && oldRecord != null && newRecord != null
      && safeScore > oldRecord && newRecord >= safeScore;
    const gained = gainedExperience(before, after);
    this.finishResults({
      gained,
      record: recordPending ? null : newRecord,
      previousXp: before?.cur_exp,
      previousLimit: before?.next_lvl_exp,
      previousLevel: before?.lvl,
      currentXp: after?.cur_exp,
      nextXp: after?.next_lvl_exp,
      level: after?.lvl,
      isRecord,
    });
  }

  schedule(callback, delay) {
    const timer = this.window.setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, delay);
    this.timers.add(timer);
  }

  clearAnimation() {
    this.timers.forEach(timer => this.window.clearTimeout(timer));
    this.frames.forEach(frame => this.window.cancelAnimationFrame(frame));
    this.timers.clear();
    this.frames.clear();
  }

  count(element, value, delay, from = 0, limit = null) {
    if (value == null || !Number.isFinite(Number(value))) {
      element.textContent = 'Unavailable';
      return;
    }
    const target = Math.max(0, Math.round(Number(value)));
    const initial = Math.max(0, Math.round(Number(from)));
    const format = amount => limit == null
      ? NUMBER_FORMAT.format(amount)
      : `${NUMBER_FORMAT.format(amount)} / ${NUMBER_FORMAT.format(Number(limit))} XP`;
    element.textContent = format(initial);
    if (target === initial) return;
    this.schedule(() => {
      const start = this.window.performance.now();
      let displayed = initial;
      let frame;
      const tick = now => {
        this.frames.delete(frame);
        const fraction = Math.min(1, (now - start) / 950);
        const eased = 1 - Math.pow(1 - fraction, 3);
        const amount = Math.round(initial + (target - initial) * eased);
        if (amount !== displayed) {
          displayed = amount;
          element.textContent = format(amount);
        }
        if (fraction < 1) {
          frame = this.window.requestAnimationFrame(tick);
          this.frames.add(frame);
        } else {
          element.classList.add('is-bumped');
        }
      };
      frame = this.window.requestAnimationFrame(tick);
      this.frames.add(frame);
    }, delay);
  }

  beginResults(score, before) {
    this.clearAnimation();
    this.resultsStartedAt = this.window.performance.now();
    this.rows.forEach(row => row.classList.remove('is-shown', 'is-record'));
    this.values.forEach(value => value.classList.remove('is-bumped'));
    this.values.forEach(value => { value.textContent = '0'; });
    this.chip.classList.remove('is-visible', 'is-moving');
    this.level.parentElement.classList.remove('is-level-up');
    this.recordLabel.textContent = 'Personal high-score in this mode: ';
    this.level.textContent = before?.lvl != null ? String(before.lvl) : '—';
    this.fill.style.transition = 'none';
    this.fill.style.width = '0%';
    this.progressLabel.textContent = 'Checking XP…';
    this.progress.removeAttribute('aria-valuenow');
    if (before?.next_lvl_exp > 0) {
      this.fill.style.width = `${Math.max(0, Math.min(100, before.cur_exp / before.next_lvl_exp * 100))}%`;
      this.progressLabel.textContent = `${NUMBER_FORMAT.format(before.cur_exp)} / ${NUMBER_FORMAT.format(before.next_lvl_exp)} XP`;
    }
    this.rows.forEach((row, index) => {
      const delay = index * 390;
      this.schedule(() => row.classList.add('is-shown'), delay);
    });
    this.count(this.values[0], score, 500);
  }

  finishResults({ gained, record, previousXp, previousLimit, previousLevel, currentXp, nextXp, level, isRecord }) {
    const elapsed = this.window.performance.now() - this.resultsStartedAt;
    const xpDelay = Math.max(0, 890 - elapsed);
    const recordDelay = Math.max(0, 1280 - elapsed);
    this.count(this.values[1], gained, xpDelay);
    this.count(this.values[2], record, recordDelay);
    this.recordLabel.textContent = isRecord
      ? 'Congrats! you cracked your high-score: '
      : 'Personal high-score in this mode: ';
    this.rows[2].classList.toggle('is-record', isRecord);
    this.level.textContent = level != null && Number.isFinite(Number(level)) ? String(level) : '—';

    if (currentXp == null || nextXp == null || Number(nextXp) <= 0) {
      this.fill.style.width = '0%';
      this.progressLabel.textContent = 'XP unavailable';
      return;
    }
    const oldProgress = Math.max(0, Math.min(100, Number(previousXp) / Number(previousLimit) * 100));
    const newProgress = Math.max(0, Math.min(100, Number(currentXp) / Number(nextXp) * 100));
    if (gained == null || previousXp == null || previousLimit == null) {
      this.fill.style.width = `${newProgress}%`;
      this.progressLabel.textContent = `${NUMBER_FORMAT.format(Number(currentXp))} / ${NUMBER_FORMAT.format(Number(nextXp))} XP`;
      this.progress.setAttribute('aria-valuenow', String(currentXp));
      this.progress.setAttribute('aria-valuemax', String(nextXp));
      return;
    }
    this.fill.style.width = `${oldProgress}%`;
    this.progressLabel.textContent = `${NUMBER_FORMAT.format(Number(previousXp))} / ${NUMBER_FORMAT.format(Number(previousLimit))} XP`;
    this.progress.setAttribute('aria-valuenow', String(previousXp));
    this.progress.setAttribute('aria-valuemax', String(previousLimit));
    if (gained <= 0) return;
    this.chip.textContent = `XP +${NUMBER_FORMAT.format(gained)}`;
    const chipDelay = xpDelay + 1050;
    const barDelay = chipDelay + XP_CHIP_HOLD_MS + 700;
    const levelChanged = previousLevel != null && level != null && Number(previousLevel) !== Number(level);
    if (levelChanged) this.level.textContent = String(previousLevel);
    this.schedule(() => this.chip.classList.add('is-visible'), chipDelay);
    this.schedule(() => this.chip.classList.add('is-moving'), chipDelay + XP_CHIP_HOLD_MS);
    this.schedule(() => {
      this.fill.style.transition = 'width 700ms cubic-bezier(.2, .8, .2, 1)';
      this.fill.style.width = levelChanged ? '100%' : `${newProgress}%`;
      if (!levelChanged) this.count(this.progressLabel, currentXp, 0, previousXp, nextXp);
    }, barDelay);
    this.schedule(() => {
      if (levelChanged) {
        this.level.textContent = String(level);
        this.level.parentElement.classList.add('is-level-up');
        this.fill.style.transition = 'none';
        this.fill.style.width = '0%';
        this.count(this.progressLabel, currentXp, 0, 0, nextXp);
        let frame = this.window.requestAnimationFrame(() => {
          this.frames.delete(frame);
          this.fill.style.transition = 'width 500ms ease-out';
          this.fill.style.width = `${newProgress}%`;
        });
        this.frames.add(frame);
      }
      this.progress.setAttribute('aria-valuenow', String(currentXp));
      this.progress.setAttribute('aria-valuemax', String(nextXp));
    }, barDelay + 720);
  }

  destroy() {
    this.runId++;
    this.request?.abort();
    this.clearAnimation();
    this.pageObserver?.disconnect();
    this.visibilityObserver?.disconnect();
    this.buttons?.forEach(button => { if (button) this.root.appendChild(button); });
    this.content?.remove();
    this.originalScore?.classList.remove('blobio-exit-original-score');
    this.root?.classList.remove('blobio-exit-results');
    this.style?.remove();
    this.root = null;
  }
}
