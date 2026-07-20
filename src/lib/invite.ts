import type { Trip } from '../types'

export type Lang = 'he' | 'en'

/**
 * Build the share/invite text (R7).
 * Must contain: trip name + dates, a "sign in with your phone number" note, and the
 * role explanation (adults edit; kids upload photos for approval and react with emojis).
 * When `joinCode` is supplied, a "join with this code" line is appended in both languages.
 */
export function buildInviteText(trip: Trip, lang: Lang, joinCode?: string): string {
  const dates = `${trip.startDate} – ${trip.endDate}`
  if (lang === 'en') {
    const lines = [
      `You're invited to our TripTales journal: "${trip.name}" (${dates}).`,
      `Sign in with your phone number to join.`,
      `How it works: adults can edit the trip and write journal entries; kids upload photos for the parents' approval and react to entries with emojis.`,
    ]
    if (joinCode) lines.push(`Join code: ${joinCode}`)
    return lines.join('\n')
  }
  const lines = [
    `הוזמנת ליומן המסע שלנו ב-TripTales: "${trip.name}" (${dates}).`,
    `היכנסו עם מספר הטלפון שלכם כדי להצטרף.`,
    `איך זה עובד: מבוגרים יכולים לערוך את הטיול ולכתוב יומן; ילדים מעלים תמונות לאישור ההורים ומגיבים ליומן באימוג'ים.`,
  ]
  if (joinCode) lines.push(`קוד הצטרפות: ${joinCode}`)
  return lines.join('\n')
}
