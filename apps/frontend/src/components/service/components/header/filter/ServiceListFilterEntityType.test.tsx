import { ServiceListFilterEntityType } from '@/components/service/components/header/filter/ServiceListFilterEntityType';
import { AppServiceListStorageKeyContext } from '@/components/service/components/ServiceListStorageKeyContext';
import { useServiceListStorage } from '@/hooks/use-service-list-storage';
import { ServiceListStorageKey } from '@/utils/filters-storage.utils';
import testRender, { testRenderHook } from '@/utils/test/test-render';
import { act, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

const ATTACK_PATTERN_ID = 'Attack-Pattern';
const ATTACK_PATTERN_NAME = 'Attack Pattern';
const INTRUSION_SET_ID = 'Intrusion-Set';
const INTRUSION_SET_NAME = 'Intrusion Set';
const STORAGE_KEY = ServiceListStorageKey.OpenCTIIntegrationFeeds;

const renderFilter = () =>
  testRender(
    <AppServiceListStorageKeyContext storageKey={STORAGE_KEY}>
      <ServiceListFilterEntityType />
    </AppServiceListStorageKeyContext>
  );

const renderStoredFilters = () =>
  testRenderHook(() => useServiceListStorage(STORAGE_KEY));

describe('ServiceListFilterEntityType', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('should pre-check the entity types when they are already stored in the list filters', () => {
    // Given
    const { result } = renderStoredFilters();
    act(() => result.current.setEntityTypes({ [ATTACK_PATTERN_ID]: [] }));

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
    await user.click(
      screen.getByRole('checkbox', { name: INTRUSION_SET_NAME })
    );

    // Then
    expect(renderStoredFilters().result.current.entityTypes).toEqual({
      [INTRUSION_SET_ID]: [],
    });
  });
});
