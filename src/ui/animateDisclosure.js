const animations = new WeakMap();

export function animateDisclosure(menu, open) {
  if (!menu || (menu.hidden === !open && !animations.has(menu))) return;
  const win = menu.ownerDocument?.defaultView;
  const previous = animations.get(menu);
  const height = (previous?.wrapper || menu).getBoundingClientRect?.().height || 0;
  const startShadow = win?.getComputedStyle?.(previous?.wrapper || menu).boxShadow || 'none';
  const opacity = previous ? win.getComputedStyle(previous.wrapper).opacity : (menu.hidden ? '0' : '1');
  const currentGap = previous ? win.getComputedStyle(previous.wrapper.parentElement).rowGap : null;
  previous?.restore();
  previous?.animation.cancel();
  menu.hidden = !open;
  if (!menu.animate || win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  menu.hidden = false;
  const natural = win.getComputedStyle(menu);
  const display = natural.display;
  const shadow = natural.boxShadow;
  const radius = natural.borderRadius;
  const originalShadow = menu.style.getPropertyValue('box-shadow');
  const originalShadowPriority = menu.style.getPropertyPriority('box-shadow');
  const fullHeight = menu.getBoundingClientRect().height;
  const originalHeight = menu.style.getPropertyValue('height');
  const originalHeightPriority = menu.style.getPropertyPriority('height');
  const originalDisplay = menu.style.getPropertyValue('display');
  const originalDisplayPriority = menu.style.getPropertyPriority('display');
  const wrapper = menu.ownerDocument.createElement('div');
  wrapper.style.cssText = 'min-width:0;grid-column:1 / -1;overflow:hidden;';
  wrapper.style.borderRadius = radius;
  menu.before(wrapper);
  wrapper.append(menu);
  // Reveal a stable layout instead of resizing/reflowing every control on every frame.
  menu.style.setProperty('height', `${fullHeight}px`, 'important');
  menu.style.setProperty('display', display, 'important');
  menu.style.setProperty('box-shadow', 'none', 'important');
  menu.hidden = !open;
  const timing = { duration: 520, easing: 'cubic-bezier(.4,0,.2,1)' };
  const parent = wrapper.parentElement;
  const gap = win.getComputedStyle(parent).rowGap;
  // Grid spacing must enter and leave with the panel instead of snapping by one gap.
  const gapAnimation = parent.animate([
    { rowGap: currentGap ?? (open ? '0px' : gap) },
    { rowGap: open ? gap : '0px' },
  ], timing);
  const animation = wrapper.animate([
    { height: `${height}px`, opacity, boxShadow: !open && height > 0 ? startShadow : 'none' },
    { height: `${open ? fullHeight : 0}px`, opacity: open ? 1 : 0, boxShadow: 'none' },
  ], timing);
  const record = { animation, wrapper, restore: () => {
    if (animations.get(menu) !== record) return;
    animations.delete(menu);
    gapAnimation.cancel();
    if (originalHeight) menu.style.setProperty('height', originalHeight, originalHeightPriority);
    else menu.style.removeProperty('height');
    if (originalDisplay) menu.style.setProperty('display', originalDisplay, originalDisplayPriority);
    else menu.style.removeProperty('display');
    if (originalShadow) menu.style.setProperty('box-shadow', originalShadow, originalShadowPriority);
    else menu.style.removeProperty('box-shadow');
    if (menu.parentNode === wrapper) wrapper.replaceWith(menu);
    else wrapper.remove();
  } };
  animations.set(menu, record);
  animation.onfinish = () => {
    record.restore();
    if (open && !menu.hidden && menu.isConnected) {
      menu.animate([{ boxShadow: 'none' }, { boxShadow: shadow }], {
        duration: 300, easing: 'ease-out',
      });
    }
  };
  animation.oncancel = record.restore;
}
