import { describe, expect, it } from 'vitest';
import {
  appendContentKeyMarker,
  containsContentKeyMarker,
  decodeContentKeyMarker,
} from './invisible-marker';

describe('invisible-marker', () => {
  describe('appendContentKeyMarker + decodeContentKeyMarker roundtrip', () => {
    it.each`
      text                    | contentKey               | description
      ${'Welcome to XTM Hub'} | ${'HomePage.hero.title'} | ${'simple ascii key'}
      ${'Bienvenue'}          | ${'HomePage.hero.title'} | ${'accented visible text'}
      ${''}                   | ${'EmptyKey'}            | ${'empty visible text'}
      ${'Hello'}              | ${'a.b.c.d.e.f.g'}       | ${'deeply nested dot path'}
      ${'こんにちは'}         | ${'JaPage.greeting'}     | ${'non-latin visible text'}
      ${'Text'}               | ${'Key.With.Émoji.🎉'}   | ${'key containing emoji/unicode'}
    `(
      'roundtrips "$text" / "$contentKey" ($description)',
      ({ text, contentKey }) => {
        const marked = appendContentKeyMarker(text, contentKey);
        expect(containsContentKeyMarker(marked)).toBe(true);
        const { cleanText, contentKey: decodedKey } =
          decodeContentKeyMarker(marked);
        expect(cleanText).toBe(text);
        expect(decodedKey).toBe(contentKey);
      }
    );
  });

  it('does not visually alter the text when rendered as-is (marker is appended, not interleaved)', () => {
    const marked = appendContentKeyMarker('Hello world', 'Some.Key');
    expect(marked.startsWith('Hello world')).toBe(true);
  });

  describe('containsContentKeyMarker', () => {
    it.each`
      text                                                | expected | description
      ${'plain text'}                                     | ${false} | ${'no marker'}
      ${appendContentKeyMarker('plain text', 'Some.Key')} | ${true}  | ${'marked text'}
    `('returns $expected for $description', ({ text, expected }) => {
      expect(containsContentKeyMarker(text)).toBe(expected);
    });
  });

  describe('decodeContentKeyMarker on unmarked text', () => {
    it('returns the original text unchanged and a null key', () => {
      const result = decodeContentKeyMarker('just a plain string');
      expect(result.cleanText).toBe('just a plain string');
      expect(result.contentKey).toBeNull();
    });
  });

  it('strips every marker even if more than one is present in the same text', () => {
    const twice = `${appendContentKeyMarker('A', 'Key.One')}${appendContentKeyMarker('B', 'Key.Two')}`;
    const { cleanText, contentKey } = decodeContentKeyMarker(twice);
    // Only the first marker's key is returned by design (one t() call is
    // expected to produce one text node with one marker), but every marker
    // must still be stripped so no invisible characters leak into the DOM.
    expect(cleanText).toBe('AB');
    expect(contentKey).toBe('Key.One');
  });
});
