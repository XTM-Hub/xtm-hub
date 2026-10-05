import { describe, expect, it } from 'vitest';
import { countPendingChanges } from './pending-changes';

const TITLE_KEY = 'PublicHomePage.XtmPlatform.Title';
const DESCRIPTION_KEY = 'PublicHomePage.XtmPlatform.Description';

describe('countPendingChanges', () => {
  it.each([
    ['no draft', [], 0],
    ['one locale of one text', [{ key: TITLE_KEY }], 1],
    [
      'several locales of one text',
      [{ key: TITLE_KEY }, { key: TITLE_KEY }, { key: TITLE_KEY }],
      1,
    ],
    [
      'several texts',
      [{ key: TITLE_KEY }, { key: DESCRIPTION_KEY }, { key: TITLE_KEY }],
      2,
    ],
  ])(
    'should count edited texts, not locales, when drafts hold %s',
    (_label, drafts, expected) => {
      // Given
      const pendingDrafts = drafts;

      // When
      const count = countPendingChanges(pendingDrafts);

      // Then
      expect(count).toBe(expected);
    }
  );
});
