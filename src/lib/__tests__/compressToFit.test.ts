import { describe, it, expect, beforeEach } from 'vitest'
import { compressToFit } from '../compressImage'

/**
 * `compressToFit` walks a ladder of ever-harsher encodings until one fits. The
 * real encoder needs a canvas — jsdom provides `Image` but never fires its
 * `onload`, so it would only ever hit its own timeout — hence the injected
 * stand-in, whose output size depends on the requested edge and quality exactly
 * as a real encoder's would.
 */
const calls: Array<[number, number]> = []
let sizeFor: (edge: number, quality: number) => number

/** Resolves with the INPUT when `sizeFor` returns -1, as the real one does on failure. */
const encode = async (dataUrl: string, edge: number, quality: number) => {
  calls.push([edge, quality])
  const n = sizeFor(edge, quality)
  return n < 0 ? dataUrl : `data:image/jpeg;base64,${'A'.repeat(n)}`
}

const limit = (max: number) => (s: string) => s.length <= max
const huge = `data:image/jpeg;base64,${'A'.repeat(5_000_000)}`

beforeEach(() => {
  calls.length = 0
  sizeFor = () => 100
})

describe('compressToFit', () => {
  it('returns the input untouched when it already fits', async () => {
    const small = 'data:image/jpeg;base64,AAAA'

    expect(await compressToFit(small, limit(1000), encode)).toBe(small)
    expect(calls).toEqual([]) // no re-encoding at all
  })

  it('stops at the first rung that fits, preserving quality', async () => {
    sizeFor = (edge) => (edge === 1600 ? 500 : 10)

    const out = await compressToFit(huge, limit(1000), encode)

    expect(out).toBeTruthy()
    expect(out!.length).toBeLessThanOrEqual(1000)
    expect(calls).toEqual([[1600, 0.72]]) // never went further down the ladder
  })

  it('descends the ladder when the gentle settings are not enough', async () => {
    sizeFor = (edge) => (edge === 800 ? 10 : 5000)

    const out = await compressToFit(huge, limit(1000), encode)

    expect(out).toBeTruthy()
    expect(calls).toEqual([
      [1600, 0.72],
      [1280, 0.65],
      [1000, 0.55],
      [800, 0.45],
    ])
  })

  it('gives up with null when nothing fits', async () => {
    sizeFor = () => 5000

    expect(await compressToFit(huge, limit(1000), encode)).toBeNull()
    expect(calls).toHaveLength(4)
  })

  it('gives up when the encoder cannot encode at all', async () => {
    // The real `compressDataUrl` resolves with its INPUT on any failure; that
    // must never be mistaken for a successful squeeze.
    sizeFor = () => -1

    expect(await compressToFit(huge, limit(1000), encode)).toBeNull()
  })

  it('rejects an encoder result that still exceeds the budget', async () => {
    sizeFor = () => 2000

    expect(await compressToFit(huge, limit(1000), encode)).toBeNull()
  })
})
