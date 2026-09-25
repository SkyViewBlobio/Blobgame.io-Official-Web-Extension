// Keep previews on the paint clock and persistence out of continuous input events.
export function createSettingsDrag(win, preview, commit) {
  let frame = null;
  let timer = null;
  let dirty = false;
  const useFrames = typeof win.requestAnimationFrame === 'function';

  function flush() {
    if (timer !== null) win.clearTimeout(timer);
    timer = null;
    if (frame !== null) {
      if (useFrames) win.cancelAnimationFrame(frame);
      else win.clearTimeout(frame);
      frame = null;
      preview();
    }
    win.removeEventListener?.('pagehide', flush);
    if (dirty) {
      dirty = false;
      commit();
    }
  }

  return {
    get pending() { return dirty; },
    schedule() {
      if (!dirty) win.addEventListener?.('pagehide', flush);
      dirty = true;
      if (frame === null) {
        const run = () => {
          frame = null;
          preview();
        };
        frame = useFrames ? win.requestAnimationFrame(run) : win.setTimeout(run, 16);
      }
      if (timer !== null) win.clearTimeout(timer);
      timer = win.setTimeout(flush, 180);
    },
    flush,
  };
}
