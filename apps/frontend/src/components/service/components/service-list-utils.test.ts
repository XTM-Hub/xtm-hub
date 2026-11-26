import { describe, expect, it } from 'vitest';
import { splitDocumentsByStatus } from './service-list-utils';

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

describe('splitDocumentsByStatus', () => {
  it.each`
    description                            | items                                               | expected
    ${'there are no documents'}            | ${[]}                                               | ${{ draft: [], inValidation: [], published: [] }}
    ${'every document is published'}       | ${[PUBLISHED_ITEM]}                                 | ${{ draft: [], inValidation: [], published: [PUBLISHED_ITEM] }}
    ${'documents are in validation'}       | ${[IN_VALIDATION_ITEM]}                             | ${{ draft: [], inValidation: [IN_VALIDATION_ITEM], published: [] }}
    ${'documents have different statuses'} | ${[DRAFT_ITEM, PUBLISHED_ITEM, IN_VALIDATION_ITEM]} | ${{ draft: [DRAFT_ITEM], inValidation: [IN_VALIDATION_ITEM], published: [PUBLISHED_ITEM] }}
  `(
    'should group the documents by status when $description',
    ({ items, expected }: { items: Item[]; expected: object }) => {
      // Given a list of documents

      // When
      const result = splitDocumentsByStatus(items);

      // Then
      expect(result).toEqual(expected);
    }
  );

  it('should keep the order of the documents inside each group', () => {
    // Given two documents of each status, interleaved
    const secondDraft = { id: 'draft-2', status: 'draft' };
    const secondInValidation = {
      id: 'in-validation-2',
      status: 'in_validation',
    };
    const items = [
      DRAFT_ITEM,
      IN_VALIDATION_ITEM,
      secondDraft,
      secondInValidation,
    ];

    // When
    const result = splitDocumentsByStatus(items);

    // Then
    expect(result.draft).toEqual([DRAFT_ITEM, secondDraft]);
    expect(result.inValidation).toEqual([
      IN_VALIDATION_ITEM,
      secondInValidation,
    ]);
  });

  it('should count an unknown status as draft', () => {
    // Given a document with a status the UI does not know
    const unknown = { id: 'unknown', status: 'archived' };

    // When
    const result = splitDocumentsByStatus([unknown]);

    // Then
    expect(result.draft).toEqual([unknown]);
  });
});
