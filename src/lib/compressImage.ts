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

export const MAX_EDGE = 1000
export const JPEG_QUALITY = 0.6

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
