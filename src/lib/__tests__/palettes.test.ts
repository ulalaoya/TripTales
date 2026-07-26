import { describe, it, expect } from 'vitest';
import { PALETTES, paletteById, paletteVars } from '../palettes';

/** Perceived luminance (0–1) of a #rrggbb colour. */
function lum(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

const vars = (id: string, dark: boolean) => paletteVars(id, dark) as unknown as Record<string, string>;

describe('palettes', () => {
  it('exposes the default plus five alternatives, including monochrome', () => {
    expect(PALETTES[0].id).toBe('coral');
    expect(PALETTES.map((p) => p.id)).toContain('mono');
  });

  it('falls back to the default palette for an unknown id', () => {
    expect(paletteById('nope').id).toBe('coral');
    expect(paletteById(undefined).id).toBe('coral');
  });

  it('applies no overrides for the default palette in either theme', () => {
    expect(paletteVars('coral', false)).toEqual({});
    expect(paletteVars('coral', true)).toEqual({});
  });

  it('uses the light neutrals in day mode and the dark ones at night', () => {
    expect(vars('orchid', false)['--canvas']).toContain('#f4f7fb');
    expect(vars('orchid', true)['--canvas']).toContain('#12151f');
  });

  it('keeps the palette ink for day mode but never forces it at night', () => {
    // At night the dark theme's own light-on-dark text colour must win.
    expect(vars('orchid', false)['--ink']).toBe('#491B68');
    expect(vars('orchid', true)['--ink']).toBeUndefined();
  });

  // The regression that hid activity times and the transport icon at night.
  it('lifts dark accents so they stay legible on the night canvas', () => {
    const monoDay = vars('mono', false);
    const monoNight = vars('mono', true);
    expect(monoDay['--coral']).toBe('#3A3F4B');
    expect(lum(monoDay['--coral'])).toBeLessThan(0.28);
    expect(lum(monoNight['--coral'])).toBeGreaterThan(0.28);
  });

  it('leaves already-vivid accents untouched at night', () => {
    expect(vars('sunset', true)['--coral']).toBe('#E7514B');
  });

  it('gives every palette a readable accent at night', () => {
    for (const p of PALETTES.filter((x) => x.colors)) {
      const v = vars(p.id, true);
      expect(lum(v['--coral']), `${p.id} --coral`).toBeGreaterThan(0.28);
    }
  });
});
