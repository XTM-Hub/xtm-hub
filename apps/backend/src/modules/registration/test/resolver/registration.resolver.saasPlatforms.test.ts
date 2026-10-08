import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import {
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
} from '../../../../../tests/tests.const';
import {
  OrderingMode,
  QuerySaasPlatformsArgs,
  RegisteredPlatformConnection,
  RegisteredPlatformOrdering,
} from '../../../../__generated__/resolvers-types';
import { RegistrationApp } from '../../registration.app';
import registrationResolver from '../../registration.resolver';

describe('query.saasPlatforms', () => {
  it('should pass the pagination args directly to registrationApp and return its connection', async () => {
    // Given
    const args: QuerySaasPlatformsArgs = {
      first: 10,
      after: btoa('10'),
      orderBy: RegisteredPlatformOrdering.LastConnectivityCheck,
      orderMode: OrderingMode.Desc,
    };
    const connection = {
      totalCount: 11,
      edges: [
        {
          cursor: btoa('11'),
          node: { id: uuidv4(), title: 'SaaS OpenCTI platform' },
        },
      ],
      pageInfo: {
        startCursor: btoa('11'),
        endCursor: btoa('11'),
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
    vi.spyOn(RegistrationApp, 'loadSaasPlatforms').mockResolvedValue(
      connection as unknown as RegisteredPlatformConnection
    );

    // When
    const result = await registrationResolver.Query!.saasPlatforms!(
      {},
      args,
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(RegistrationApp.loadSaasPlatforms).toHaveBeenCalledWith(args);
    expect(result).toEqual(connection);
  });
});
