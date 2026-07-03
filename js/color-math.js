// color-math.js — pure hex <-> RGB <-> HSL conversion functions.
// No DOM dependency; fully Node-testable. This underlies every other module
// (harmonies, contrast, export) so the conversion math must be exactly right.

/**
 * Normalize a hex color string to a strict 6-digit lowercase form with a
 * leading '#'. Accepts 3-digit shorthand ("#f0a" -> "#ff00aa") and with/
 * without the leading '#'. Throws on invalid input.
 * @param {string} hex
 * @returns {string} normalized "#rrggbb"
 */
export function normalizeHex(hex) {
  if (typeof hex !== 'string') throw new Error('normalizeHex: expected a string');
  let h = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(h)) {
    h = h.split('').map((c) => c + c).join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    throw new Error(`normalizeHex: "${hex}" is not a valid hex color`);
  }
  return '#' + h.toLowerCase();
}

/**
 * @param {string} hex e.g. "#ff8800" or "f80"
 * @returns {{r:number, g:number, b:number}} each channel 0-255 integer
 */
export function hexToRgb(hex) {
  const norm = normalizeHex(hex);
  const r = parseInt(norm.slice(1, 3), 16);
  const g = parseInt(norm.slice(3, 5), 16);
  const b = parseInt(norm.slice(5, 7), 16);
  return { r, g, b };
}

function clampByte(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

/**
 * @param {{r:number,g:number,b:number}} rgb each channel 0-255
 * @returns {string} "#rrggbb" lowercase
 */
export function rgbToHex({ r, g, b }) {
  const toHex = (n) => clampByte(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Standard RGB -> HSL conversion.
 * @param {{r:number,g:number,b:number}} rgb each channel 0-255
 * @returns {{h:number,s:number,l:number}} h in [0,360), s and l in [0,100]
 */
export function rgbToHsl({ r, g, b }) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === rn) {
      h = ((gn - bn) / delta) % 6;
    } else if (max === gn) {
      h = (bn - rn) / delta + 2;
    } else {
      h = (rn - gn) / delta + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h, s: s * 100, l: l * 100 };
}

/**
 * Standard HSL -> RGB conversion.
 * @param {{h:number,s:number,l:number}} hsl h in degrees (any range, wrapped mod 360), s and l in [0,100]
 * @returns {{r:number,g:number,b:number}} each channel 0-255 integer
 */
export function hslToRgb({ h, s, l }) {
  const hn = ((h % 360) + 360) % 360;
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const ln = Math.max(0, Math.min(100, l)) / 100;

  if (sn === 0) {
    const v = clampByte(ln * 255);
    return { r: v, g: v, b: v };
  }

  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = ln - c / 2;

  let rp = 0, gp = 0, bp = 0;
  if (hn < 60) { rp = c; gp = x; bp = 0; }
  else if (hn < 120) { rp = x; gp = c; bp = 0; }
  else if (hn < 180) { rp = 0; gp = c; bp = x; }
  else if (hn < 240) { rp = 0; gp = x; bp = c; }
  else if (hn < 300) { rp = x; gp = 0; bp = c; }
  else { rp = c; gp = 0; bp = x; }

  return {
    r: clampByte((rp + m) * 255),
    g: clampByte((gp + m) * 255),
    b: clampByte((bp + m) * 255),
  };
}

/** @param {string} hex @returns {{h:number,s:number,l:number}} */
export function hexToHsl(hex) {
  return rgbToHsl(hexToRgb(hex));
}

/** @param {{h:number,s:number,l:number}} hsl @returns {string} "#rrggbb" */
export function hslToHex(hsl) {
  return rgbToHex(hslToRgb(hsl));
}

/**
 * Clamp/wrap an HSL object into valid ranges: hue wrapped mod 360,
 * saturation and lightness clamped to [0,100].
 * @param {{h:number,s:number,l:number}} hsl
 */
export function clampHsl({ h, s, l }) {
  return {
    h: ((h % 360) + 360) % 360,
    s: Math.max(0, Math.min(100, s)),
    l: Math.max(0, Math.min(100, l)),
  };
}
