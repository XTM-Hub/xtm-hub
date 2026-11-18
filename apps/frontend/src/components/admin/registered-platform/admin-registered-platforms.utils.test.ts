import {
  ADMIN_REGISTERED_PLATFORMS_MAX_PAGE_SIZE,
  type AdminRegisteredPlatformsFilters,
  ALL_FILTER_VALUE,
  buildAdminRegisteredPlatformsVariables,
  canUnregisterPlatform,
  CredentialFilterValue,
  EMPTY_ADMIN_REGISTERED_PLATFORMS_FILTERS,
  getCredentialKindLabelKey,
  getPlatformProductName,
  getRegistererName,
  isHttpUrl,
  normalizeAdminRegisteredPlatformsPageSize,
  parseCredentialFilterValue,
  parseIdentifierFilterValue,
  parseStatusFilterValue,
  toAdminRegisteredPlatformRows,
  toCredentialFilterValue,
} from '@/components/admin/registered-platform/admin-registered-platforms.utils';
import {
  AdminRegisteredPlatformOrdering,
  OrderingMode,
  PlatformConfigurationStatus,
  PlatformIdentifier,
  RegisteredPlatformCredentialKind,
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
    ['platforms with a token', { hasToken: true }, { hasToken: true }],
    ['platforms without a token', { hasToken: false }, { hasToken: false }],
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
        hasToken: null,
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

  it('should ask for no more platforms than the API serves when the page size is larger', () => {
    // Given / When
    const variables = buildVariables(
      {},
      ADMIN_REGISTERED_PLATFORMS_MAX_PAGE_SIZE + 1
    );

    // Then
    expect(variables.first).toBe(ADMIN_REGISTERED_PLATFORMS_MAX_PAGE_SIZE);
  });
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

  it.each([
    [CredentialFilterValue.WithToken, true],
    [CredentialFilterValue.WithoutToken, false],
    [ALL_FILTER_VALUE, null],
    ['unknown', null],
  ])('should read the credential %s as %s', (value, expected) => {
    // Given / When / Then
    expect(parseCredentialFilterValue(value)).toBe(expected);
  });

  it.each([
    [true, CredentialFilterValue.WithToken],
    [false, CredentialFilterValue.WithoutToken],
    [null, ALL_FILTER_VALUE],
  ])('should select the credential choice of %s', (hasToken, expected) => {
    // Given / When / Then
    expect(toCredentialFilterValue(hasToken)).toBe(expected);
  });
});

describe('getCredentialKindLabelKey', () => {
  it.each([
    [
      RegisteredPlatformCredentialKind.Token,
      'AdminRegisteredPlatforms.Credential.Kind.token',
    ],
    [
      RegisteredPlatformCredentialKind.None,
      'AdminRegisteredPlatforms.Credential.Kind.none',
    ],
    ['key', undefined],
  ])('should label the credential kind %s with %s', (kind, expected) => {
    // Given / When / Then
    expect(getCredentialKindLabelKey(kind)).toBe(expected);
  });
});

describe('getPlatformProductName', () => {
  it.each([
    [PlatformIdentifier.Opencti, 'OpenCTI'],
    [PlatformIdentifier.Openaev, 'OpenAEV'],
    [PlatformIdentifier.Xtmone, 'XTM One'],
    ['opencrq', 'opencrq'],
  ])('should name the product %s %s', (identifier, expected) => {
    // Given / When / Then
    expect(getPlatformProductName(identifier)).toBe(expected);
  });
});

describe('isHttpUrl', () => {
  it.each([
    ['https://opencti.filigran.io', true],
    ['http://localhost:4000', true],
    ['javascript:alert(1)', false],
    ['data:text/html,<p>platform</p>', false],
    ['opencti.filigran.io', false],
    ['', false],
  ])('should tell the URL %j is a web address: %s', (url, expected) => {
    // Given / When / Then
    expect(isHttpUrl(url)).toBe(expected);
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
    [PlatformConfigurationStatus.Active, ORGANIZATION, true],
    [PlatformConfigurationStatus.Inactive, ORGANIZATION, false],
    [PlatformConfigurationStatus.Active, null, false],
  ])(
    'should tell a %s platform of the organization %j can be unregistered: %s',
    (status, organization, expected) => {
      // Given / When / Then
      expect(canUnregisterPlatform({ status, organization })).toBe(expected);
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
