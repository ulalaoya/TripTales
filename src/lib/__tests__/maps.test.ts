import { describe, it, expect } from 'vitest';
import { mapsUrl } from '../maps';

describe('mapsUrl', () => {
  it('builds the base URL with an encoded query', () => {
    expect(mapsUrl('Paris')).toBe('https://maps.google.com/?q=Paris');
  });

  it('percent-encodes Hebrew locations', () => {
    const url = mapsUrl('חוף בניה');
    expect(url.startsWith('https://maps.google.com/?q=')).toBe(true);
    expect(url).toBe('https://maps.google.com/?q=' + encodeURIComponent('חוף בניה'));
    expect(url).not.toContain(' ');
  });

  it('encodes spaces and ampersands', () => {
    const url = mapsUrl('Ben & Jerry factory');
    expect(url).toContain('%20');
    expect(url).toContain('%26');
    expect(url).not.toContain(' & ');
  });
});
