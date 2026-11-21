// The lamp uses HSV-style colors: hue 0-360 (we scale it to 0-65535 when sending)
// and saturation 0-254 ("howCloseToWhite": 0 = white, 254 = full color).
// Brightness is set separately on the lamp, so the hex "value" part is not stored here.
const MAX_SATURATION = 254;

export const colorUtils = {
  hexToHueAndSaturation: (hex) => {
    let digits = String(hex).trim().replace(/^#/, "");
    if (digits.length === 3) {
      digits = digits.split("").map(c => c + c).join(""); // "#f80" -> "#ff8800"
    }
    if (!/^[0-9a-fA-F]{6}$/.test(digits)) {
      throw new Error(`Invalid hex color: ${hex}`);
    }

    const r = parseInt(digits.slice(0, 2), 16) / 255;
    const g = parseInt(digits.slice(2, 4), 16) / 255;
    const b = parseInt(digits.slice(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;

    let h = 0;
    if (d !== 0) {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    const s = max === 0 ? 0 : d / max; // HSV saturation

    return { hue: Math.round(h * 360), saturation: Math.round(s * MAX_SATURATION) };
  },

  // Returns the color at full brightness, since brightness lives on the lamp separately.
  hueAndSaturationToHex: (hue, saturation) => {
    const h = (((hue % 360) + 360) % 360) / 60;
    const s = Math.min(Math.max(saturation, 0), MAX_SATURATION) / MAX_SATURATION;
    const v = 1;

    const c = v * s;
    const x = c * (1 - Math.abs((h % 2) - 1));
    const m = v - c;

    let r, g, b;
    if (h < 1) [r, g, b] = [c, x, 0];
    else if (h < 2) [r, g, b] = [x, c, 0];
    else if (h < 3) [r, g, b] = [0, c, x];
    else if (h < 4) [r, g, b] = [0, x, c];
    else if (h < 5) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];

    const toHex = n => Math.round((n + m) * 255).toString(16).padStart(2, "0");

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
};
