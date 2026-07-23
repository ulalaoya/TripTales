/**
 * Per-trip colour palettes (Galli feedback).
 *
 * The default "Coral Journey" palette is the app's base `:root` — a trip with no
 * `paletteId` (or `paletteId: 'coral'`) uses it unchanged. Each alternative
 * palette REMAPS only the accent tokens (`--coral` + its gradient/soft tints,
 * `--sea`, `--sun`, `--lilac`) and the dark `--ink`, while the light neutral
 * structure (white cards, cool canvas, borders, success/danger) stays put so the
 * app remains legible and consistent whatever palette a trip wears.
 *
 * The overrides are applied as inline CSS custom properties on the in-trip
 * layout wrapper (see `App.tsx`), so they cascade to every screen of that trip
 * and nowhere else.
 */

import type { CSSProperties } from 'react'

export interface Palette {
  id: string
  name: { he: string; en: string }
  /** Swatch strip shown in the picker (left→right, dark→light-ish). */
  swatch: string[]
  /** CSS custom-property overrides. Empty for the base 'coral' palette. */
  vars: Record<string, string>
}

/** Build the accent overrides from a few key colours (soft/gradient tints via color-mix). */
function accents(primary: string, sea: string, sun: string, lilac: string, ink: string): Record<string, string> {
  return {
    '--coral': primary,
    '--coral-2': `color-mix(in srgb, ${primary} 62%, white)`,
    '--coral-soft': `color-mix(in srgb, ${primary} 13%, white)`,
    '--sea': sea,
    '--sea-soft': `color-mix(in srgb, ${sea} 13%, white)`,
    '--sun': sun,
    '--lilac': lilac,
    '--ink': ink,
  }
}

export const PALETTES: Palette[] = [
  {
    id: 'coral',
    name: { he: 'Coral Journey (ברירת מחדל)', en: 'Coral Journey (default)' },
    swatch: ['#20243a', '#42b8d4', '#8b80db', '#f5bd4d', '#ff8b72', '#ff6b66'],
    vars: {}, // uses the base :root — no overrides
  },
  {
    id: 'sunset',
    name: { he: 'שקיעה', en: 'Sunset' },
    swatch: ['#1C3352', '#23ACAF', '#F7D225', '#F69725', '#E7514B', '#E43132', '#682122', '#E1A052'],
    vars: accents('#E7514B', '#23ACAF', '#F7D225', '#E1A052', '#1C1A1F'),
  },
  {
    id: 'lagoon',
    name: { he: 'לגונה', en: 'Lagoon' },
    swatch: ['#051F44', '#086078', '#06B2D2', '#21DB96', '#8FD12A', '#FDA802', '#FC4B04', '#EC2A35'],
    vars: accents('#EC2A35', '#06B2D2', '#FDA802', '#21DB96', '#051F44'),
  },
  {
    id: 'orchid',
    name: { he: 'סחלב', en: 'Orchid' },
    swatch: ['#491B68', '#602A8B', '#8B76BA', '#C50260', '#BB0356', '#ECB511', '#D36C02', '#AE9CC9'],
    vars: accents('#C50260', '#602A8B', '#ECB511', '#8B76BA', '#491B68'),
  },
  {
    id: 'coast',
    name: { he: 'חוף', en: 'Coast' },
    swatch: ['#08183A', '#3D5A8B', '#7A9EC6', '#247375', '#87B761', '#F1BB02', '#EC5433'],
    vars: accents('#EC5433', '#247375', '#F1BB02', '#7A9EC6', '#08183A'),
  },
]

const BY_ID = new Map(PALETTES.map((p) => [p.id, p]))

/** The palette for a trip (defaults to the base 'coral' palette). */
export function paletteById(id: string | undefined): Palette {
  return (id && BY_ID.get(id)) || PALETTES[0]
}

/** CSS-variable overrides to apply on a trip's screens (empty object for 'coral'). */
export function paletteVars(id: string | undefined): CSSProperties {
  return paletteById(id).vars as CSSProperties
}
