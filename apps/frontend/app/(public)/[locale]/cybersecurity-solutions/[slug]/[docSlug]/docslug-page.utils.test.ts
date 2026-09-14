import { describe, expect, it } from 'vitest';
import { isKnownDocumentSlug } from './docslug-page.utils';

describe('isKnownDocumentSlug', () => {
  it.each`
    knownSlugs                         | slug         | expected | description
    ${['foo', 'bar', 'baz']}           | ${'bar'}     | ${true}  | ${'slug present in the list'}
    ${['foo', 'bar', 'baz']}           | ${'unknown'} | ${false} | ${'slug not present in the list'}
    ${[]}                              | ${'foo'}     | ${false} | ${'empty known slugs list'}
    ${['foo', null, undefined, 'bar']} | ${'bar'}     | ${true}  | ${'list containing null/undefined entries'}
    ${['foo', null, undefined]}        | ${'unknown'} | ${false} | ${'unknown slug amongst null/undefined entries'}
    ${['Foo']}                         | ${'foo'}     | ${false} | ${'lookup is case-sensitive'}
  `(
    'should return $expected for "$slug" ($description)',
    ({ knownSlugs, slug, expected }) => {
      expect(isKnownDocumentSlug(knownSlugs, slug)).toBe(expected);
    }
  );
});
