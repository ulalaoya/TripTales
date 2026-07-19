import type { Figure } from '../types'

/**
 * R8 — Avatar glyphs.
 * 4 sets x 8 figures = 32 mono-stroke glyphs.
 * Each `svg` is the inner markup of a 24x24 icon rendered with:
 *   stroke="currentColor" fill="none" stroke-width="1.8"
 *   stroke-linecap="round" stroke-linejoin="round"
 * Drawn by hand from the prompt's set lists (NOT rasterized from Icons.png).
 */

export interface Glyph {
  id: Figure
  label: string
  svg: string
}

export interface AvSet {
  id: string
  name: string
  glyphs: Glyph[]
}

/**
 * The 6 member avatar backgrounds (R8) — gradient rounded-square fills.
 * Four come straight from the prototype's avatar palette (lilac / coral / sea /
 * sun); the last two are derived ONLY from existing design tokens:
 *   ink → #20243a→#4a5070, success → #3dbd86→#6fd4a8.
 */
export const AVATAR_GRADIENTS = [
  'linear-gradient(145deg,#8b80db,#b09de7)', // lilac
  'linear-gradient(145deg,#ff6b66,#ff9a78)', // coral
  'linear-gradient(145deg,#42b8d4,#67d3bd)', // sea
  'linear-gradient(145deg,#f5bd4d,#f19845)', // sun
  'linear-gradient(145deg,#20243a,#4a5070)', // ink
  'linear-gradient(145deg,#3dbd86,#6fd4a8)', // success
] as const
export type AvatarGradient = (typeof AVATAR_GRADIENTS)[number]

