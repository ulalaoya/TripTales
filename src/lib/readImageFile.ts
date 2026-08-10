/**
 * THE single entry point for "the user picked an image file".
 *
 * WHY THIS EXISTS: the FileReader-then-compress dance used to be copy-pasted
 * into every upload surface, and two of the four copies (the planner's day
 * photo button and an activity attachment) forgot the compress step entirely.
 * A full-size phone photo therefore went straight into the store, was too big
 * for one Firestore document, and silently never reached the rest of the
 * family. Adding a fifth upload surface must not mean re-deriving this.
 *
 * Every `<input type="file" accept="image/*">` in the app funnels through here.
 *
 * LOCAL MODE IS UNTOUCHED, deliberately: with no Firestore document limit to
 * respect there is no reason to throw away image quality, so a cloud-less
 * install still stores exactly the bytes it stores today. That policy now lives
 * in ONE place — flipping it is a one-line change in this file.
 */

import { compressDataUrl } from './compressImage'
import { isCloudEnabled } from './firebase'

/**
 * Read `file` to a data URL, downscaled for the cloud when sync is on
 * (max 1000px long edge, JPEG q0.6 — see `compressImage.ts`).
 *
 * Rejects ONLY when the file cannot be read at all. A compression failure is
 * never fatal: it falls back to the original bytes, so a photo is never lost to
 * compression.
 *
 * @param cloud injectable for tests; defaults to the app-wide cloud flag.
 */
export function readImageFile(file: File, cloud: boolean = isCloudEnabled): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('file read failed'))
    reader.onabort = () => reject(new Error('file read aborted'))
    reader.onload = () => {
      const raw = String(reader.result)
      if (!cloud) {
        resolve(raw)
        return
      }
      // `compressDataUrl` never rejects, but belt-and-braces: a throw here must
      // not turn a chosen photo into a dead-end.
      compressDataUrl(raw).then(resolve, () => resolve(raw))
    }
    try {
      reader.readAsDataURL(file)
    } catch (err) {
      reject(err)
    }
  })
}
