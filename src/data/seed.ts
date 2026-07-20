import type { ChecklistGroup, Member, Trip } from '../types'

/**
 * Realistic Hebrew packing checklist (~3 groups, mixed owners, some done).
 * `prefix` keeps item/group ids unique per trip (used by seed AND the persist
 * migration that back-fills existing trips).
 */
export function makeDefaultChecklist(prefix: string): ChecklistGroup[] {
  return [
    {
      id: `${prefix}-g-clothes`,
      name: 'בגדים',
      emoji: '👕',
      items: [
        { id: `${prefix}-c1`, label: 'בגדים לכל יום', owner: 'all', done: true },
        { id: `${prefix}-c2`, label: 'בגדי ים', owner: 'm-child', done: true },
        { id: `${prefix}-c3`, label: 'סווטשרט לערב', owner: 'all', done: false },
        { id: `${prefix}-c4`, label: 'נעלי הליכה', owner: 'm-parent', done: false },
      ],
    },
    {
      id: `${prefix}-g-sun`,
      name: 'רחצה ושמש',
      emoji: '🧴',
      items: [
        { id: `${prefix}-s1`, label: 'קרם הגנה', owner: 'm-parent', done: true },
        { id: `${prefix}-s2`, label: 'מגבות לבריכה', owner: 'm-child', done: false },
        { id: `${prefix}-s3`, label: 'כובעים', owner: 'all', done: false },
      ],
    },
    {
      id: `${prefix}-g-docs`,
      name: 'מסמכים והזמנות',
      emoji: '🎫',
      items: [
        { id: `${prefix}-d1`, label: 'תעודות זהות', owner: 'm-parent', done: true },
        { id: `${prefix}-d2`, label: 'אישור הזמנת מלון', owner: 'm-parent', done: true },
        { id: `${prefix}-d3`, label: 'כרטיסים לאטרקציות', owner: 'm-parent', done: false },
      ],
    },
  ]
}

