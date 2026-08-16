/**
 * Photo downscaling, so a synced photo fits in one Firestore document.
 *
 * Approved decision: max 1000 px on the long edge, JPEG quality ~0.6. That puts
 * a typical phone photo at roughly 100–250 KB — well under the 900 KB budget in
 * `imageSize.ts`, and under Firestore's 1 MiB hard document limit.
 *
 * LOCAL MODE IS UNTOUCHED: `Moment.tsx` only calls this when `isCloudEnabled`,
 * so a cloud-less install keeps storing exactly the bytes it stores today.
 *
 * Never rejects — on ANY failure (bad image, no canvas, tainted context) it
 * resolves with the ORIGINAL data URL so a photo is never lost to compression.
 */

export const MAX_EDGE = 1600
export const JPEG_QUALITY = 0.72

/**
 * Successively harder squeezes, tried in order until one fits the budget.
 *
 * The first rung is the target: 1600 px at q0.72 is a photo you can open full
 * screen on a phone and enjoy — NOT a thumbnail — and lands around 250–400 KB,
 * comfortably inside Firestore's per-document ceiling. The lower rungs exist
 * only for the occasional panorama that refuses to fit.
 */
const LADDER: ReadonlyArray<readonly [number, number]> = [
  [1600, 0.72],
  [1280, 0.65],
  [1000, 0.55],
  [800, 0.45],
]

/** Scale (w, h) down so the long edge is at most `maxEdge`. Never scales up. */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number = MAX_EDGE,
): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) return { width: 0, height: 0 }
  const longest = Math.max(width, height)
  if (longest <= maxEdge) return { width: Math.round(width), height: Math.round(height) }
  const ratio = maxEdge / longest
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) }
}

/**
 * Downscale a data URL to `maxEdge` on the long edge and re-encode as JPEG.
 * Resolves with the original input if anything goes wrong.
 */
export function compressDataUrl(
  dataUrl: string,
  maxEdge: number = MAX_EDGE,
  quality: number = JPEG_QUALITY,
): Promise<string> {
  return new Promise((resolve) => {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      resolve(dataUrl)
      return
    }
    if (typeof document === 'undefined' || typeof Image === 'undefined') {
      resolve(dataUrl)
      return
    }

    let settled = false
    const done = (out: string) => {
      if (settled) return
      settled = true
      resolve(out)
    }

    const img = new Image()
    img.onerror = () => done(dataUrl)
    img.onload = () => {
      try {
        const { width, height } = fitWithin(img.naturalWidth || img.width, img.naturalHeight || img.height, maxEdge)
        if (width === 0 || height === 0) return done(dataUrl)

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return done(dataUrl)
        // White matte, so transparent PNGs do not turn black under JPEG.
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        const out = canvas.toDataURL('image/jpeg', quality)
        // Only keep the re-encode if it actually helped.
        done(out && out.length < dataUrl.length ? out : dataUrl)
      } catch {
        done(dataUrl)
      }
    }
    // Give up rather than hang if the image never decodes.
    setTimeout(() => done(dataUrl), 8000)
    img.src = dataUrl
  })
}

/**
 * Squeeze `dataUrl` until `fits` accepts it, trying each rung of the ladder in
 * turn. Resolves with the first result that fits, or `null` when even the
 * harshest setting cannot get there (a corrupt image, or a canvas that refused
 * to encode — `compressDataUrl` hands back its input in both cases).
 *
 * WHY IT LIVES AT THE SYNC BOUNDARY, not only at upload: photos added before
 * compression existed — or through a code path that forgot to call it — were
 * silently skipped by the uploader FOREVER, because an over-budget photo was
 * marked as "handled" and never revisited. Nine of ten photos from a real trip
 * were stranded on one phone that way. Compressing here heals them without the
 * user re-uploading anything, and covers any upload path added later.
 */
export async function compressToFit(
  dataUrl: string,
  fits: (candidate: string) => boolean,
  // Injectable so the ladder can be tested without a canvas: jsdom has `Image`
  // but never fires `onload`, so the real encoder only ever hits its timeout.
  encode: (src: string, edge: number, quality: number) => Promise<string> = compressDataUrl,
): Promise<string | null> {
  if (fits(dataUrl)) return dataUrl
  for (const [edge, quality] of LADDER) {
    const candidate = await encode(dataUrl, edge, quality)
    if (candidate !== dataUrl && fits(candidate)) return candidate
  }
  return null
}
