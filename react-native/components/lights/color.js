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

// `#rrggbb` → {hue 0-360, saturation 0-1}. The lamp stores brightness separately,
// so the hex is always at full value and the V part is dropped.
export function hexToHsv(hex) {
  const digits = String(hex ?? '').replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(digits)) return null;

  const [r, g, b] = [0, 2, 4].map(i => parseInt(digits.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);

  let hue = 0;
  if (d !== 0) {
    if (max === r) hue = ((g - b) / d + 6) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
  }

  return {hue: hue * 60, saturation: max === 0 ? 0 : d / max};
}

// The lamp's level runs 1-254; people think in percent.
export const MIN_LEVEL = 1;
export const MAX_LEVEL = 254;
export const levelToPercent = level => Math.max(1, Math.round((level / MAX_LEVEL) * 100));
