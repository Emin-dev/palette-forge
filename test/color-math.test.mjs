// Real verification for js/color-math.js — conversion round-trips and edge cases.
import assert from 'node:assert/strict';
import {
  normalizeHex, hexToRgb, rgbToHex, rgbToHsl, hslToRgb, hexToHsl, hslToHex, clampHsl,
} from '../js/color-math.js';

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

check('normalizeHex expands 3-digit shorthand', () => {
  assert.equal(normalizeHex('#f0a'), '#ff00aa');
  assert.equal(normalizeHex('0af'), '#00aaff');
});

check('normalizeHex lowercases and preserves 6-digit hex', () => {
  assert.equal(normalizeHex('#FF8800'), '#ff8800');
  assert.equal(normalizeHex('ABCDEF'), '#abcdef');
});

check('normalizeHex throws on invalid input', () => {
  assert.throws(() => normalizeHex('not-a-color'));
  assert.throws(() => normalizeHex('#12345'));
  assert.throws(() => normalizeHex(''));
});

check('hexToRgb converts pure black, white, red, green, blue exactly', () => {
  assert.deepEqual(hexToRgb('#000000'), { r: 0, g: 0, b: 0 });
  assert.deepEqual(hexToRgb('#ffffff'), { r: 255, g: 255, b: 255 });
  assert.deepEqual(hexToRgb('#ff0000'), { r: 255, g: 0, b: 0 });
  assert.deepEqual(hexToRgb('#00ff00'), { r: 0, g: 255, b: 0 });
  assert.deepEqual(hexToRgb('#0000ff'), { r: 0, g: 0, b: 255 });
});

check('rgbToHex is the exact inverse of hexToRgb for known colors', () => {
  assert.equal(rgbToHex({ r: 255, g: 136, b: 0 }), '#ff8800');
  assert.equal(rgbToHex({ r: 0, g: 0, b: 0 }), '#000000');
  assert.equal(rgbToHex({ r: 255, g: 255, b: 255 }), '#ffffff');
});

check('rgbToHex clamps and rounds out-of-range channel values', () => {
  assert.equal(rgbToHex({ r: 300, g: -10, b: 127.6 }), '#ff0080');
});

check('rgbToHsl: pure black is h=0 s=0 l=0', () => {
  const hsl = rgbToHsl({ r: 0, g: 0, b: 0 });
  assert.equal(hsl.h, 0);
  assert.equal(hsl.s, 0);
  assert.equal(hsl.l, 0);
});

check('rgbToHsl: pure white is h=0 s=0 l=100', () => {
  const hsl = rgbToHsl({ r: 255, g: 255, b: 255 });
  assert.equal(hsl.h, 0);
  assert.equal(hsl.s, 0);
  assert.equal(hsl.l, 100);
});

check('rgbToHsl: pure red is h=0 s=100 l=50', () => {
  const hsl = rgbToHsl({ r: 255, g: 0, b: 0 });
  assert.equal(hsl.h, 0);
  assert.equal(Math.round(hsl.s), 100);
  assert.equal(Math.round(hsl.l), 50);
});

check('rgbToHsl: pure green is h=120 s=100 l=50', () => {
  const hsl = rgbToHsl({ r: 0, g: 255, b: 0 });
  assert.equal(Math.round(hsl.h), 120);
  assert.equal(Math.round(hsl.s), 100);
  assert.equal(Math.round(hsl.l), 50);
});

check('rgbToHsl: pure blue is h=240 s=100 l=50', () => {
  const hsl = rgbToHsl({ r: 0, g: 0, b: 255 });
  assert.equal(Math.round(hsl.h), 240);
  assert.equal(Math.round(hsl.s), 100);
  assert.equal(Math.round(hsl.l), 50);
});

check('hslToRgb is the exact inverse of rgbToHsl for primary colors', () => {
  assert.deepEqual(hslToRgb({ h: 0, s: 100, l: 50 }), { r: 255, g: 0, b: 0 });
  assert.deepEqual(hslToRgb({ h: 120, s: 100, l: 50 }), { r: 0, g: 255, b: 0 });
  assert.deepEqual(hslToRgb({ h: 240, s: 100, l: 50 }), { r: 0, g: 0, b: 255 });
});

check('hslToRgb: s=0 produces gray regardless of hue', () => {
  assert.deepEqual(hslToRgb({ h: 200, s: 0, l: 50 }), { r: 128, g: 128, b: 128 });
});

check('full round-trip hex -> HSL -> hex recovers the original for a range of colors', () => {
  const samples = ['#ff8800', '#123456', '#abcdef', '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#808080', '#336699'];
  for (const hex of samples) {
    const roundTripped = hslToHex(hexToHsl(hex));
    assert.equal(roundTripped, hex, `round-trip failed for ${hex}: got ${roundTripped}`);
  }
});

check('hue wraps correctly beyond 360 and below 0', () => {
  const a = clampHsl({ h: 370, s: 50, l: 50 });
  const b = clampHsl({ h: 10, s: 50, l: 50 });
  assert.equal(Math.round(a.h), Math.round(b.h));

  const c = clampHsl({ h: -30, s: 50, l: 50 });
  const d = clampHsl({ h: 330, s: 50, l: 50 });
  assert.equal(Math.round(c.h), Math.round(d.h));
});

check('clampHsl clamps saturation and lightness to [0,100]', () => {
  const r = clampHsl({ h: 0, s: 150, l: -20 });
  assert.equal(r.s, 100);
  assert.equal(r.l, 0);
});

check('hexToHsl/hslToHex handle a fully desaturated mid-gray round-trip', () => {
  const hsl = hexToHsl('#808080');
  assert.equal(Math.round(hsl.s), 0);
  assert.equal(hslToHex(hsl), '#808080');
});

console.log(`\n${passed} check(s) passed.`);
if (process.exitCode) {
  console.error('\nSOME CHECKS FAILED');
  process.exit(1);
} else {
  console.log('\nALL CHECKS PASSED');
}
