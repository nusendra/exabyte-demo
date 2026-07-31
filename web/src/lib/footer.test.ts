import { describe, it, expect } from 'vitest';
import { FOOTER_LINKS } from './footer';

describe('footer', () => {
  it('FOOTER_LINKS has exactly two items', () => {
    expect(FOOTER_LINKS).toHaveLength(2);
  });

  it('FOOTER_LINKS contains Home and About Us in order', () => {
    const labels = FOOTER_LINKS.map((item) => item.label);
    expect(labels).toEqual(['Home', 'About Us']);
  });

  it('every FOOTER_LINKS link points to home', () => {
    for (const item of FOOTER_LINKS) {
      expect(item.href).toBe('/');
    }
  });

  it('each FOOTER_LINKS entry has label and href fields', () => {
    for (const item of FOOTER_LINKS) {
      expect(item.label).toBeTypeOf('string');
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.href).toBeTypeOf('string');
      expect(item.href.length).toBeGreaterThan(0);
    }
  });
});
