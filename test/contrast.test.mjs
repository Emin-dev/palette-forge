// Real verification for js/contrast.js — WCAG relative luminance + contrast
// ratio math, checked against known reference values, not just internal
// self-consistency.
import assert from 'node:assert/strict';
import { relativeLuminance, contrastRatio, labelContrast, contrastAgainstWhiteAndBlack, WCAG_THRESHOLDS } from '../js/contrast.js';

let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

function approxEqual(a, b, tolerance, msg) {
  assert.ok(Math.abs(a - b) <= tolerance, `${msg}: expected ${a} to be within ${tolerance} of ${b}`);
}

check('relativeLuminance of pure black is 0', () => {
  assert.equal(relativeLuminance('#000000'), 0);
});

check('relativeLuminance of pure white is 1', () => {
  approxEqual(relativeLuminance('#ffffff'), 1, 1e-9, 'white luminance');
});

check('relativeLuminance of pure red matches the known reference value ~0.2126', () => {
  approxEqual(relativeLuminance('#ff0000'), 0.2126, 1e-4, 'red luminance');
});

check('relativeLuminance of pure green matches the known reference value ~0.7152', () => {
  approxEqual(relativeLuminance('#00ff00'), 0.7152, 1e-4, 'green luminance');
});

check('relativeLuminance of pure blue matches the known reference value ~0.0722', () => {
  approxEqual(relativeLuminance('#0000ff'), 0.0722, 1e-4, 'blue luminance');
});

check('contrastRatio black-on-white is exactly 21:1 (the canonical known reference)', () => {
  approxEqual(contrastRatio('#000000', '#ffffff'), 21, 1e-9, 'black/white contrast');
});

check('contrastRatio is symmetric (order of arguments does not matter)', () => {
  const a = contrastRatio('#336699', '#ffffff');
  const b = contrastRatio('#ffffff', '#336699');
  assert.equal(a, b);
});

check('contrastRatio of a color against itself is exactly 1:1', () => {
  assert.equal(contrastRatio('#336699', '#336699'), 1);
});

check('contrastRatio white-on-white and black-on-black are both 1:1', () => {
  assert.equal(contrastRatio('#ffffff', '#ffffff'), 1);
  assert.equal(contrastRatio('#000000', '#000000'), 1);
});

check('known real-world reference: #767676 on white is ~4.54:1 (the classic "just passes AA" gray)', () => {
  // This is a widely-cited reference value (e.g. WebAIM's own examples use
  // #767676 as the minimum gray that still passes AA on white).
  approxEqual(contrastRatio('#767676', '#ffffff'), 4.54, 0.05, '#767676 on white');
});

check('known real-world reference: #0000EE (classic link blue) on white is ~9.40:1 (hand-computed via the WCAG formula independently of the implementation)', () => {
  // Hand-computed check, independent of relativeLuminance()'s implementation:
  // linearize(c) = c/12.92 if c<=0.03928 else ((c+0.055)/1.055)^2.4, c = channel/255
  // L = 0.2126*R + 0.7152*G + 0.0722*B; contrast = (Lwhite+0.05)/(Lcolor+0.05)
  const lin = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lBlue = 0.2126 * lin(0) + 0.7152 * lin(0) + 0.0722 * lin(238);
  const expected = (1 + 0.05) / (lBlue + 0.05);
  approxEqual(contrastRatio('#0000ee', '#ffffff'), expected, 1e-9, 'link blue on white (hand-computed)');
  approxEqual(expected, 9.4, 0.01, 'sanity: hand-computed value is ~9.4, not the often-misquoted 8.59');
});

check('labelContrast: ratio of 21 (black/white) passes AA and AAA for both normal and large text', () => {
  const label = labelContrast(21);
  assert.equal(label.aaNormal, true);
  assert.equal(label.aaLarge, true);
  assert.equal(label.aaaNormal, true);
  assert.equal(label.aaaLarge, true);
});

check('labelContrast: ratio of 1 (no contrast) fails everything', () => {
  const label = labelContrast(1);
  assert.equal(label.aaNormal, false);
  assert.equal(label.aaLarge, false);
  assert.equal(label.aaaNormal, false);
  assert.equal(label.aaaLarge, false);
});

check('labelContrast: exact AA normal-text boundary (4.5) passes, just below (4.49) fails', () => {
  assert.equal(labelContrast(WCAG_THRESHOLDS.AA_NORMAL).aaNormal, true);
  assert.equal(labelContrast(4.49).aaNormal, false);
});

check('labelContrast: exact AA large-text boundary (3.0) passes, just below (2.99) fails', () => {
  assert.equal(labelContrast(WCAG_THRESHOLDS.AA_LARGE).aaLarge, true);
  assert.equal(labelContrast(2.99).aaLarge, false);
});

check('labelContrast: exact AAA normal-text boundary (7.0) passes, just below (6.99) fails', () => {
  assert.equal(labelContrast(WCAG_THRESHOLDS.AAA_NORMAL).aaaNormal, true);
  assert.equal(labelContrast(6.99).aaaNormal, false);
});

check('labelContrast: a ratio that passes AA-normal but not AAA-normal is labeled correctly (e.g. 5.0)', () => {
  const label = labelContrast(5.0);
  assert.equal(label.aaNormal, true);
  assert.equal(label.aaaNormal, false);
  assert.equal(label.aaLarge, true);
  assert.equal(label.aaaLarge, true); // AAA large threshold is 4.5, so 5.0 passes it too
});

check('contrastAgainstWhiteAndBlack picks the higher-contrast background as "best"', () => {
  const result = contrastAgainstWhiteAndBlack('#111111'); // very dark: white text/background wins
  assert.equal(result.best, 'white');
  assert.ok(result.onWhite.ratio > result.onBlack.ratio);

  const result2 = contrastAgainstWhiteAndBlack('#f5f5f5'); // very light: black wins
  assert.equal(result2.best, 'black');
  assert.ok(result2.onBlack.ratio > result2.onWhite.ratio);
});

console.log(`\n${passed} check(s) passed.`);
if (process.exitCode) {
  console.error('\nSOME CHECKS FAILED');
  process.exit(1);
} else {
  console.log('\nALL CHECKS PASSED');
}
