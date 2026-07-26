/**
 * Per-trip colour palettes (Galli feedback).
 *
 * The default "Coral Journey" palette is the app's base `:root` — a trip with no
 * `paletteId` (or `paletteId: 'coral'`) uses it unchanged. Every other palette
 * REMAPS the accent tokens plus the canvas/border tint, applied as inline CSS
 * custom properties (see `App.tsx` for trips and `Dashboard.tsx` for home).
 *
 * DARK MODE: the same palettes work at night, but only their ACCENTS are used.
 * The dark neutrals (`--canvas`, `--paper`, `--ink`, `--line`) come from the
 * `[data-theme='dark']` block in `index.css`, because a palette's light canvas
 * and near-black ink would be unreadable there. The canvas still receives a
 * gentle tint of the palette so each trip keeps its own character.
 */

import type { CSSProperties } from 'react'

/** The five colours a palette is built from. */
export interface PaletteColors {
  primary: string
  sea: string
  sun: string
  lilac: string
  /** Text/ink colour — used in LIGHT mode only. */
  ink: string
}

export interface Palette {
  id: string
  name: { he: string; en: string }
  /** Swatch strip shown in the picker. */
  swatch: string[]
  /** `null` for the base 'coral' palette, which uses the stylesheet as-is. */
  colors: PaletteColors | null
}

/** Neutral bases the palette tints are mixed into, per theme. */
const LIGHT_CANVAS = '#f4f7fb'
const LIGHT_LINE = '#e9ebf2'
const DARK_CANVAS = '#12151f'
const DARK_PAPER = '#1b2030'
const DARK_LINE = '#2b3244'

export const PALETTES: Palette[] = [
  {
    id: 'coral',
    name: { he: 'Coral Journey (ברירת מחדל)', en: 'Coral Journey (default)' },
    swatch: ['#20243a', '#42b8d4', '#8b80db', '#f5bd4d', '#ff8b72', '#ff6b66'],
    colors: null, // uses the base :root — no overrides
  },
  {
    id: 'sunset',
    name: { he: 'שקיעה', en: 'Sunset' },
    swatch: ['#1C3352', '#23ACAF', '#F7D225', '#F69725', '#E7514B', '#E43132', '#682122', '#E1A052'],
    colors: { primary: '#E7514B', sea: '#23ACAF', sun: '#F7D225', lilac: '#E1A052', ink: '#1C1A1F' },
  },
  {
    id: 'lagoon',
    name: { he: 'לגונה', en: 'Lagoon' },
    swatch: ['#051F44', '#086078', '#06B2D2', '#21DB96', '#8FD12A', '#FDA802', '#FC4B04', '#EC2A35'],
    colors: { primary: '#EC2A35', sea: '#06B2D2', sun: '#FDA802', lilac: '#21DB96', ink: '#051F44' },
  },
  {
    id: 'orchid',
    name: { he: 'סחלב', en: 'Orchid' },
    swatch: ['#491B68', '#602A8B', '#8B76BA', '#C50260', '#BB0356', '#ECB511', '#D36C02', '#AE9CC9'],
    colors: { primary: '#C50260', sea: '#602A8B', sun: '#ECB511', lilac: '#8B76BA', ink: '#491B68' },
  },
  {
    id: 'coast',
    name: { he: 'חוף', en: 'Coast' },
    swatch: ['#08183A', '#3D5A8B', '#7A9EC6', '#247375', '#87B761', '#F1BB02', '#EC5433'],
    colors: { primary: '#EC5433', sea: '#247375', sun: '#F1BB02', lilac: '#7A9EC6', ink: '#08183A' },
  },
  {
    id: 'mono',
    name: { he: 'שחור־לבן', en: 'Monochrome' },
    swatch: ['#111318', '#3A3F4B', '#6B7280', '#9CA3AF', '#D1D5DB', '#F3F4F6'],
    colors: { primary: '#3A3F4B', sea: '#6B7280', sun: '#9CA3AF', lilac: '#4B5563', ink: '#111318' },
  },
]

const BY_ID = new Map(PALETTES.map((p) => [p.id, p]))

/** '#rgb' | '#rrggbb' → [r, g, b], or null when unparseable. */
function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1]
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

/** Perceived luminance on 0–1. */
function luminance(hex: string): number {
  const rgb = parseHex(hex)
  if (!rgb) return 1
  return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255
}

/** Blend a colour toward white by `amount` (0–1). */
function lighten(hex: string, amount: number): string {
  const rgb = parseHex(hex)
  if (!rgb) return hex
  const to = (c: number) => Math.round(c + (255 - c) * amount)
  return `#${rgb.map((c) => to(c).toString(16).padStart(2, '0')).join('')}`
}

/**
 * An accent that is legible on a DARK surface.
 *
 * Dark accents (the Monochrome palette's charcoal, Orchid's deep magenta) all
 * but disappear against the night canvas — activity times and the transport icon
 * became unreadable (Galli feedback). Anything below the threshold is lifted
 * toward white; already-vivid accents are left exactly as they are.
 */
const DARK_ACCENT_MIN_LUM = 0.28
function forDark(hex: string): string {
  return luminance(hex) < DARK_ACCENT_MIN_LUM ? lighten(hex, 0.45) : hex
}

/** The palette for a trip (defaults to the base 'coral' palette). */
export function paletteById(id: string | undefined): Palette {
  return (id && BY_ID.get(id)) || PALETTES[0]
}

/**
 * CSS-variable overrides for a palette, in the given theme.
 * Returns an empty object for the base 'coral' palette (the stylesheet already
 * defines it for both themes).
 */
export function paletteVars(id: string | undefined, dark = false): CSSProperties {
  const { colors } = paletteById(id)
  if (!colors) return {}
  const raw = colors
  // At night, lift accents that would be invisible on the dark canvas.
  const primary = dark ? forDark(raw.primary) : raw.primary
  const sea = dark ? forDark(raw.sea) : raw.sea
  const sun = dark ? forDark(raw.sun) : raw.sun
  const lilac = dark ? forDark(raw.lilac) : raw.lilac
  const ink = raw.ink
  const surface = dark ? DARK_PAPER : 'white'
  const softPct = dark ? 24 : 13

  const vars: Record<string, string> = {
    '--coral': primary,
    '--coral-2': `color-mix(in srgb, ${primary} 62%, white)`,
    '--coral-soft': `color-mix(in srgb, ${primary} ${softPct}%, ${surface})`,
    '--sea': sea,
    '--sea-soft': `color-mix(in srgb, ${sea} ${softPct}%, ${surface})`,
    '--sun': sun,
    '--lilac': lilac,
    // Tint the canvas/borders so the palette is unmistakable, mixed into the
    // neutral base of whichever theme is active.
    '--canvas': dark
      ? `color-mix(in srgb, ${primary} 10%, ${DARK_CANVAS})`
      : `color-mix(in srgb, ${primary} 15%, ${LIGHT_CANVAS})`,
    '--line': dark
      ? `color-mix(in srgb, ${primary} 18%, ${DARK_LINE})`
      : `color-mix(in srgb, ${primary} 22%, ${LIGHT_LINE})`,
  }

  // The palette's ink is a near-black chosen for light backgrounds; at night the
  // dark theme's own light-on-dark text colour must win instead.
  if (!dark) vars['--ink'] = ink

  return vars as CSSProperties
}
