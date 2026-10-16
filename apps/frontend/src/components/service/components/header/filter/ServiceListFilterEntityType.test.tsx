import { ServiceListFilterEntityType } from '@/components/service/components/header/filter/ServiceListFilterEntityType';
import { AppServiceListLocalStorageKeyContext } from '@/components/service/components/ServiceListLocalStorageKeyContext';
import { ServiceListLocalStorageKey } from '@/hooks/use-service-list-local-storage';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

const CAMPAIGN_ID = 'Campaign';
const CAMPAIGN_NAME = 'Campaign';
const ATTACK_PATTERN_ID = 'Attack-Pattern';
const ATTACK_PATTERN_NAME = 'Attack Pattern';
const ENTITY_TYPES_STORAGE_KEY = 'entityTypePrivateOpenCTIIntegrationFeedsList';

const renderFilter = () =>
  testRender(
    <AppServiceListLocalStorageKeyContext
      localStorageKey={ServiceListLocalStorageKey.OpenCTIIntegrationFeeds}>
      <ServiceListFilterEntityType />
    </AppServiceListLocalStorageKeyContext>
  );

describe('ServiceListFilterEntityType', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should pre-check the entity types when they are already stored in the list filters', () => {
    // Given
    localStorage.setItem(
      ENTITY_TYPES_STORAGE_KEY,
      JSON.stringify({ [ATTACK_PATTERN_ID]: [] })
    );

    // When
    renderFilter();

    // Then
    expect(
      screen.getByRole('checkbox', { name: ATTACK_PATTERN_NAME })
    ).toBeChecked();
  });

  it('should store the entity type in the list filters when the user checks it', async () => {
    // Given
    const { user } = renderFilter();

    // When
    await user.click(screen.getByRole('checkbox', { name: CAMPAIGN_NAME }));

    // Then
    expect(JSON.parse(localStorage.getItem(ENTITY_TYPES_STORAGE_KEY)!)).toEqual(
      { [CAMPAIGN_ID]: [] }
    );
  });
});