export const AVSETS: AvSet[] = [
  {
    id: 'classic',
    name: 'קלאסי',
    glyphs: [
      { id: 'crown', label: 'כתר', svg: '<path d="M3 9l4 4 5-6 5 6 4-4v9H3z"/><path d="M3 20h18"/>' },
      { id: 'stiletto', label: 'עקב', svg: '<path d="M4 15h10l6 2"/><path d="M14 15c0-3 3-4 5-5"/><path d="M20 17l-1 2H6l-2-4"/><path d="M9 8c-1-1.5-3.5-.6-3.5 1C5.5 10.5 9 12 9 12s3.5-1.5 3.5-3c0-1.6-2.5-2.5-3.5-1z"/>' },
      { id: 'capstar', label: 'כובע', svg: '<path d="M3 13a9 5 0 0 0 18 0"/><path d="M4 13c0-4 4-7 8-7s8 3 8 7"/><path d="M12 3l1 2 2 .3-1.5 1.4.4 2-1.9-1-1.9 1 .4-2L9 5.3 11 5z"/>' },
      { id: 'bow', label: 'פפיון', svg: '<path d="M12 12l-7-4v8z"/><path d="M12 12l7-4v8z"/><circle cx="12" cy="12" r="2"/>' },
      { id: 'camera', label: 'מצלמה', svg: '<path d="M3 8h4l1.5-2h7L17 8h4v11H3z"/><circle cx="12" cy="13" r="3.2"/>' },
      { id: 'flower', label: 'פרח', svg: '<circle cx="12" cy="9" r="2.4"/><circle cx="8" cy="12" r="2.4"/><circle cx="16" cy="12" r="2.4"/><circle cx="10" cy="15.5" r="2.4"/><circle cx="14" cy="15.5" r="2.4"/><path d="M12 18v3"/>' },
      { id: 'star', label: 'כוכב', svg: '<path d="M12 3l2.7 5.6 6 .9-4.4 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6L3.3 9.5l6-.9z"/>' },
      { id: 'paw', label: 'כף רגל', svg: '<circle cx="7" cy="9" r="1.8"/><circle cx="12" cy="7" r="1.8"/><circle cx="17" cy="9" r="1.8"/><path d="M12 11c-3 0-5 2.4-5 4.4S9 19 12 19s5-1.6 5-3.6S15 11 12 11z"/>' },
    ],
  },
  {
    id: 'nature',
    name: 'טבע',
    glyphs: [
      { id: 'mountains', label: 'הרים', svg: '<circle cx="17" cy="7" r="2.4"/><path d="M3 19l5-8 4 5 3-4 6 7z"/>' },
      { id: 'branch', label: 'ענף', svg: '<path d="M12 21V6"/><path d="M12 12c-3 0-5-2-5-5 3 0 5 2 5 5z"/><path d="M12 15c3 0 5-2 5-5-3 0-5 2-5 5z"/>' },
      { id: 'tent', label: 'אוהל', svg: '<path d="M12 5L3 19h18z"/><path d="M12 5v14"/><path d="M9 19l3-5 3 5"/>' },
      { id: 'butterfly', label: 'פרפר', svg: '<path d="M12 6v12"/><path d="M12 9c-1-3-7-4-8-1s3 6 8 3z"/><path d="M12 9c1-3 7-4 8-1s-3 6-8 3z"/><path d="M12 15c-1 2-6 3-7 1M12 15c1 2 6 3 7 1"/>' },
      { id: 'campfire', label: 'מדורה', svg: '<path d="M12 4c2 3 3 4 3 7a3 3 0 0 1-6 0c0-1 .5-2 1-2.5C10 10 12 9 12 4z"/><path d="M5 20l14-4M19 20L5 16"/>' },
      { id: 'daisy', label: 'חיננית', svg: '<circle cx="12" cy="12" r="2"/><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/>' },
      { id: 'plane', label: 'מטוס נייר', svg: '<path d="M21 3L3 11l7 2 2 7z"/><path d="M21 3l-9 10"/>' },
      { id: 'leaf', label: 'עלה', svg: '<path d="M20 4C10 4 4 10 4 20c10 0 16-6 16-16z"/><path d="M4 20L15 9"/>' },
    ],
  },
  {
    id: 'minimal',
    name: 'מינימליסטי',
    glyphs: [
      { id: 'person', label: 'אדם', svg: '<circle cx="12" cy="8" r="3.2"/><path d="M5 20c0-4 3-6 7-6s7 2 7 6"/>' },
      { id: 'heart', label: 'לב', svg: '<path d="M12 20S4 14.5 4 9a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 5.5-8 11-8 11z"/>' },
      { id: 'bolt', label: 'ברק', svg: '<path d="M13 3L5 13h5l-1 8 8-11h-5z"/>' },
      { id: 'sparkle', label: 'נצנוץ', svg: '<path d="M12 3c1 5 3 7 8 8-5 1-7 3-8 8-1-5-3-7-8-8 5-1 7-3 8-8z"/>' },
      { id: 'glasses', label: 'משקפיים', svg: '<circle cx="7" cy="13" r="3.2"/><circle cx="17" cy="13" r="3.2"/><path d="M10.2 12.5h3.6M3.8 12l1.5-2M20.2 12l-1.5-2"/>' },
      { id: 'chat', label: 'בועה', svg: '<path d="M4 5h16v11H9l-4 4V5z"/><path d="M8 9h8M8 12h5"/>' },
      { id: 'music', label: 'תו', svg: '<path d="M9 18V6l9-2v12"/><circle cx="7" cy="18" r="2.2"/><circle cx="16" cy="16" r="2.2"/>' },
      { id: 'smiley', label: 'חיוך', svg: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.5c1 1.5 6 1.5 7 0"/><path d="M9 10h.01M15 10h.01"/>' },
    ],
  },
  {
    id: 'travel',
    name: 'טיולים',
    glyphs: [
      { id: 'suitcase', label: 'מזוודה', svg: '<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M9 8V5h6v3M12 8v12"/>' },
      { id: 'sunhat', label: 'כובע שמש', svg: '<path d="M8 13c0-3 1-6 4-6s4 3 4 6"/><path d="M3 14a9 4 0 0 0 18 0"/><path d="M3 14a9 4 0 0 1 18 0"/>' },
      { id: 'surfboard', label: 'גלשן', svg: '<path d="M5 19C5 9 12 4 19 5c1 7-4 14-14 14z"/><path d="M8 16C8 11 11 8 15 7"/>' },
      { id: 'icecream', label: 'גלידה', svg: '<path d="M7 9a5 5 0 0 1 10 0z"/><path d="M8 10l4 11 4-11"/>' },
      { id: 'signpost', label: 'תמרור', svg: '<path d="M12 3v18"/><path d="M12 6h7l2 2-2 2h-7z"/><path d="M12 12H5l-2 2 2 2h7z"/>' },
      { id: 'sunglasses', label: 'משקפי שמש', svg: '<path d="M3 9h18l-1 3a3.5 3.5 0 0 1-6.7.5h-2.6A3.5 3.5 0 0 1 4 12z"/><path d="M10.7 12.5h2.6"/>' },
      { id: 'balloon', label: 'כדור פורח', svg: '<circle cx="12" cy="9" r="6.5"/><path d="M9 14l1.5 3h3L15 14"/><path d="M11 17v3M13 17v3"/>' },
      { id: 'lifebuoy', label: 'גלגל הצלה', svg: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.2"/><path d="M12 3.5v5M12 15.5v5M3.5 12h5M15.5 12h5"/>' },
    ],
  },
]

/** Flat lookup of every glyph by figure id. */
export const GLYPH_BY_ID: Record<string, Glyph> = Object.fromEntries(
  AVSETS.flatMap((s) => s.glyphs).map((g) => [g.id, g]),
) as Record<string, Glyph>
