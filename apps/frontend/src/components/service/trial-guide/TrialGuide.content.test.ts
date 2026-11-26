import { TRIAL_GUIDE_CONTENT } from '@/components/service/trial-guide/TrialGuide.content';
import { PlatformIdentifier } from '@graphql/generated';
import { describe, expect, it } from 'vitest';

describe('TRIAL_GUIDE_CONTENT', () => {
  it.each`
    platformIdentifier
    ${PlatformIdentifier.Opencti}
    ${PlatformIdentifier.Openaev}
    ${PlatformIdentifier.Xtmone}
  `(
    'has at least one resource card and one checklist item for $platformIdentifier',
    ({ platformIdentifier }: { platformIdentifier: PlatformIdentifier }) => {
      const content = TRIAL_GUIDE_CONTENT[platformIdentifier];

      expect(content.resourceCards.length).toBeGreaterThan(0);
      expect(content.checklistItems.length).toBeGreaterThan(0);
    }
  );

  it('gives every resource card and checklist item a unique id within its tab', () => {
    Object.values(TRIAL_GUIDE_CONTENT).forEach((content) => {
      const resourceCardIds = content.resourceCards.map((card) => card.id);
      const checklistItemIds = content.checklistItems.map((item) => item.id);

      expect(new Set(resourceCardIds).size).toBe(resourceCardIds.length);
      expect(new Set(checklistItemIds).size).toBe(checklistItemIds.length);
    });
  });
});
