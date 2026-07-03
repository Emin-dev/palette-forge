// harmonies.js — real color-wheel harmony generation in HSL space, built on
// color-math.js. Pure, Node-testable.

import { hexToHsl, hslToHex, clampHsl } from './color-math.js';

/**
 * @typedef {{hex:string, h:number, s:number, l:number, role:string}} SwatchColor
 */

function toSwatch(hsl, role) {
  const clamped = clampHsl(hsl);
  return { hex: hslToHex(clamped), h: clamped.h, s: clamped.s, l: clamped.l, role };
}

/**
 * Complementary: base + the color 180deg opposite on the wheel.
 * @param {string} baseHex
 * @returns {SwatchColor[]}
 */
export function complementary(baseHex) {
  const base = hexToHsl(baseHex);
  return [
    toSwatch(base, 'base'),
    toSwatch({ ...base, h: base.h + 180 }, 'complement'),
  ];
}

/**
 * Analogous: base plus neighbors at +/-30deg.
 * @param {string} baseHex
 * @returns {SwatchColor[]}
 */
export function analogous(baseHex) {
  const base = hexToHsl(baseHex);
  return [
    toSwatch({ ...base, h: base.h - 30 }, 'analogous-1'),
    toSwatch(base, 'base'),
    toSwatch({ ...base, h: base.h + 30 }, 'analogous-2'),
  ];
}

/**
 * Triadic: base plus two colors at +120deg and +240deg (evenly spaced
 * around the wheel, three-way split).
 * @param {string} baseHex
 * @returns {SwatchColor[]}
 */
export function triadic(baseHex) {
  const base = hexToHsl(baseHex);
  return [
    toSwatch(base, 'base'),
    toSwatch({ ...base, h: base.h + 120 }, 'triadic-1'),
    toSwatch({ ...base, h: base.h + 240 }, 'triadic-2'),
  ];
}

/**
 * Tetradic (rectangle): base plus colors at +90deg, +180deg, +270deg —
 * four-way even split around the wheel.
 * @param {string} baseHex
 * @returns {SwatchColor[]}
 */
export function tetradic(baseHex) {
  const base = hexToHsl(baseHex);
  return [
    toSwatch(base, 'base'),
    toSwatch({ ...base, h: base.h + 90 }, 'tetradic-1'),
    toSwatch({ ...base, h: base.h + 180 }, 'tetradic-2'),
    toSwatch({ ...base, h: base.h + 270 }, 'tetradic-3'),
  ];
}

/**
 * Monochromatic: a tint/shade ramp at fixed hue + saturation, varying only
 * lightness. Produces `steps` colors evenly spaced across a lightness range
 * that always includes the base lightness.
 * @param {string} baseHex
 * @param {number} [steps=5]
 * @returns {SwatchColor[]}
 */
export function monochromatic(baseHex, steps = 5) {
  const base = hexToHsl(baseHex);
  const n = Math.max(2, Math.floor(steps));
  // Spread lightness from 90% down to 10% (avoiding pure white/black unless
  // the base itself is already at an extreme), evenly across n steps.
  const minL = 10;
  const maxL = 90;
  const out = [];
  for (let i = 0; i < n; i++) {
    const l = maxL - (i * (maxL - minL)) / (n - 1);
    out.push(toSwatch({ h: base.h, s: base.s, l }, i === 0 ? 'lightest' : i === n - 1 ? 'darkest' : `tone-${i}`));
  }
  return out;
}

/**
 * Generate a named harmony palette.
 * @param {string} baseHex
 * @param {'complementary'|'analogous'|'triadic'|'tetradic'|'monochromatic'} type
 * @returns {SwatchColor[]}
 */
export function generateHarmony(baseHex, type) {
  switch (type) {
    case 'complementary': return complementary(baseHex);
    case 'analogous': return analogous(baseHex);
    case 'triadic': return triadic(baseHex);
    case 'tetradic': return tetradic(baseHex);
    case 'monochromatic': return monochromatic(baseHex);
    default:
      throw new Error(`generateHarmony: unknown harmony type "${type}"`);
  }
}

export const HARMONY_TYPES = ['complementary', 'analogous', 'triadic', 'tetradic', 'monochromatic'];
