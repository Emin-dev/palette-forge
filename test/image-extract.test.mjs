// Real verification for the Node-testable half of js/image-extract.js —
// extractDominantColor takes a raw pixel array (no DOM/canvas needed) so
// its bucketing/averaging algorithm can be tested with synthetic pixel data.
import assert from 'node:assert/strict';
import { extractDominantColor } from '../js/image-extract.js';

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

function solidFillPixels(r, g, b, count) {
  const arr = new Uint8ClampedArray(count * 4);
  for (let i = 0; i < count; i++) {
    arr[i * 4] = r;
    arr[i * 4 + 1] = g;
    arr[i * 4 + 2] = b;
    arr[i * 4 + 3] = 255;
  }
  return arr;
}

check('a solid-red image extracts pure red', () => {
  const pixels = solidFillPixels(255, 0, 0, 100);
  const result = extractDominantColor(pixels);
  assert.equal(result.hex, '#ff0000');
});

check('a solid-blue image extracts pure blue', () => {
  const pixels = solidFillPixels(0, 0, 255, 100);
  const result = extractDominantColor(pixels);
  assert.equal(result.hex, '#0000ff');
});

check('a mostly-white image with a small vivid red region still favors the vibrant red over the numerically dominant white', () => {
  const white = solidFillPixels(250, 250, 250, 300); // majority pixel count
  const red = solidFillPixels(220, 20, 20, 40); // minority but far more saturated/vibrant
  const combined = new Uint8ClampedArray(white.length + red.length);
  combined.set(white, 0);
  combined.set(red, white.length);
  const result = extractDominantColor(combined);
  assert.ok(result.h < 20 || result.h > 340, `expected a red-ish hue, got h=${result.h}`);
});

check('fully transparent pixels are ignored (do not skew the result)', () => {
  const transparent = new Uint8ClampedArray(4 * 50); // all zeros -> alpha 0
  const green = solidFillPixels(0, 255, 0, 50);
  const combined = new Uint8ClampedArray(transparent.length + green.length);
  combined.set(transparent, 0);
  combined.set(green, transparent.length);
  const result = extractDominantColor(combined);
  assert.equal(result.hex, '#00ff00');
});

check('a fully transparent image (no visible pixels at all) falls back to a defined neutral gray, not a crash', () => {
  const allTransparent = new Uint8ClampedArray(4 * 20);
  const result = extractDominantColor(allTransparent);
  assert.match(result.hex, /^#[0-9a-f]{6}$/);
});

check('a mostly-gray image with a distinct saturated cluster picks the saturated cluster over gray', () => {
  const gray = solidFillPixels(128, 128, 128, 200);
  const orange = solidFillPixels(255, 140, 0, 60);
  const combined = new Uint8ClampedArray(gray.length + orange.length);
  combined.set(gray, 0);
  combined.set(orange, gray.length);
  const result = extractDominantColor(combined);
  assert.ok(result.h > 20 && result.h < 50, `expected an orange-ish hue (~30), got h=${result.h}`);
});

check('sampleStride option subsamples pixels but still returns a valid color for a solid image', () => {
  const pixels = solidFillPixels(10, 200, 10, 1000);
  const result = extractDominantColor(pixels, { sampleStride: 4 });
  assert.match(result.hex, /^#[0-9a-f]{6}$/);
  assert.ok(result.h > 100 && result.h < 140, `expected a green-ish hue, got h=${result.h}`);
});

console.log(`\n${passed} check(s) passed.`);
if (process.exitCode) {
  console.error('\nSOME CHECKS FAILED');
  process.exit(1);
} else {
  console.log('\nALL CHECKS PASSED');
}