/** SVG placeholder "photo" — aged-paper rectangle with a caption-free scene. */
function photoSvg(hue: string, label: string): string {
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 150'>
    <rect width='200' height='150' fill='${hue}'/>
    <rect x='0' y='105' width='200' height='45' fill='rgba(0,0,0,.12)'/>
    <circle cx='150' cy='40' r='20' fill='rgba(255,255,255,.6)'/>
    <path d='M0 120 L60 80 L110 110 L160 70 L200 100 L200 150 L0 150 Z' fill='rgba(0,0,0,.18)'/>
    <text x='12' y='140' font-family='Courier New' font-size='13' fill='rgba(255,255,255,.85)'>${label}</text>
  </svg>`
}

/** Local ISO date `days` days from today — keeps the demo drive trip upcoming. */
function isoInDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Galilee drive trip: starts ~2 weeks from now, 2 days long (fresh installs get
// an upcoming trip for the Home hero + מתוכננים tab; Santorini stays in the past).
const DRIVE_START = isoInDays(14)
const DRIVE_END = isoInDays(15)

export const SEED_MEMBERS: Member[] = [
  {
    id: 'm-parent',
    phone: '0501234567',
    name: 'אבא',
    role: 'מבוגר',
    figure: 'camera',
    color: 'linear-gradient(145deg,#42b8d4,#67d3bd)',
    email: 'aba@triptales.example',
  },
  {
    id: 'm-child',
    phone: '0527654321',
    name: 'בן',
    role: 'ילד',
    figure: 'surfboard',
    color: 'linear-gradient(145deg,#ff6b66,#ff9a78)',
  },
]

export const SEED_TRIPS: Trip[] = [
  {
    id: 't-flight',
    name: 'קיץ ביוון',
    destination: 'סנטוריני, יוון',
    startDate: '2025-07-10',
    endDate: '2025-07-15',
    transport: 'flight',
    order: 0,
    members: ['m-parent', 'm-child'],
    joinCode: 'GREEK7',
    checklist: makeDefaultChecklist('t-flight'),
    days: [
      {
        id: 't-flight-d1',
        date: '2025-07-10',
        title: 'יום ההגעה',
        activities: [
          { id: 't-flight-d1-a1', title: 'איסוף רכב שכור', time: '15:00', icon: '🚗', loc: 'שדה התעופה סנטוריני' },
          { id: 't-flight-d1-a2', title: 'צ׳ק-אין במלון', time: '16:30', icon: '🏨', loc: 'Oia, Santorini' },
          { id: 't-flight-d1-a3', title: 'ארוחת ערב מול השקיעה', time: '19:30', icon: '🍽️', loc: 'Ambrosia Restaurant, Oia', notes: 'להזמין מקום ליד המעקה' },
        ],
        entries: [
          {
            id: 'e1',
            text: 'המראה חלקה ונחיתה מושלמת. הים כחול כמו בגלויות!',
            mood: '😍',
            loc: 'שדה התעופה סנטוריני',
            author: 'm-parent',
            ts: Date.parse('2025-07-10T14:00:00'),
            reacts: { '❤️': ['m-child'], '😮': ['m-child'] },
          },
        ],
        photos: [
          {
            id: 'p1',
            svg: photoSvg('#4a86b8', 'Santorini'),
            caption: 'המבט הראשון על הקלדרה',
            fav: true,
            by: 'm-parent',
            status: 'approved',
            reacts: { '⭐': ['m-child'] },
          },
          {
            id: 'p2',
            svg: photoSvg('#c98a5a', 'Sunset'),
            caption: 'שקיעה מהמרפסת (מחכה לאישור)',
            fav: false,
            by: 'm-child',
            status: 'pending',
            reacts: {},
          },
        ],
      },
      {
        id: 't-flight-d2',
        date: '2025-07-11',
        title: 'שיט בקלדרה',
        activities: [
          { id: 't-flight-d2-a1', title: 'שיט אל ההר הגעשי', time: '10:00', icon: '⛵', loc: 'Old Port, Fira' },
          { id: 't-flight-d2-a2', title: 'רחצה במעיינות החמים', time: '12:00', icon: '🌊' },
          { id: 't-flight-d2-a3', title: 'צהריים בטברנה', time: '14:00', icon: '🍽️', loc: 'To Psaraki, Vlychada' },
        ],
        entries: [
          {
            id: 'e2',
            text: 'שחינו במעיינות החמים ליד ההר הגעשי.',
            mood: '🌊',
            author: 'm-parent',
            ts: Date.parse('2025-07-11T11:30:00'),
            reacts: { '🍦': ['m-child'] },
          },
        ],
        photos: [
          {
            id: 'p3',
            svg: photoSvg('#2f7d8c', 'Volcano'),
            caption: 'ההר הגעשי מקרוב',
            fav: false,
            by: 'm-parent',
            status: 'approved',
            reacts: {},
          },
        ],
      },
      {
        id: 't-flight-d3',
        date: '2025-07-15',
        title: 'יום החזרה',
        activities: [
          { id: 't-flight-d3-a1', title: 'קניות מזכרות בפירה', time: '09:00', icon: '🛍️', loc: 'Fira, Santorini' },
          { id: 't-flight-d3-a2', title: 'החזרת רכב', time: '12:00', icon: '🚗', loc: 'שדה התעופה סנטוריני' },
        ],
        entries: [],
        photos: [],
      },
    ],
  },
  {
    id: 't-drive',
    name: 'סופ"ש בגליל',
    destination: 'ראש פינה',
    startDate: DRIVE_START,
    endDate: DRIVE_END,
    transport: 'drive',
    order: 1,
    members: ['m-parent', 'm-child'],
    joinCode: 'SUNSET',
    checklist: makeDefaultChecklist('t-drive'),
    days: [
      {
        id: 't-drive-d1',
        date: DRIVE_START,
        title: 'יוצאים צפונה',
        activities: [
          { id: 't-drive-d1-a1', title: 'טיול בשמורת החולה', time: '11:00', icon: '🦩', loc: 'שמורת החולה' },
          { id: 't-drive-d1-a2', title: 'צהריים בחאן', time: '13:30', icon: '🍽️', loc: 'דובזה, ראש פינה', notes: 'חומוס מעולה' },
          { id: 't-drive-d1-a3', title: 'סיור ברחוב העתיק', time: '17:00', icon: '🏘️', loc: 'הרחוב העתיק, ראש פינה' },
        ],
        entries: [
          {
            id: 'e3',
            text: 'הדרך הייתה ארוכה אבל הנוף שווה כל דקה.',
            mood: '🚗',
            loc: 'ראש פינה',
            author: 'm-parent',
            ts: Date.parse(`${DRIVE_START}T10:00:00`),
            reacts: { '👍': ['m-child'] },
          },
        ],
        photos: [
          {
            id: 'p4',
            svg: photoSvg('#6b8f3a', 'Galilee'),
            caption: 'שדות הגליל',
            fav: true,
            by: 'm-parent',
            status: 'approved',
            reacts: { '❤️': ['m-child'] },
          },
        ],
      },
      {
        id: 't-drive-d2',
        date: DRIVE_END,
        title: 'חוזרים הביתה',
        activities: [
          { id: 't-drive-d2-a1', title: 'ארוחת בוקר במאפייה', time: '09:00', icon: '🥐', loc: 'מאפיית ראש פינה' },
          { id: 't-drive-d2-a2', title: 'עצירה בכנרת', time: '11:30', icon: '🏖️', loc: 'חוף הכנרת' },
        ],
        entries: [],
        photos: [
          {
            id: 'p5',
            svg: photoSvg('#8a6a3a', 'Old street'),
            caption: 'הרחוב העתיק (מחכה לאישור)',
            fav: false,
            by: 'm-child',
            status: 'pending',
            reacts: {},
          },
        ],
      },
    ],
  },
]
