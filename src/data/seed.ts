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

/**
 * Bespoke packing checklist for the real week-long Galilee summer trip (t-drive).
 * Mirrors a genuine 7-day family trip: mixed owners, some already packed.
 */
function makeGalileeChecklist(): ChecklistGroup[] {
  return [
    {
      id: 't-drive-g-clothes',
      name: 'בגדים',
      emoji: '👕',
      items: [
        { id: 't-drive-c1', label: 'בגדים ל-7 ימים', owner: 'all', done: true },
        { id: 't-drive-c2', label: 'בגדי ים', owner: 'm-child', done: true },
        { id: 't-drive-c3', label: 'סווטשרט לערב', owner: 'all', done: false },
        { id: 't-drive-c4', label: 'כובעים', owner: 'm-parent', done: false },
      ],
    },
    {
      id: 't-drive-g-sun',
      name: 'רחצה ושמש',
      emoji: '🧴',
      items: [
        { id: 't-drive-s1', label: 'קרם הגנה', owner: 'm-parent', done: true },
        { id: 't-drive-s2', label: 'מגבות בריכה', owner: 'm-child', done: false },
        { id: 't-drive-s3', label: 'נעלי מים לעין חרדלית', owner: 'all', done: false },
      ],
    },
    {
      id: 't-drive-g-docs',
      name: 'מסמכים והזמנות',
      emoji: '🎫',
      items: [
        { id: 't-drive-d1', label: 'אישור צימר רקפת', owner: 'm-parent', done: true },
        { id: 't-drive-d2', label: 'כרטיסים למדעטק', owner: 'm-parent', done: true },
        { id: 't-drive-d3', label: 'הזמנת שולחן VIVINO', owner: 'm-parent', done: false },
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
  makeDriveTrip(),
]

/**
 * Galli's REAL family trip — a full week in the Lower Galilee, fixed dates
 * (Aug 10–16 2026). Kept as `t-drive` so People/QA references still resolve.
 * Fresh installs get this; the persist migration swaps the old demo weekend
 * trip for this one only when the user hasn't edited it (see useStore migrate).
 *
 * A hoisted function (not a const) so `SEED_TRIPS` above can call it at
 * module-eval time, and so every caller gets its own copy to mutate.
 */
export function makeDriveTrip(): Trip {
  return {
  id: 't-drive',
  name: 'אוגוסט בגליל תחתון 2026',
  destination: 'רקפת, משגב',
  startDate: '2026-08-10',
  endDate: '2026-08-16',
  transport: 'drive',
  order: 1,
  members: ['m-parent', 'm-child'],
  joinCode: 'SUNSET',
  checklist: makeGalileeChecklist(),
  days: [
    {
      id: 't-drive-d1',
      date: '2026-08-10',
      title: 'חולון → חיפה → רקפת',
      activities: [
        { id: 't-drive-d1-a1', title: 'יציאה מחולון', time: '08:00', icon: '🚗' },
        { id: 't-drive-d1-a2', title: 'מדעטק — מוזיאון המדע', time: '10:00', icon: '🧪', loc: 'מדעטק חיפה' },
        { id: 't-drive-d1-a3', title: 'ארוחת צהריים במושבה הגרמנית', time: '13:30', icon: '🍝', loc: 'המושבה הגרמנית חיפה' },
        { id: 't-drive-d1-a4', title: 'תצפית על הגנים הבהאיים', time: '15:00', icon: '🏞️', loc: 'הגנים הבהאיים חיפה' },
        { id: 't-drive-d1-a5', title: 'נסיעה לרקפת', time: '16:00', icon: '🚗' },
        { id: 't-drive-d1-a6', title: 'ארוחת ערב — VIVINO כרמיאל', time: '19:30', icon: '🍽️', loc: 'VIVINO כרמיאל', notes: 'פיצות, פסטות, בשרים, מנות ילדים' },
      ],
      entries: [
        {
          id: 'e3',
          text: 'יוצאים לדרך! שבוע שלם בגליל 🎉',
          mood: '🎉',
          loc: 'חולון',
          author: 'm-parent',
          ts: Date.parse('2026-08-10T08:00:00'),
          reacts: { '👍': ['m-child'] },
        },
      ],
      photos: [
        {
          id: 'p4',
          svg: photoSvg('#6b8f3a', 'Galilee'),
          caption: 'יוצאים לדרך מחולון',
          fav: true,
          by: 'm-parent',
          status: 'approved',
          reacts: { '❤️': ['m-child'] },
        },
        {
          id: 'p5',
          svg: photoSvg('#8a6a3a', 'Haifa'),
          caption: 'המדעטק בחיפה (מחכה לאישור)',
          fav: false,
          by: 'm-child',
          status: 'pending',
          reacts: {},
        },
      ],
    },
    {
      id: 't-drive-d2',
      date: '2026-08-11',
      title: 'עין חרדלית',
      activities: [
        { id: 't-drive-d2-a1', title: 'יציאה', time: '08:30', icon: '🚗' },
        { id: 't-drive-d2-a2', title: 'מסלול המים עין חרדלית', time: '09:15', icon: '💦', loc: 'עין חרדלית', notes: 'עד 13:00 בערך' },
        { id: 't-drive-d2-a3', title: 'ארוחת צהריים באזור', time: '13:30', icon: '🥪' },
        { id: 't-drive-d2-a4', title: 'מנוחה ברקפת', time: '15:30', icon: '😴' },
        { id: 't-drive-d2-a5', title: 'ארוחת ערב — Tagalos Bistro', time: '19:30', icon: '🍽️', loc: 'Tagalos Bistro כרמיאל', notes: 'המבורגר, פיש אנד צ׳יפס, שניצל' },
      ],
      entries: [],
      photos: [],
    },
    {
      id: 't-drive-d3',
      date: '2026-08-12',
      title: 'יום כנרת',
      activities: [
        { id: 't-drive-d3-a1', title: 'רחצה בכנרת', time: '09:00', icon: '🏖️', loc: 'חוף הכנרת' },
        { id: 't-drive-d3-a2', title: 'סאפ (אופציונלי)', time: '12:00', icon: '🚣' },
        { id: 't-drive-d3-a3', title: 'גלידות ומנוחה', time: '15:00', icon: '🍦' },
        { id: 't-drive-d3-a4', title: 'ארוחת ערב — בורגר סאלון כרמיאל', time: '19:30', icon: '🍽️', loc: 'בורגר סאלון כרמיאל' },
      ],
      entries: [],
      photos: [],
    },
    {
      id: 't-drive-d4',
      date: '2026-08-13',
      title: 'עכו העתיקה',
      activities: [
        { id: 't-drive-d4-a1', title: 'אולמות האבירים', time: '09:30', icon: '🏛️', loc: 'אולמות האבירים עכו' },
        { id: 't-drive-d4-a2', title: 'מנהרת הטמפלרים', time: '11:00', icon: '🕯️', loc: 'מנהרת הטמפלרים עכו' },
        { id: 't-drive-d4-a3', title: 'שוק עכו', time: '12:00', icon: '🛍️', loc: 'השוק העתיק עכו' },
        { id: 't-drive-d4-a4', title: 'ארוחת צהריים בנמל', time: '13:00', icon: '🍽️', loc: 'נמל עכו' },
        { id: 't-drive-d4-a5', title: 'החומות והנמל', time: '14:00', icon: '🌊' },
        { id: 't-drive-d4-a6', title: 'גלידה', time: '15:30', icon: '🍦' },
        { id: 't-drive-d4-a7', title: 'ארוחת ערב — VIVINO כרמיאל', time: '19:30', icon: '🍽️', loc: 'VIVINO כרמיאל' },
      ],
      entries: [],
      photos: [],
    },
    {
      id: 't-drive-d5',
      date: '2026-08-14',
      title: 'יער הקופים ביודפת',
      activities: [
        { id: 't-drive-d5-a1', title: 'יער הקופים — סיור כ-3 שעות', time: '09:00', icon: '🐒', loc: 'יער הקופים יודפת' },
        { id: 't-drive-d5-a2', title: 'ארוחת צהריים', time: '13:00', icon: '🥪' },
        { id: 't-drive-d5-a3', title: 'חזרה למנוחה', time: '15:00', icon: '😴' },
        { id: 't-drive-d5-a4', title: 'ארוחת ערב — Guesta', time: '19:30', icon: '🍽️', loc: 'Guesta כרמיאל', notes: 'איטלקית משפחתית' },
      ],
      entries: [],
      photos: [],
    },
    {
      id: 't-drive-d6',
      date: '2026-08-15',
      title: 'בריכה ברקפת',
      activities: [
        { id: 't-drive-d6-a1', title: 'בריכה — יום מנוחה', time: '10:00', icon: '🏊' },
        { id: 't-drive-d6-a2', title: 'פיקניק', time: '12:30', icon: '🧺' },
        { id: 't-drive-d6-a3', title: 'ספר ומשחקים', time: '16:00', icon: '🎲' },
        { id: 't-drive-d6-a4', title: 'ארוחת ערב — BBB כרמיאל', time: '19:30', icon: '🍽️', loc: 'BBB כרמיאל', notes: 'המבורגרים, סלטים, קינוחים' },
      ],
      entries: [],
      photos: [],
    },
    {
      id: 't-drive-d7',
      date: '2026-08-16',
      title: 'חזרה דרך חוות החופש',
      activities: [
        { id: 't-drive-d7-a1', title: 'יציאה מרקפת', time: '09:00', icon: '🚗' },
        { id: 't-drive-d7-a2', title: 'חוות החופש — סיור כשעתיים', time: '10:30', icon: '🐴', loc: 'חוות החופש' },
        { id: 't-drive-d7-a3', title: 'ארוחת צהריים בעמק חפר', time: '13:00', icon: '🍝', loc: 'עמק חפר' },
        { id: 't-drive-d7-a4', title: 'חזרה לחולון', time: '15:30', icon: '🚗' },
      ],
      entries: [],
      photos: [],
    },
  ],
  }
}
