import { describe, expect, it } from 'vitest';
import { normalizeName } from './normalize.js';

describe('normalizeName', () => {
  it('lowercases and trims', () => {
    expect(normalizeName('  Hello World  ')).toBe('hello world');
  });

  it('removes Latin accents', () => {
    expect(normalizeName('Café Résumé')).toBe('cafe resume');
  });

  it('removes punctuation and collapses spaces', () => {
    expect(normalizeName("Don't  Stop-Me!")).toBe('don t stop me');
  });

  it('keeps Tamil vowel signs intact', () => {
    expect(normalizeName('தமிழ் பாடல்')).toBe('தமிழ் பாடல்');
  });
});
