import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readImageFile } from '../readImageFile'
import { compressDataUrl } from '../compressImage'

// The canvas re-encode itself is jsdom-hostile (no real image decoding), so the
// contract under test here is the ROUTING: does every upload surface get the
// downscale step, and is a photo ever lost when that step misbehaves?
vi.mock('../compressImage', () => ({
  compressDataUrl: vi.fn((dataUrl: string) => Promise.resolve(`${dataUrl}#small`)),
}))

const jpeg = () => new File([new Uint8Array([1, 2, 3, 4])], 'beach.jpg', { type: 'image/jpeg' })

beforeEach(() => {
  vi.mocked(compressDataUrl).mockClear()
  vi.mocked(compressDataUrl).mockImplementation((dataUrl: string) => Promise.resolve(`${dataUrl}#small`))
})

describe('readImageFile', () => {
  it('reads the file to a data URL', async () => {
    const out = await readImageFile(jpeg(), false)
    expect(out.startsWith('data:image/jpeg;base64,')).toBe(true)
  })

  it('CLOUD mode downscales — this is the step two upload paths used to skip', async () => {
    const out = await readImageFile(jpeg(), true)
    expect(compressDataUrl).toHaveBeenCalledTimes(1)
    expect(out.endsWith('#small')).toBe(true)
  })

  it('LOCAL mode keeps the original bytes, as it always has', async () => {
    const out = await readImageFile(jpeg(), false)
    expect(compressDataUrl).not.toHaveBeenCalled()
    expect(out.endsWith('#small')).toBe(false)
  })

  it('a failed downscale falls back to the original — a photo is never lost', async () => {
    vi.mocked(compressDataUrl).mockRejectedValueOnce(new Error('no canvas'))
    const out = await readImageFile(jpeg(), true)
    expect(out.startsWith('data:image/jpeg;base64,')).toBe(true)
    expect(out.endsWith('#small')).toBe(false)
  })

  it('rejects when the file cannot be read at all', async () => {
    await expect(readImageFile({} as unknown as File, false)).rejects.toBeTruthy()
  })
})
