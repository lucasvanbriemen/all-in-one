// hue 0-360, saturation 0-1, value 0-1 → `#rrggbb`.
export function hsvToHex(hue, saturation, value = 1) {
  const channel = n => {
    const k = (n + hue / 60) % 6;
    const c = value - value * saturation * Math.max(0, Math.min(k, 4 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, '0');
  };

  return `#${channel(5)}${channel(3)}${channel(1)}`;
}

// React's useId contains characters that break `url(#id)` references.
export function svgId(id) {
  return id.replace(/[^a-zA-Z0-9_-]/g, '');
}
