import { splitActiveAndDraft } from '@/components/service/components/service-list-utils';

const ACTIVE_ONE = { id: 'a1', active: true };
const ACTIVE_TWO = { id: 'a2', active: true };
const DRAFT_ONE = { id: 'd1', active: false };
const DRAFT_TWO = { id: 'd2', active: false };

describe('splitActiveAndDraft', () => {
  it('should keep the order of the documents inside each group', () => {
    // Given
    const documents = [ACTIVE_ONE, DRAFT_ONE, ACTIVE_TWO, DRAFT_TWO];

    // When
    const [active, draft] = splitActiveAndDraft(documents);

    // Then
    expect(active).toEqual([ACTIVE_ONE, ACTIVE_TWO]);
    expect(draft).toEqual([DRAFT_ONE, DRAFT_TWO]);
  });

  it('should return two empty groups when there is no document', () => {
    expect(splitActiveAndDraft([])).toEqual([[], []]);
  });

  it.each`
    description           | documents       | expectedActive  | expectedDraft
    ${'only active ones'} | ${[ACTIVE_ONE]} | ${[ACTIVE_ONE]} | ${[]}
    ${'only draft ones'}  | ${[DRAFT_ONE]}  | ${[]}           | ${[DRAFT_ONE]}
  `(
    'should handle a list with $description',
    ({ documents, expectedActive, expectedDraft }) => {
      expect(splitActiveAndDraft(documents)).toEqual([
        expectedActive,
        expectedDraft,
      ]);
    }
  );
});
