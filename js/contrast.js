// contrast.js — real WCAG 2.x relative luminance + contrast ratio math.
// Pure, Node-testable. Formulas per the WCAG 2.1/2.2 spec:
// https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
// https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio

import { hexToRgb } from './color-math.js';

/**
 * Linearize a single sRGB channel value (0-255) per the WCAG formula.
 * @param {number} channel255
 * @returns {number}
 */
function linearizeChannel(channel255) {
  const c = channel255 / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Real WCAG relative luminance formula:
 * L = 0.2126 * R + 0.7152 * G + 0.0722 * B (linearized channels)
 * @param {string|{r:number,g:number,b:number}} color hex string or rgb object
 * @returns {number} relative luminance in [0,1]
 */
export function relativeLuminance(color) {
  const rgb = typeof color === 'string' ? hexToRgb(color) : color;
  const r = linearizeChannel(rgb.r);
  const g = linearizeChannel(rgb.g);
  const b = linearizeChannel(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Real WCAG contrast ratio formula: (L1 + 0.05) / (L2 + 0.05), where L1 is
 * the lighter (higher-luminance) color. Result is always in [1, 21].
 * @param {string|{r:number,g:number,b:number}} colorA
 * @param {string|{r:number,g:number,b:number}} colorB
 * @returns {number} contrast ratio, e.g. 21 for black vs white
 */
export function contrastRatio(colorA, colorB) {
  const lA = relativeLuminance(colorA);
  const lB = relativeLuminance(colorB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

// WCAG 2.x thresholds (2.x, unchanged in 2.2)
export const WCAG_THRESHOLDS = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3.0,
  AAA_NORMAL: 7.0,
  AAA_LARGE: 4.5,
};

/**
 * Label a contrast ratio against the real WCAG AA/AAA thresholds for both
 * normal and large text.
 * @param {number} ratio
 * @returns {{ratio:number, aaNormal:boolean, aaLarge:boolean, aaaNormal:boolean, aaaLarge:boolean}}
 */
export function labelContrast(ratio) {
  return {
    ratio,
    aaNormal: ratio >= WCAG_THRESHOLDS.AA_NORMAL,
    aaLarge: ratio >= WCAG_THRESHOLDS.AA_LARGE,
    aaaNormal: ratio >= WCAG_THRESHOLDS.AAA_NORMAL,
    aaaLarge: ratio >= WCAG_THRESHOLDS.AAA_LARGE,
  };
}

/**
 * Convenience: compute + label a color's contrast against both pure white
 * and pure black text.
 * @param {string} hex
 * @returns {{onWhite: ReturnType<typeof labelContrast>, onBlack: ReturnType<typeof labelContrast>, best: 'white'|'black'}}
 */
export function contrastAgainstWhiteAndBlack(hex) {
  const onWhite = labelContrast(contrastRatio(hex, '#ffffff'));
  const onBlack = labelContrast(contrastRatio(hex, '#000000'));
  return {
    onWhite,
    onBlack,
    best: onWhite.ratio >= onBlack.ratio ? 'white' : 'black',
  };
}
