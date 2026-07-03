// Real verification for js/export-formats.js — confirms each export format
// produces valid, correctly-structured output for a known input palette.
import assert from 'node:assert/strict';
import { toCssCustomProperties, toTailwindConfig, toStyleDictionaryJson, exportPalette, EXPORT_FORMATS } from '../js/export-formats.js';

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

const PALETTE = [
  { name: 'base', hex: '#3366cc' },
  { name: 'complement', hex: '#cc9933' },
];

check('toCssCustomProperties produces a valid :root block with both colors', () => {
  const css = toCssCustomProperties(PALETTE);
  assert.match(css, /^:root \{/);
  assert.match(css, /--color-base: #3366cc;/);
  assert.match(css, /--color-complement: #cc9933;/);
  assert.match(css, /\}\s*$/);
  // Every declaration line ends with a semicolon (valid CSS custom prop syntax)
  const declLines = css.split('\n').filter((l) => l.trim().startsWith('--'));
  assert.equal(declLines.length, 2);
  for (const line of declLines) assert.match(line.trim(), /;$/);
});

check('toTailwindConfig produces a valid, parseable-as-JS-object-literal colors block', () => {
  const cfg = toTailwindConfig(PALETTE);
  assert.match(cfg, /module\.exports = \{/);
  assert.match(cfg, /colors: \{/);
  assert.match(cfg, /base: '#3366cc',/);
  assert.match(cfg, /complement: '#cc9933',/);
  // Sanity-check it's syntactically valid JS by actually evaluating the full
  // "module.exports = {...};" statement against a fake module object, the
  // same way Node's CommonJS loader would.
  const fakeModule = { exports: {} };
  new Function('module', cfg)(fakeModule);
  const parsed = fakeModule.exports;
  assert.equal(parsed.theme.extend.colors.base, '#3366cc');
  assert.equal(parsed.theme.extend.colors.complement, '#cc9933');
});

check('toStyleDictionaryJson produces valid, parseable JSON with the correct nested shape', () => {
  const json = toStyleDictionaryJson(PALETTE);
  const parsed = JSON.parse(json); // throws if invalid JSON
  assert.equal(parsed.color.base.value, '#3366cc');
  assert.equal(parsed.color.complement.value, '#cc9933');
});

check('slug generation handles names with spaces/mixed case/numbers safely across all formats', () => {
  const messy = [{ name: 'Analogous 1', hex: '#112233' }, { name: 'Tone_2', hex: '#445566' }];
  const css = toCssCustomProperties(messy);
  assert.match(css, /--color-analogous-1: #112233;/);
  assert.match(css, /--color-tone-2: #445566;/);

  const tw = toTailwindConfig(messy);
  const fakeModule = { exports: {} };
  new Function('module', tw)(fakeModule);
  const parsed = fakeModule.exports;
  assert.ok('analogous1' in parsed.theme.extend.colors || 'analogous-1' in parsed.theme.extend.colors);

  const sd = JSON.parse(toStyleDictionaryJson(messy));
  assert.equal(sd.color['analogous-1'].value, '#112233');
  assert.equal(sd.color['tone-2'].value, '#445566');
});

check('exportPalette dispatches correctly for every documented format', () => {
  for (const format of EXPORT_FORMATS) {
    const out = exportPalette(PALETTE, format);
    assert.equal(typeof out, 'string');
    assert.ok(out.length > 0);
  }
});

check('exportPalette throws on an unknown format', () => {
  assert.throws(() => exportPalette(PALETTE, 'not-a-format'));
});

check('all three formats include every color from a larger 4-color palette (tetradic-sized)', () => {
  const four = [
    { name: 'base', hex: '#111111' },
    { name: 'tetradic-1', hex: '#222222' },
    { name: 'tetradic-2', hex: '#333333' },
    { name: 'tetradic-3', hex: '#444444' },
  ];
  const css = toCssCustomProperties(four);
  const tw = toTailwindConfig(four);
  const sd = JSON.parse(toStyleDictionaryJson(four));
  for (const c of four) {
    assert.match(css, new RegExp(c.hex));
    assert.match(tw, new RegExp(c.hex));
    assert.ok(Object.values(sd.color).some((v) => v.value === c.hex));
  }
});

console.log(`\n${passed} check(s) passed.`);
if (process.exitCode) {
  console.error('\nSOME CHECKS FAILED');
  process.exit(1);
} else {
  console.log('\nALL CHECKS PASSED');
}
