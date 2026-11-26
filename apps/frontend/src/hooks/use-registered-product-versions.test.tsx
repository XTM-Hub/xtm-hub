import { PlatformIdentifier } from '@graphql/generated';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRegisteredProductVersions } from './use-registered-product-versions';

const graphqlMocks = vi.hoisted(() => ({
  useIntegrationProductVersionFilterQuery: Object.assign(vi.fn(), {
    getKey: vi.fn((variables: unknown) => [
      'IntegrationProductVersionFilter',
      variables,
    ]),
    getRootKey: vi.fn(() => ['IntegrationProductVersionFilter']),
  }),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@graphql/generated')>();

  return {
    ...actual,
    useIntegrationProductVersionFilterQuery:
      graphqlMocks.useIntegrationProductVersionFilterQuery,
  };
});

vi.mock('@/lib/graphql-client', () => ({
  portalGraphqlClient: { _mock: 'portalGraphqlClient' },
}));

const mockLatestVersions = (versions: string[]) => {
  graphqlMocks.useIntegrationProductVersionFilterQuery.mockReturnValue({
    data: {
      registeredProductVersions: versions.map((version) => ({ version })),
    },
  });
};

describe('useRegisteredProductVersions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the latest versions from the backend as-is when no registered version is given', () => {
    mockLatestVersions(['7.2.0', '7.1.0', '7.0.0', '6.6.0', '6.5.0']);

    const { result } = renderHook(() =>
      useRegisteredProductVersions(PlatformIdentifier.Opencti)
    );

    expect(result.current.versions).toEqual([
      '7.2.0',
      '7.1.0',
      '7.0.0',
      '6.6.0',
      '6.5.0',
    ]);
  });

  it('pins the registered version first when it falls outside of the 5 latest', () => {
    mockLatestVersions(['7.2.0', '7.1.0', '7.0.0', '6.6.0', '6.5.0']);

    const { result } = renderHook(() =>
      useRegisteredProductVersions(PlatformIdentifier.Opencti, {
        registeredVersions: ['6.4.0'],
      })
    );

    expect(result.current.versions).toEqual([
      '6.4.0',
      '7.2.0',
      '7.1.0',
      '7.0.0',
      '6.6.0',
      '6.5.0',
    ]);
  });

  it('moves the registered version to the top without duplicating it when already amongst the latest', () => {
    mockLatestVersions(['7.2.0', '7.1.0', '7.0.0', '6.6.0', '6.5.0']);

    const { result } = renderHook(() =>
      useRegisteredProductVersions(PlatformIdentifier.Opencti, {
        registeredVersions: ['7.0.0'],
      })
    );

    expect(result.current.versions).toEqual([
      '7.0.0',
      '7.2.0',
      '7.1.0',
      '6.6.0',
      '6.5.0',
    ]);
  });

  it('pins every distinct registered version, most recent first', () => {
    mockLatestVersions(['7.0.0']);

    const { result } = renderHook(() =>
      useRegisteredProductVersions(PlatformIdentifier.Opencti, {
        registeredVersions: ['6.4.0', '6.9.0', '6.4.0'],
      })
    );

    expect(result.current.versions).toEqual(['6.9.0', '6.4.0', '7.0.0']);
  });

  it('only returns the backend-filtered results while actively searching, without pinning the registered version', () => {
    mockLatestVersions(['6.4.1']);

    const { result } = renderHook(() =>
      useRegisteredProductVersions(PlatformIdentifier.Opencti, {
        search: '6.4',
        registeredVersions: ['7.0.0'],
      })
    );

    expect(result.current.versions).toEqual(['6.4.1']);
  });

  it('returns just the backend results when no registered version is passed, e.g. on a public page', () => {
    mockLatestVersions(['7.0.0', '6.9.0']);

    const { result } = renderHook(() =>
      useRegisteredProductVersions(PlatformIdentifier.Opencti)
    );

    expect(result.current.versions).toEqual(['7.0.0', '6.9.0']);
  });
});
