import { portalGraphqlClient } from '@/lib/graphql-client';
import { useIntegrationCoverageObjectTypesQuery } from '@graphql/generated';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCoverageObjectTypes } from './UseCoverageObjectTypes';

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useIntegrationCoverageObjectTypesQuery: vi.fn(),
}));

describe('useCoverageObjectTypes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should query the object types accepted by the backend', () => {
    vi.mocked(useIntegrationCoverageObjectTypesQuery).mockReturnValue({
      data: undefined,
    } as never);

    const { result } = renderHook(() => useCoverageObjectTypes());

    expect({
      calledWith: vi.mocked(useIntegrationCoverageObjectTypesQuery).mock
        .calls[0],
      options: result.current,
    }).toEqual({ calledWith: [portalGraphqlClient], options: [] });
  });

  it('should expose every type with its label, including the types outside the Custom View subset', () => {
    vi.mocked(useIntegrationCoverageObjectTypesQuery).mockReturnValue({
      data: {
        integrationCoverageObjectTypes: [
          'Administrative-Area',
          'Indicator',
          'IPv4-Addr',
          'Autonomous-System',
        ],
      },
    } as never);

    const { result } = renderHook(() => useCoverageObjectTypes());

    expect(result.current.map(({ id }) => id)).toEqual([
      'Administrative-Area',
      'Indicator',
      'IPv4-Addr',
      'Autonomous-System',
    ]);
    expect(result.current[0]).toEqual({
      id: 'Administrative-Area',
      name: 'Area',
    });
  });
});
