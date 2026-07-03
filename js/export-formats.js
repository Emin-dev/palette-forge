// export-formats.js — pure functions turning a palette object into three
// export formats: CSS custom properties, a Tailwind config snippet, and
// Style Dictionary JSON. Node-testable, no DOM dependency.

/**
 * @typedef {{name:string, hex:string}} NamedColor
 */

/**
 * Convert a human label ("analogous-1") into a CSS-custom-property-safe /
 * Tailwind-key-safe slug ("analogous-1" stays as-is; spaces/invalid chars
 * are stripped).
 */
function slugify(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'color';
}

/**
 * @param {NamedColor[]} colors
 * @returns {string} a `:root { --color-x: #...; }` block
 */
export function toCssCustomProperties(colors) {
  const lines = colors.map((c) => `  --color-${slugify(c.name)}: ${c.hex};`);
  return `:root {\n${lines.join('\n')}\n}\n`;
}

/**
 * @param {NamedColor[]} colors
 * @returns {string} a Tailwind `theme.extend.colors` config snippet
 */
export function toTailwindConfig(colors) {
  const lines = colors.map((c) => `        ${slugify(c.name).replace(/-([a-z0-9])/g, (_, ch) => ch.toUpperCase())}: '${c.hex}',`);
  return `module.exports = {\n  theme: {\n    extend: {\n      colors: {\n${lines.join('\n')}\n      },\n    },\n  },\n};\n`;
}

/**
 * @param {NamedColor[]} colors
 * @returns {string} Style Dictionary-shaped JSON, e.g.
 *   { "color": { "primary": { "value": "#..." } } }
 */
export function toStyleDictionaryJson(colors) {
  const color = {};
  for (const c of colors) {
    color[slugify(c.name)] = { value: c.hex };
  }
  return JSON.stringify({ color }, null, 2) + '\n';
}

export const EXPORT_FORMATS = ['css', 'tailwind', 'style-dictionary'];

/**
 * @param {NamedColor[]} colors
 * @param {'css'|'tailwind'|'style-dictionary'} format
 * @returns {string}
 */
export function exportPalette(colors, format) {
  switch (format) {
    case 'css': return toCssCustomProperties(colors);
    case 'tailwind': return toTailwindConfig(colors);
    case 'style-dictionary': return toStyleDictionaryJson(colors);
    default:
      throw new Error(`exportPalette: unknown format "${format}"`);
  }
}
