// image-extract.js — dominant-color extraction from a reference image.
//
// Split deliberately in two:
//   1. `extractDominantColor` (this file, pure, Node-testable): takes a raw
//      pixel array (Uint8ClampedArray-like, RGBA quadruples) and returns a
//      dominant color via HSL-bucket voting weighted toward saturated/
//      vibrant pixels (so a photo of a red apple on a white plate returns
//      red, not the numerically-more-common near-white background).
//   2. `extractDominantColorFromImage` (DOM-dependent, not unit-testable):
//      reads pixel data from an <img>/<canvas> via the Canvas 2D API.

import { rgbToHsl, hslToHex } from './color-math.js';

/**
 * Real color-quantization approach: bucket every pixel into a coarse HSL
 * grid (hue buckets of 15deg, with saturation/lightness folded in via a
 * "vibrancy weight" so gray/near-white/near-black pixels count for less),
 * then return the hex color at the center of the most-voted bucket,
 * averaged from the actual pixels that landed in it.
 *
 * @param {Uint8ClampedArray|number[]} pixels flat RGBA array (r,g,b,a,r,g,b,a,...)
 * @param {{hueBucketSize?: number, sampleStride?: number}} [opts]
 * @returns {{hex:string, h:number, s:number, l:number}}
 */
export function extractDominantColor(pixels, opts = {}) {
  const hueBucketSize = opts.hueBucketSize ?? 15;
  const sampleStride = Math.max(1, Math.floor(opts.sampleStride ?? 1));
  const numBuckets = Math.ceil(360 / hueBucketSize);

  const buckets = new Array(numBuckets).fill(null).map(() => ({
    weight: 0,
    rSum: 0,
    gSum: 0,
    bSum: 0,
  }));
  // Separate bucket for achromatic (very low saturation) pixels, since hue
  // is meaningless/noisy for grays — otherwise near-gray pixels scatter
  // randomly across hue buckets and never win even when the image is mostly
  // gray.
  const achromatic = { weight: 0, rSum: 0, gSum: 0, bSum: 0 };

  const pixelStep = 4 * sampleStride;
  let totalWeight = 0;

  for (let i = 0; i + 3 < pixels.length; i += pixelStep) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];
    if (a !== undefined && a < 16) continue; // skip near-fully-transparent pixels

    const { h, s, l } = rgbToHsl({ r, g, b });

    // Vibrancy weight: favor saturated, mid-lightness pixels over washed-out
    // or near-black/near-white ones, so a genuinely dominant vivid color
    // wins over a numerically larger but dull/gray background. Saturation
    // is squared so low-saturation pixels are penalized hard (a 30%-
    // saturated pixel counts for ~9% of a fully-saturated one's weight, not
    // ~30%) — this is what actually makes "small vivid cluster beats large
    // dull cluster" hold in practice, not just a small linear nudge.
    const satWeight = Math.pow(s / 100, 2); // 0..1, squared
    const lightnessWeight = 1 - Math.abs(l - 50) / 50; // peaks at l=50, 0 at l=0 or 100
    const weight = 0.02 + 0.83 * satWeight + 0.15 * lightnessWeight;

    if (s < 8) {
      achromatic.weight += weight;
      achromatic.rSum += r * weight;
      achromatic.gSum += g * weight;
      achromatic.bSum += b * weight;
    } else {
      const bucketIdx = Math.min(numBuckets - 1, Math.floor(h / hueBucketSize));
      buckets[bucketIdx].weight += weight;
      buckets[bucketIdx].rSum += r * weight;
      buckets[bucketIdx].gSum += g * weight;
      buckets[bucketIdx].bSum += b * weight;
    }
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    // No pixels at all (fully transparent image) — fall back to mid-gray.
    return { hex: '#808080', h: 0, s: 0, l: 50 };
  }

  let winner = achromatic;
  for (const bucket of buckets) {
    if (bucket.weight > winner.weight) winner = bucket;
  }

  const r = winner.rSum / winner.weight;
  const g = winner.gSum / winner.weight;
  const b = winner.bSum / winner.weight;
  const hsl = rgbToHsl({ r, g, b });
  return { hex: hslToHex(hsl), h: hsl.h, s: hsl.s, l: hsl.l };
}

/**
 * DOM-dependent: draws an image element to an offscreen canvas, reads its
 * pixel data, and extracts the dominant color. Not unit-testable (requires
 * a browser canvas), kept as a thin wrapper around the pure function above.
 *
 * @param {HTMLImageElement} imgEl
 * @param {{maxDimension?: number}} [opts] downscale large images for speed
 * @returns {{hex:string, h:number, s:number, l:number}}
 */
export function extractDominantColorFromImage(imgEl, opts = {}) {
  if (typeof document === 'undefined') {
    throw new Error('extractDominantColorFromImage requires a DOM/canvas environment');
  }
  const maxDimension = opts.maxDimension ?? 150;
  const scale = Math.min(1, maxDimension / Math.max(imgEl.naturalWidth || imgEl.width, imgEl.naturalHeight || imgEl.height));
  const w = Math.max(1, Math.round((imgEl.naturalWidth || imgEl.width) * scale));
  const h = Math.max(1, Math.round((imgEl.naturalHeight || imgEl.height) * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(imgEl, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  return extractDominantColor(data);
}
