import { ServiceListFilterEntityType } from '@/components/service/components/header/filter/ServiceListFilterEntityType';
import { AppServiceListLocalStorageKeyContext } from '@/components/service/components/ServiceListLocalStorageKeyContext';
import {
  ServiceListLocalStorageKey,
  useServiceListLocalStorage,
} from '@/hooks/use-service-list-local-storage';
import testRender, { testRenderHook } from '@/utils/test/test-render';
import { act, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

const ATTACK_PATTERN_ID = 'Attack-Pattern';
const ATTACK_PATTERN_NAME = 'Attack Pattern';
const INTRUSION_SET_ID = 'Intrusion-Set';
const INTRUSION_SET_NAME = 'Intrusion Set';
const LOCAL_STORAGE_KEY = ServiceListLocalStorageKey.OpenCTIIntegrationFeeds;

const renderFilter = () =>
  testRender(
    <AppServiceListLocalStorageKeyContext localStorageKey={LOCAL_STORAGE_KEY}>
      <ServiceListFilterEntityType />
    </AppServiceListLocalStorageKeyContext>
  );

const renderStoredFilters = () =>
  testRenderHook(() => useServiceListLocalStorage(LOCAL_STORAGE_KEY));

describe('ServiceListFilterEntityType', () => {
  beforeEach(() => {
    localStorage.clear();
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
