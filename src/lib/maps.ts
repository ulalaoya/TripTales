/**
 * Google Maps deep link (R6). No API key — opens the native Maps app on phones.
 */
export function mapsUrl(location: string): string {
  return `https://maps.google.com/?q=${encodeURIComponent(location ?? '')}`
}
