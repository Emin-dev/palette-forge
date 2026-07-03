# Palette Forge

A real, algorithmic color-theory palette generator. Pick a base color (or
upload a reference image) and get real color-wheel-math harmony palettes,
real WCAG contrast-ratio checking, and export as CSS custom properties,
Tailwind config, or Style Dictionary JSON.

Try it live: https://emin-dev.github.io/palette-forge/

## Honest framing

This category is already served by excellent, free, mature tools —
**Coolors** and **Adobe Color** chief among them. Market research explicitly
called a color-palette generator "better used as a filler item than a
flagship" given how saturated and well-served this space already is, and
scored the concept low on real market evidence.

Palette Forge exists for catalog/category-diversity value and because it's
a genuinely quick, honest, zero-backend build — not because it's expected
to out-compete Coolors. What *is* real here: the color-wheel math, the WCAG
contrast formula, and the export formats. Nothing is faked or approximated.

**No accounts. No cloud save. No saved-palette history.** This is a
deliberate scope cut, not a missing feature: the original pitch's
monetizable hook (unlimited saved palettes, private profiles, cloud
history) needs accounts + a database, which this catalog has explicitly
cut other concepts for before ("Phase 2 hides a paid server"). Palette
Forge instead ships purely static, one-shot generation and export, 100%
client-side.

## What's real

- **Color math** (`js/color-math.js`) — exact hex↔RGB↔HSL conversion, the
  real formulas (not approximated), round-trip tested.
- **Harmonies** (`js/harmonies.js`) — real HSL hue-rotation math:
  complementary (180°), analogous (±30°), triadic (120°/240°), tetradic
  (90°/180°/270°), and a monochromatic tint/shade ramp (fixed hue/
  saturation, varying lightness).
- **WCAG contrast** (`js/contrast.js`) — the actual WCAG 2.x relative-
  luminance and contrast-ratio formulas, verified against known reference
  values (black-on-white is exactly 21:1; `#767676` on white is ~4.54:1,
  the classic "just passes AA" gray). Every swatch is labeled AA/AAA
  pass/fail for both normal and large text, at the real threshold
  boundaries (4.5:1, 3:1, 7:1).
- **Image color extraction** (`js/image-extract.js`) — real pixel-data
  analysis: reads an uploaded image via canvas, buckets pixels into an HSL
  hue grid weighted toward saturated/vibrant pixels (so a small vivid
  region beats a numerically larger dull/gray background), and returns the
  winning bucket's averaged color. The bucketing/averaging algorithm
  itself is separated from the canvas-reading code so it's fully
  Node-testable with synthetic pixel arrays.
- **Export formats** (`js/export-formats.js`) — real CSS custom
  properties, a real Tailwind `theme.extend.colors` config snippet, and
  real Style Dictionary-shaped JSON, all producing genuinely valid,
  parseable output.

## Running tests

```
node test/color-math.test.mjs
node test/contrast.test.mjs
node test/harmonies.test.mjs
node test/image-extract.test.mjs
node test/export-formats.test.mjs
node test/checkout.test.mjs
```

All six files must pass with zero failures. `test/contrast.test.mjs` is
the most safety-critical: a wrong WCAG calculation would make the whole
tool dishonest about accessibility, so it's checked against known
reference values (not just internal self-consistency) — including a
hand-computed independent check of `#0000EE` on white.

## Local dev

```
node server.mjs
```

Serves the static site at `http://127.0.0.1:8096`.

## Monetization

**Model: one-time purchase (BUY).** Not a subscription, not ads.

- **Free tier:** CSS custom properties export, complementary harmony only.
- **Paid tier:** a single one-time purchase ("Unlock full export bundle —
  $7") unlocks all 5 harmony types (analogous, triadic, tetradic,
  monochromatic) and the Tailwind config + Style Dictionary JSON export
  formats, persisted for that session/device.
- **Sandbox status: this is a demo checkout only.** `js/checkout.js`
  implements a real Luhn check, a real expiry-not-in-the-past check using
  the actual runtime clock, and real CVC format validation — but it never
  contacts a real payment provider. The designated test card
  `4000000000000002` always declines so the failure path can be demoed;
  any other Luhn-valid card succeeds and returns a reference code always
  prefixed `SANDBOX-`.

## Tech

Vanilla JavaScript (ES modules), no build step, no framework, no runtime
dependencies. Every module is pure and DOM-free except `main.js` (UI
wiring) and the canvas-reading half of `image-extract.js`.
