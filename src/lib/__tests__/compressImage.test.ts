import { describe, it, expect } from 'vitest'
import { compressDataUrl, fitWithin, MAX_EDGE } from '../compressImage'

describe('fitWithin', () => {
  it('scales the long edge down to the cap, keeping the aspect ratio', () => {
    expect(fitWithin(4000, 3000, 1000)).toEqual({ width: 1000, height: 750 })
    expect(fitWithin(3000, 4000, 1000)).toEqual({ width: 750, height: 1000 })
  })

  it('never scales a small photo up', () => {
    expect(fitWithin(640, 480, 1000)).toEqual({ width: 640, height: 480 })
  })

  it('a photo exactly at the cap is left alone', () => {
    expect(fitWithin(1000, 500, 1000)).toEqual({ width: 1000, height: 500 })
  })

  it('an extreme panorama still keeps at least one pixel on the short edge', () => {
    expect(fitWithin(20000, 3, 1000).height).toBeGreaterThanOrEqual(1)
  })

  it('degenerate sizes are refused rather than producing NaN', () => {
    expect(fitWithin(0, 100)).toEqual({ width: 0, height: 0 })
    expect(fitWithin(Number.NaN, 100)).toEqual({ width: 0, height: 0 })
  })

  it('defaults to the documented 1000px cap', () => {
    expect(MAX_EDGE).toBe(1000)
    expect(fitWithin(2000, 1000)).toEqual({ width: 1000, height: 500 })
  })
})

describe('compressDataUrl', () => {
  it('passes non-image input straight through', async () => {
    await expect(compressDataUrl('data:text/plain,hello')).resolves.toBe('data:text/plain,hello')
    await expect(compressDataUrl('')).resolves.toBe('')
    await expect(compressDataUrl('https://example.com/a.jpg')).resolves.toBe('https://example.com/a.jpg')
  })
})
