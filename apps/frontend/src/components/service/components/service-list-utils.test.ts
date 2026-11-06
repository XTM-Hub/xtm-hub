import { describe, expect, it } from 'vitest';
import { splitPublishedAndOthers } from './service-list-utils';

interface Item {
  id: string;
  status: string;
}

const PUBLISHED_ITEM: Item = { id: 'published', status: 'published' };
const DRAFT_ITEM: Item = { id: 'draft', status: 'draft' };
const IN_VALIDATION_ITEM: Item = {
  id: 'in-validation',
  status: 'in_validation',
};

describe('splitPublishedAndOthers', () => {
  it.each`
    description                            | items                                               | expected
    ${'there are no documents'}            | ${[]}                                               | ${[[], []]}
    ${'every document is published'}       | ${[PUBLISHED_ITEM]}                                 | ${[[PUBLISHED_ITEM], []]}
    ${'no document is published'}          | ${[DRAFT_ITEM, IN_VALIDATION_ITEM]}                 | ${[[], [DRAFT_ITEM, IN_VALIDATION_ITEM]]}
    ${'documents have different statuses'} | ${[DRAFT_ITEM, PUBLISHED_ITEM, IN_VALIDATION_ITEM]} | ${[[PUBLISHED_ITEM], [DRAFT_ITEM, IN_VALIDATION_ITEM]]}
  `(
    'should put the published documents first and the others second when $description',
    ({ items, expected }: { items: Item[]; expected: [Item[], Item[]] }) => {
      // Given a list of documents

      // When
      const result = splitPublishedAndOthers(items);

      // Then
      expect(result).toEqual(expected);
    }
  );
});
