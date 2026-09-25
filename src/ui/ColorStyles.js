const glowNodes = new WeakMap();

export function hexToRgba(color, alpha) {
  const value = String(color || '#000000').replace('#', '');
  const red = Number.parseInt(value.slice(0, 2), 16) || 0;
  const green = Number.parseInt(value.slice(2, 4), 16) || 0;
  const blue = Number.parseInt(value.slice(4, 6), 16) || 0;
  return `rgba(${red}, ${green}, ${blue}, ${Math.max(0, Math.min(1, Number(alpha) || 0))})`;
}

export function backgroundFill(setting) {
  const first = hexToRgba(setting.color, setting.alpha);
  return setting.mode === 'gradient'
    ? `linear-gradient(${setting.angle}deg, ${first}, ${hexToRgba(setting.secondaryColor, setting.secondaryAlpha ?? setting.alpha)})`
    : first;
}

export function applyHudOutline(element, setting, glow) {
  if (!element) return;
  const enabled = setting.enabled && setting.mode === 'gradient';
  element.classList.toggle('blobio-gradient-outline', enabled);
  if (enabled) element.style.setProperty('--blobio-outline-gradient', backgroundFill(setting));
  else element.style.removeProperty('--blobio-outline-gradient');
  if (setting.enabled) element.style.setProperty('--blobio-outline-glow', hexToRgba(setting.color, setting.alpha * (setting.glow ?? 0.35)));
  else element.style.removeProperty('--blobio-outline-glow');
  const customGlow = Boolean(setting.enabled && glow?.enabled && setting.glow > 0);
  element.classList.toggle('blobio-custom-glow', customGlow);
  if (customGlow) element.style.setProperty('--blobio-custom-glow-shadow', hexToRgba(glow.color, glow.alpha * setting.glow));
  else element.style.removeProperty('--blobio-custom-glow-shadow');
  let node = glowNodes.get(element);
  if (customGlow) {
    if (!node) {
      node = element.ownerDocument.createElement('span');
      node.className = 'blobio-outline-glow';
      node.setAttribute('aria-hidden', 'true');
      element.appendChild(node);
      glowNodes.set(element, node);
    }
    node.style.setProperty('--blobio-glow-fill', backgroundFill(glow));
    node.style.opacity = String(setting.glow);
  } else if (node) {
    node.remove();
    glowNodes.delete(element);
  }
}
