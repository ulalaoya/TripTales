import { describe, it, expect } from 'vitest';
import { isMapsUrl, locationHref, locationLabel } from '../locationLink';
import { mapsUrl } from '../maps';

describe('isMapsUrl', () => {
  it('detects a Google Maps link', () =>
    expect(isMapsUrl('https://maps.app.goo.gl/abc123')).toBe(true));
  it('detects a Waze link', () =>
    expect(isMapsUrl('https://waze.com/ul?ll=32.9,35.3')).toBe(true));
  it('detects a plain http URL', () =>
    expect(isMapsUrl('http://example.com/place')).toBe(true));
  it('tolerates surrounding whitespace', () =>
    expect(isMapsUrl('  https://maps.google.com/?q=x  ')).toBe(true));
  it('a place name is NOT a url', () =>
    expect(isMapsUrl('מדעטק חיפה')).toBe(false));
  it('empty string is NOT a url', () => expect(isMapsUrl('')).toBe(false));
});

describe('locationHref', () => {
  it('passes a pasted Maps URL through untouched (trimmed)', () => {
    const url = 'https://maps.app.goo.gl/abc123';
    expect(locationHref('  ' + url + ' ')).toBe(url);
  });

  it('a Waze link survives its query string', () => {
    const url = 'https://waze.com/ul?ll=32.9%2C35.3&navigate=yes';
    expect(locationHref(url)).toBe(url);
  });

  it('builds a maps search URL for a plain place name', () => {
    expect(locationHref('מדעטק חיפה')).toBe(mapsUrl('מדעטק חיפה'));
  });

  it('percent-encodes Hebrew place names', () => {
    const href = locationHref('עין חרדלית');
    expect(href).toContain('maps.google.com');
    expect(href).not.toContain(' ');
  });
});

describe('locationLabel', () => {
  it('shows the place name for free text', () =>
    expect(locationLabel('  VIVINO כרמיאל ')).toBe('VIVINO כרמיאל'));
  it('shows a friendly label for a pasted link', () =>
    expect(locationLabel('https://maps.app.goo.gl/abc123')).toBe('פתיחה בניווט'));
});
