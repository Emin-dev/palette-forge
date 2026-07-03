// Real verification for js/harmonies.js — confirms correct hue rotation
// math for every harmony type, built on real color-math conversions.
import assert from 'node:assert/strict';
import { hexToHsl } from '../js/color-math.js';
import { complementary, analogous, triadic, tetradic, monochromatic, generateHarmony, HARMONY_TYPES } from '../js/harmonies.js';

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

function hueDelta(a, b) {
  let d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

const BASE = '#3366cc'; // arbitrary saturated blue

check('complementary produces exactly 2 colors, second is 180deg from base', () => {
  const result = complementary(BASE);
  assert.equal(result.length, 2);
  const baseH = hexToHsl(BASE).h;
  approxHue(result[0].h, baseH);
  approxHue(result[1].h, (baseH + 180) % 360);
});

check('analogous produces exactly 3 colors at base, base-30, base+30', () => {
  const result = analogous(BASE);
  assert.equal(result.length, 3);
  const baseH = hexToHsl(BASE).h;
  approxHue(result[0].h, (baseH - 30 + 360) % 360);
  approxHue(result[1].h, baseH);
  approxHue(result[2].h, (baseH + 30) % 360);
});

check('triadic produces exactly 3 colors at base, base+120, base+240', () => {
  const result = triadic(BASE);
  assert.equal(result.length, 3);
  const baseH = hexToHsl(BASE).h;
  approxHue(result[0].h, baseH);
  approxHue(result[1].h, (baseH + 120) % 360);
  approxHue(result[2].h, (baseH + 240) % 360);
});

check('tetradic produces exactly 4 colors at base, +90, +180, +270', () => {
  const result = tetradic(BASE);
  assert.equal(result.length, 4);
  const baseH = hexToHsl(BASE).h;
  approxHue(result[0].h, baseH);
  approxHue(result[1].h, (baseH + 90) % 360);
  approxHue(result[2].h, (baseH + 180) % 360);
  approxHue(result[3].h, (baseH + 270) % 360);
});

check('monochromatic keeps hue and saturation fixed while lightness varies across steps', () => {
  const result = monochromatic(BASE, 5);
  assert.equal(result.length, 5);
  const baseH = hexToHsl(BASE).h;
  const baseS = hexToHsl(BASE).s;
  for (const swatch of result) {
    approxHue(swatch.h, baseH);
    assert.ok(Math.abs(swatch.s - baseS) < 1, `saturation should stay ~fixed, got ${swatch.s} vs base ${baseS}`);
  }
  // Lightness should be strictly decreasing (lightest to darkest)
  for (let i = 1; i < result.length; i++) {
    assert.ok(result[i].l < result[i - 1].l, 'lightness should strictly decrease across the ramp');
  }
});

check('monochromatic respects a custom step count', () => {
  assert.equal(monochromatic(BASE, 3).length, 3);
  assert.equal(monochromatic(BASE, 9).length, 9);
});

check('generateHarmony dispatches to the correct function for every known type', () => {
  for (const type of HARMONY_TYPES) {
    const result = generateHarmony(BASE, type);
    assert.ok(Array.isArray(result) && result.length > 0, `type ${type} produced no colors`);
  }
});

check('generateHarmony throws on an unknown harmony type', () => {
  assert.throws(() => generateHarmony(BASE, 'not-a-real-type'));
});

check('every generated swatch has a valid 6-digit hex value', () => {
  for (const type of HARMONY_TYPES) {
    for (const swatch of generateHarmony(BASE, type)) {
      assert.match(swatch.hex, /^#[0-9a-f]{6}$/);
    }
  }
});

check('complementary applied twice returns to the original hue (180 + 180 = 360 = 0)', () => {
  const once = complementary(BASE);
  const complementHex = once[1].hex;
  const twice = complementary(complementHex);
  approxHue(twice[1].h, hexToHsl(BASE).h);
});

function approxHue(a, b) {
  const d = hueDelta(a, b);
  assert.ok(d < 0.5, `hue mismatch: ${a} vs ${b} (delta ${d})`);
}

console.log(`\n${passed} check(s) passed.`);
if (process.exitCode) {
  console.error('\nSOME CHECKS FAILED');
  process.exit(1);
} else {
  console.log('\nALL CHECKS PASSED');
}
