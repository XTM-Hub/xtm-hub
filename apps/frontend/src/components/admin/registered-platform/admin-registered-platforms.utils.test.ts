import {
  type AdminRegisteredPlatformsFilters,
  ALL_FILTER_VALUE,
  buildAdminRegisteredPlatformsVariables,
  canUnregisterPlatform,
  EMPTY_ADMIN_REGISTERED_PLATFORMS_FILTERS,
  getLastPageIndex,
  getRegistererName,
  normalizeAdminRegisteredPlatformsPageSize,
  parseIdentifierFilterValue,
  parseStatusFilterValue,
  toAdminRegisteredPlatformRows,
} from '@/components/admin/registered-platform/admin-registered-platforms.utils';
import {
  AdminRegisteredPlatformOrdering,
  OrderingMode,
  PlatformConfigurationStatus,
  PlatformIdentifier,
} from '@graphql/generated';
import { mockAdminRegisteredPlatform } from '@graphql/mocks';
import { describe, expect, it } from 'vitest';

const ORGANIZATION_ID = 'organization-id';
const ORGANIZATION = { id: ORGANIZATION_ID, name: 'Filigran' };
const CURSOR = 'NTA=';
const PAGE_SIZE = 50;
const SEARCH_TERM = 'filigran';
const SERVICE_INSTANCE_ID = 'service-instance-id';

const buildVariables = (
  filters: Partial<AdminRegisteredPlatformsFilters>,
  pageSize = PAGE_SIZE
) =>
  buildAdminRegisteredPlatformsVariables({
    filters: { ...EMPTY_ADMIN_REGISTERED_PLATFORMS_FILTERS, ...filters },
    pageSize,
    cursor: CURSOR,
    orderBy: AdminRegisteredPlatformOrdering.Title,
    orderMode: OrderingMode.Asc,
  });

describe('buildAdminRegisteredPlatformsVariables', () => {
  it('should send no filter and no search term when the user filters on nothing', () => {
    // Given / When
    const variables = buildVariables({});

    // Then
    expect(variables).toEqual({
      first: PAGE_SIZE,
      after: CURSOR,
      orderBy: AdminRegisteredPlatformOrdering.Title,
      orderMode: OrderingMode.Asc,
      searchTerm: null,
      filter: null,
    });
  });

  it.each([
    [
      'a product',
      { identifier: PlatformIdentifier.Openaev },
      { identifier: PlatformIdentifier.Openaev },
    ],
    [
      'a status',
      { status: PlatformConfigurationStatus.Inactive },
      { status: PlatformConfigurationStatus.Inactive },
    ],
    [
      'an organization',
      { organizationId: ORGANIZATION_ID },
      { organizationId: ORGANIZATION_ID },
    ],
  ])(
    'should send the filter on %s and null for the others when the user filters on it',
    (_label, filters, expectedFilter) => {
      // Given / When
      const { filter } = buildVariables(filters);

      // Then
      expect(filter).toEqual({
        identifier: null,
        status: null,
        organizationId: null,
        ...expectedFilter,
      });
    }
  );

  it.each([
    [`  ${SEARCH_TERM}  `, SEARCH_TERM],
    ['   ', null],
    ['', null],
    [null, null],
  ])(
    'should send the search term %j as %j',
    (searchTerm, expectedSearchTerm) => {
      // Given / When
      const variables = buildVariables({ searchTerm });

      // Then
      expect(variables.searchTerm).toBe(expectedSearchTerm);
    }
  );
});

describe('normalizeAdminRegisteredPlatformsPageSize', () => {
  it.each([
    [50, 50],
    [100, 100],
    [200, 100],
  ])('should turn the page size %i into %i', (pageSize, expected) => {
    // Given / When / Then
    expect(normalizeAdminRegisteredPlatformsPageSize(pageSize)).toBe(expected);
  });
});

describe('getLastPageIndex', () => {
  it.each([
    [0, 50, 0],
    [50, 50, 0],
    [51, 50, 1],
    [100, 50, 1],
  ])(
    'should place the last page of %i platforms, %i per page, at index %i',
    (totalCount, pageSize, expected) => {
      // Given / When / Then
      expect(getLastPageIndex(totalCount, pageSize)).toBe(expected);
    }
  );
});

describe('filter values', () => {
  it.each([
    [PlatformIdentifier.Opencti, PlatformIdentifier.Opencti],
    [PlatformIdentifier.Xtmone, PlatformIdentifier.Xtmone],
    [ALL_FILTER_VALUE, null],
    ['unknown', null],
  ])('should read the product %s as %s', (value, expected) => {
    // Given / When / Then
    expect(parseIdentifierFilterValue(value)).toBe(expected);
  });

  it.each([
    [PlatformConfigurationStatus.Active, PlatformConfigurationStatus.Active],
    [
      PlatformConfigurationStatus.Inactive,
      PlatformConfigurationStatus.Inactive,
    ],
    [ALL_FILTER_VALUE, null],
    ['unknown', null],
  ])('should read the status %s as %s', (value, expected) => {
    // Given / When / Then
    expect(parseStatusFilterValue(value)).toBe(expected);
  });
});

describe('getRegistererName', () => {
  it.each([
    [{ first_name: 'Ada', last_name: 'Lovelace' }, 'Ada Lovelace'],
    [{ first_name: 'Ada', last_name: null }, 'Ada'],
    [{ first_name: null, last_name: null }, null],
  ])('should name the registerer %j %j', (names, expected) => {
    // Given
    const registerer = { id: 'user-id', email: 'ada@filigran.io', ...names };

    // When / Then
    expect(getRegistererName(registerer)).toBe(expected);
  });

  it('should name no registerer when the platform has none', () => {
    // Given / When / Then
    expect(getRegistererName(null)).toBeNull();
  });
});

describe('canUnregisterPlatform', () => {
  it.each([
    [PlatformConfigurationStatus.Active, ORGANIZATION, false, true],
    [PlatformConfigurationStatus.Active, null, false, true],
    [PlatformConfigurationStatus.Inactive, ORGANIZATION, false, false],
    [PlatformConfigurationStatus.Active, ORGANIZATION, true, false],
  ])(
    'should tell a %s platform of the organization %j, trial %s, can be unregistered: %s',
    (status, organization, is_trial, expected) => {
      // Given / When / Then
      expect(
        canUnregisterPlatform(
          mockAdminRegisteredPlatform({ status, organization, is_trial })
        )
      ).toBe(expected);
    }
  );
});

describe('toAdminRegisteredPlatformRows', () => {
  it('should identify each row by its service instance', () => {
    // Given
    const platform = mockAdminRegisteredPlatform({
      service_instance_id: SERVICE_INSTANCE_ID,
    });

    // When
    const rows = toAdminRegisteredPlatformRows({
      adminRegisteredPlatforms: {
        totalCount: 1,
        edges: [{ node: platform }],
      },
    });

    // Then
    expect(rows.map(({ id }) => id)).toEqual([SERVICE_INSTANCE_ID]);
  });

  it('should list no row before the platforms are loaded', () => {
    // Given / When / Then
    expect(toAdminRegisteredPlatformRows(undefined)).toEqual([]);
  });
});
